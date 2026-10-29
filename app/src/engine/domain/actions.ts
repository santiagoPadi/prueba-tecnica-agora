import { addDays, diffDays, formatDayLong, maxDate, type ISODate } from './dates';
import { clamp, formatCOP, round2 } from './money';
import { RULES } from './rules';
import { gapOnOrAfter, type SimulationResult } from './forecast';
import type { ActionType, CommitmentInput, GapPoint, Hinge, PayableInput, ReceivableAssessment, RecommendedAction, ScenarioKey } from './types';

export interface ActionContext {
  asOf: ISODate;
  horizonDays: number;
  horizonEnd: ISODate;
  receivables: ReceivableAssessment[];
  payables: PayableInput[];
  commitments: CommitmentInput[];
  sim: SimulationResult;
  alignmentDelta: number;
  hinges: Hinge[];
}

interface Candidate {
  type: ActionType;
  counterpartyName: string | null;
  refId: string | null;
  recoverable: number;        // plata que la acción puede traer o liberar dentro del horizonte
  displayAmount: number;      // monto que se muestra en la tarjeta
  probability: number;
  deadline: ISODate;
  targetGap: { date: ISODate; amount: number } | null; // hueco que ataca (por defecto, el primero)
  title: string;
  why: string;
  effect: string;
  channel: 'whatsapp' | 'app';
  deepLink: string;
  whatsappDraft: string | null;
}

function effectForCounted(r: ReceivableAssessment, hinges: Hinge[]): string {
  const hinge = hinges.find((h) => h.receivableId === r.id);
  if (hinge) return `Ya está contado en tu plata segura: sin este cobro el ${hinge.label} te faltarían ${formatCOP(-hinge.balanceWithout)}.`;
  return 'Ya está contado en tu plata segura; confirmarlo evita sorpresas.';
}

function effectOnGap(recoverable: number, gap: GapPoint | null, condition = ''): string {
  if (!gap) return 'Refuerza la plata disponible de los próximos días.';
  const cond = condition ? `${condition}, ` : '';
  if (recoverable >= gap.amount) {
    const trigger = gap.triggers.length > 0 ? ` (${gap.triggers.join(' y ')})` : '';
    return `${cond ? cond[0]!.toUpperCase() + cond.slice(1) : ''}cubre el faltante de ${formatCOP(gap.amount)} del ${gap.label}${trigger}.`;
  }
  return `${cond ? cond[0]!.toUpperCase() + cond.slice(1) : ''}reduce el faltante del ${gap.label} de ${formatCOP(gap.amount)} a ${formatCOP(gap.amount - recoverable)}.`;
}

/**
 * Punto 1d: ranking auditable = cuánto del próximo hueco cubre × probabilidad de
 * éxito × urgencia, con un desempate pequeño por amplitud (cuánto del hueco máximo
 * ataca). Todos los factores se devuelven en la respuesta.
 */
export function recommendActions(ctx: ActionContext): RecommendedAction[] {
  const firstGap = ctx.sim.firstGap.prudente;
  const maxHole = Math.max(0, -ctx.sim.min.prudente.balance);
  const totalOut = ctx.sim.totals.outflows.prudente;

  const balanceOn = (date: ISODate, s: ScenarioKey): number => ctx.sim.days.find((d) => d.date === date)?.balance[s] ?? 0;
  const gapOn = (date: ISODate, s: ScenarioKey): number => Math.max(0, -balanceOn(date, s));
  const urgency = (deadline: ISODate): number => clamp(1 - Math.max(0, diffDays(ctx.asOf, deadline)) / ctx.horizonDays, RULES.actionUrgencyFloor, 1);
  const gapCovered = (recoverable: number, gapAmount: number): number =>
    gapAmount > 0 ? Math.min(1, recoverable / gapAmount) : totalOut > 0 ? Math.min(1, recoverable / totalOut) : 0;
  const breadth = (recoverable: number): number => (maxHole > 0 ? Math.min(1, recoverable / maxHole) : 0);
  const deadlineFor = (due: ISODate): ISODate => maxDate(due, ctx.asOf);
  /** El hueco que ese dinero puede atacar: el primero en o después de la fecha en que puede entrar. */
  const gapFor = (from: ISODate): GapPoint | null => gapOnOrAfter(ctx.sim, maxDate(from, ctx.asOf));

  const candidates: Candidate[] = [];

  for (const c of ctx.commitments) {
    if (c.confirmed || maxDate(c.dueDate, ctx.asOf) > ctx.horizonEnd) continue;
    candidates.push({
      type: 'confirmar-compromiso',
      counterpartyName: null,
      refId: c.id,
      recoverable: c.amount,
      displayAmount: c.amount,
      probability: 1,
      deadline: ctx.asOf,
      targetGap: null,
      title: `Confirmar: ¿${c.label} por ${formatCOP(c.amount)} el ${formatDayLong(c.dueDate)}?`,
      why: c.source === 'sugerido-por-patron'
        ? 'Lo detectamos en tus movimientos de meses anteriores, pero no está confirmado. Mientras tanto el pronóstico lo descuenta en la plata segura y en la probable.'
        : 'Lo anotaste pero falta confirmarlo. Mientras tanto el pronóstico lo descuenta en la plata segura y en la probable.',
      effect: `Confirmarlo o descartarlo mueve el pronóstico en ${formatCOP(c.amount)} el ${formatDayLong(c.dueDate)}.`,
      channel: 'app',
      deepLink: `necta://compromisos/${c.id}/confirmar`,
      whatsappDraft: null,
    });
  }

  for (const r of ctx.receivables) {
    const name = r.counterpartyName;
    const pending = formatCOP(r.pendingAmount);
    switch (r.bucket) {
      case 'vencida-mas-de-lo-habitual': {
        const partial = Math.round(r.pendingAmount * RULES.partialPaymentShare);
        candidates.push({
          type: 'abono-parcial',
          counterpartyName: name,
          refId: r.id,
          recoverable: partial,
          displayAmount: partial,
          probability: RULES.pPartialWhenBeyondTypical,
          deadline: ctx.asOf,
          targetGap: null,
          title: `Pedirle hoy un abono a ${name}: al menos ${formatCOP(partial)}`,
          why: `Te debe ${pending} desde hace ${r.daysOverdue} días, más de lo que suele atrasarse. Un abono parcial hoy es más fácil de lograr que el pago completo.`,
          effect: effectOnGap(partial, gapFor(ctx.asOf), 'si abona hoy'),
          channel: 'whatsapp',
          deepLink: `necta://cobros/${r.id}?accion=abono-parcial`,
          whatsappDraft: `Hola, ${name}. Les escribo por la factura de ${pending} que venció hace ${r.daysOverdue} días. Entiendo que a veces se complica; ¿podrían hacerme un abono de ${formatCOP(partial)} esta semana y acordamos el resto? Me ayudaría mucho para cumplir con mis proveedores. ¡Gracias!`,
        });
        break;
      }
      case 'vencida-dentro-de-lo-habitual': {
        candidates.push({
          type: 'cobrar',
          counterpartyName: name,
          refId: r.id,
          recoverable: r.pendingAmount,
          displayAmount: r.pendingAmount,
          probability: r.probabilityInHorizon,
          deadline: ctx.asOf,
          targetGap: null,
          title: `Recordarle hoy a ${name} el pago de ${pending}`,
          why: r.explanation,
          effect: effectOnGap(r.pendingAmount, gapFor(ctx.asOf), 'si paga esta semana'),
          channel: 'whatsapp',
          deepLink: `necta://cobros/${r.id}?accion=cobrar`,
          whatsappDraft: `Hola, ${name}. Les recuerdo la factura de ${pending} que venció el ${formatDayLong(r.creditDueBy)}. ¿Me confirman para cuándo pueden hacer el pago? Gracias por su apoyo.`,
        });
        break;
      }
      case 'historial-corto': {
        const deadline = deadlineFor(r.creditDueBy);
        candidates.push({
          type: 'confirmar-fecha',
          counterpartyName: name,
          refId: r.id,
          recoverable: r.pendingAmount,
          displayAmount: r.pendingAmount,
          probability: r.probabilityInHorizon,
          deadline,
          targetGap: null,
          title: `Confirmar con ${name} cuándo pagará los ${pending}`,
          why: r.explanation,
          effect: effectOnGap(r.pendingAmount, gapFor(r.creditDueBy), 'si paga a tiempo'),
          channel: 'whatsapp',
          deepLink: `necta://cobros/${r.id}?accion=confirmar-fecha`,
          whatsappDraft: `Hola, ${name}. Un gusto trabajar con ustedes. Les escribo por la factura de ${pending} que vence el ${formatDayLong(r.creditDueBy)}. ¿Me confirman la fecha en que harán el pago, para organizar mi semana? ¡Gracias!`,
        });
        break;
      }
      case 'confiable':
      case 'irregular': {
        const deadline = deadlineFor(r.creditDueBy);
        const counted = r.countedDate.prudente !== null;
        candidates.push({
          type: 'cobrar',
          counterpartyName: name,
          refId: r.id,
          recoverable: r.pendingAmount,
          displayAmount: r.pendingAmount,
          probability: r.probabilityInHorizon,
          deadline,
          targetGap: null,
          title: r.bucket === 'confiable'
            ? `Recordarle a ${name} el pago de ${pending} del ${formatDayLong(r.creditDueBy)}`
            : `Cobrarle a ${name} ${pending} antes del ${formatDayLong(deadline)}`,
          why: r.explanation,
          effect: counted ? effectForCounted(r, ctx.hinges) : effectOnGap(r.pendingAmount, gapFor(r.creditDueBy), 'si paga a tiempo'),
          channel: 'whatsapp',
          deepLink: `necta://cobros/${r.id}?accion=cobrar`,
          whatsappDraft: r.bucket === 'confiable'
            ? `Hola, ${name}. Gracias por pagar siempre a tiempo. Les recuerdo la factura de ${pending} que vence el ${formatDayLong(r.creditDueBy)}; les comparto los datos de pago para que sea más fácil. ¡Gracias!`
            : `Hola, ${name}. ¿Cómo van? Les escribo por la factura de ${pending} que vence el ${formatDayLong(r.creditDueBy)}. ¿Me confirman si pueden pagarla ese día? Les comparto los datos de pago para que sea más fácil. ¡Gracias!`,
        });
        break;
      }
      default:
        break;
    }
  }

  for (const p of ctx.payables) {
    const date = maxDate(p.dueDate, ctx.asOf);
    if (date > ctx.horizonEnd) continue;
    const gap = gapOn(date, 'probable');
    if (gap <= 0) continue;
    const recoverable = Math.min(p.amount, gap);
    const deadline = maxDate(ctx.asOf, addDays(date, -2));
    candidates.push({
      type: 'renegociar-pago',
      counterpartyName: p.counterpartyName,
      refId: p.id,
      recoverable,
      displayAmount: p.amount,
      probability: RULES.renegotiateSuccessProbability,
      deadline,
      targetGap: { date, amount: gap },
      title: `Hablar con ${p.counterpartyName} para mover una parte del pago del ${formatDayLong(date)}`,
      why: `Ese día, incluso si llegan los cobros probables, te faltan ${formatCOP(gap)} para los ${formatCOP(p.amount)} que vencen.`,
      effect: p.amount >= gap
        ? `Mover al menos ${formatCOP(gap)} de los ${formatCOP(p.amount)} evita quedar en rojo ese día. Conviene acordarlo antes del ${formatDayLong(deadline)}, no el mismo día del pago.`
        : `Mover todo el pago baja el faltante de ese día de ${formatCOP(gap)} a ${formatCOP(gap - p.amount)}; no lo cierra solo, combínalo con los cobros. Conviene acordarlo antes del ${formatDayLong(deadline)}.`,
      channel: 'whatsapp',
      deepLink: `necta://pagos/${p.id}?accion=renegociar`,
      whatsappDraft: `Hola, ${p.counterpartyName}. Les escribo por el pago de ${formatCOP(p.amount)} del ${formatDayLong(date)}. Esta semana tengo varios cobros en camino; ¿sería posible pagar una parte ese día y el resto una semana después? Me ayudaría mucho y seguimos cumpliendo como siempre. ¡Gracias por entender!`,
    });
  }

  // «Pedir plazo por si acaso»: un día de pago que solo se cubre si un cobro concreto llega a tiempo.
  for (const hinge of ctx.hinges) {
    const day = ctx.sim.days.find((d) => d.date === hinge.date);
    const payableEvent = day?.events.filter((e) => e.kind === 'pago-proveedor').sort((a, b) => b.amount - a.amount)[0];
    if (!payableEvent) continue;
    const payable = ctx.payables.find((p) => p.id === payableEvent.refId);
    if (!payable) continue;
    const deficit = -hinge.balanceWithout;
    const deadline = maxDate(ctx.asOf, addDays(hinge.date, -1));
    candidates.push({
      type: 'pedir-plazo',
      counterpartyName: payable.counterpartyName,
      refId: payable.id,
      recoverable: deficit,
      displayAmount: payable.amount,
      probability: RULES.askExtensionSuccessProbability,
      deadline,
      targetGap: { date: hinge.date, amount: deficit },
      title: `Pedirle plazo a ${payable.counterpartyName} por si ${hinge.counterpartyName} no paga el ${formatDayLong(hinge.countedDate)}`,
      why: `El ${hinge.label} alcanza solo si ${hinge.counterpartyName} paga a tiempo; sin ese cobro te faltarían ${formatCOP(deficit)} para los ${formatCOP(payable.amount)} que vencen. Pedir el plazo antes, no el mismo día, cuesta poco y evita quedar mal.`,
      effect: `Si el cobro llega, no usas el plazo; si no llega, ya está acordado antes del ${formatDayLong(hinge.date)}.`,
      channel: 'whatsapp',
      deepLink: `necta://pagos/${payable.id}?accion=pedir-plazo`,
      whatsappDraft: `Hola, ${payable.counterpartyName}. Les escribo por el pago de ${formatCOP(payable.amount)} del ${formatDayLong(hinge.date)}. Estoy a la espera de un cobro grande el ${formatDayLong(hinge.countedDate)}; si llegara a atrasarse, ¿podríamos pagar una parte ese día y el resto la semana siguiente? Prefiero avisarles con tiempo. ¡Gracias!`,
    });
  }

  if (ctx.alignmentDelta !== 0) {
    const delta = ctx.alignmentDelta;
    const recoverable = Math.max(0, delta);
    candidates.push({
      type: 'confirmar-saldo',
      counterpartyName: null,
      refId: null,
      recoverable,
      displayAmount: Math.abs(delta),
      probability: RULES.confirmBalanceSuccessProbability,
      deadline: ctx.asOf,
      targetGap: null,
      title: 'Confirmar cuánto tienes hoy en Caja y Banco',
      why: delta > 0
        ? `Tu saldo guardado tiene ${formatCOP(delta)} más de lo que explican los movimientos anotados. Si esa plata está, cuenta; si no, mejor saberlo hoy.`
        : `Tus movimientos anotados suman ${formatCOP(-delta)} más que tu saldo guardado: algo quedó sin anotar o el saldo cambió.`,
      effect: delta > 0 && firstGap
        ? (recoverable >= firstGap.amount
          ? `Si esa plata está en caja, cubres el faltante de ${formatCOP(firstGap.amount)} del ${firstGap.label}.`
          : `Si esa plata está en caja, el faltante del ${firstGap.label} baja de ${formatCOP(firstGap.amount)} a ${formatCOP(firstGap.amount - recoverable)}.`)
        : 'Ajusta el punto de partida del pronóstico sin cambiar tus movimientos.',
      channel: 'app',
      deepLink: 'necta://cuentas/confirmar-saldo',
      whatsappDraft: null,
    });
  }

  const scored = candidates
    .map((c) => {
      const gapAmount = c.targetGap ? c.targetGap.amount : firstGap?.amount ?? 0;
      const factors = {
        gapCovered: round2(gapCovered(c.recoverable, gapAmount)),
        probability: round2(c.probability),
        urgency: round2(urgency(c.deadline)),
        breadth: round2(breadth(c.recoverable)),
      };
      const score = Math.max(0.01, round2(factors.gapCovered * factors.probability * factors.urgency + RULES.actionBreadthWeight * factors.breadth));
      return { c, score, factors };
    })
    .sort((a, b) => b.score - a.score || a.c.deadline.localeCompare(b.c.deadline) || b.c.recoverable - a.c.recoverable);

  return scored.map(({ c, score, factors }, index) => ({
    rank: index + 1,
    type: c.type,
    title: c.title,
    why: c.why,
    effect: c.effect,
    counterpartyName: c.counterpartyName,
    refId: c.refId,
    amount: c.displayAmount,
    deadline: c.deadline,
    deadlineLabel: formatDayLong(c.deadline),
    channel: c.channel,
    deepLink: c.deepLink,
    whatsappDraft: c.whatsappDraft,
    score,
    factors,
    certaintyAfter: null,
  }));
}
