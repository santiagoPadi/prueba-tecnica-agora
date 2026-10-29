import { recommendActions } from './domain/actions';
import { assessCertainty } from './domain/certainty';
import { addDays, formatDayLong, isValidISODate, maxDate } from './domain/dates';
import { levelFor } from './domain/certainty';
import { round2 } from './domain/money';
import { simulate, commitmentScenarios, type SimulationResult } from './domain/forecast';
import { formatCOP } from './domain/money';
import { assessOperatingRhythm } from './domain/operating';
import { assessReceivable } from './domain/receivables';
import { RULES, RULES_VERSION } from './domain/rules';
import { SCENARIOS, type CertaintyAssessment, type CommitmentInput, type ForecastInput, type ForecastResponse, type Hinge, type OutflowSummary, type ReceivableAssessment, type RecommendedAction } from './domain/types';

export interface EngineOptions {
  now?: Date;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Días de pago que solo se cubren si un cobro contado en la plata segura llega a tiempo. */
function findHinges(sim: SimulationResult, receivables: ReceivableAssessment[]): Hinge[] {
  const hinges: Hinge[] = [];
  const seen = new Set<string>();
  for (const day of sim.days) {
    const hasOutflow = day.events.some((e) => e.kind !== 'cobro' && e.scenarios.includes('prudente'));
    if (!hasOutflow || day.balance.prudente < 0) continue;
    for (const r of receivables) {
      const counted = r.countedDate.prudente;
      if (counted === null || counted > day.date || seen.has(r.id)) continue;
      const balanceWithout = day.balance.prudente - r.pendingAmount;
      if (balanceWithout < 0) {
        seen.add(r.id);
        hinges.push({ date: day.date, label: formatDayLong(day.date), receivableId: r.id, counterpartyName: r.counterpartyName, amount: r.pendingAmount, countedDate: counted, balanceWith: day.balance.prudente, balanceWithout });
      }
    }
  }
  return hinges;
}

/** «Muro»: los N días consecutivos del horizonte con más salidas (banda prudente). */
function findCriticalWindow(sim: SimulationResult): ForecastResponse['verdict']['criticalWindow'] {
  const n = RULES.criticalWindowDays;
  let best: { start: number; total: number } | null = null;
  for (let i = 0; i + n <= sim.days.length; i += 1) {
    const total = sim.days.slice(i, i + n).reduce((a, d) => a + d.outflows.prudente, 0);
    if (total > 0 && (best === null || total > best.total)) best = { start: i, total };
  }
  if (!best) return null;
  const from = sim.days[best.start]!.date;
  const to = sim.days[best.start + n - 1]!.date;
  return { from, to, label: `del ${formatDayLong(from)} al ${formatDayLong(to)}`, outflows: best.total };
}

function buildVerdict(sim: SimulationResult, receivables: ReceivableAssessment[], horizonDays: number, hasCommitments: boolean, hinges: Hinge[]): ForecastResponse['verdict'] {
  const first = sim.firstGap.prudente;
  const worst = sim.worstGap.prudente;
  const minPrudente = sim.min.prudente;

  let status: ForecastResponse['verdict']['status'];
  if (first) status = 'faltante';
  else status = minPrudente.balance >= RULES.coveredMarginShare * sim.totals.outflows.prudente ? 'cubierto' : 'ajustado';

  let headline: string;
  let detail: string;
  if (first) {
    headline = first.triggers.length > 0
      ? `El ${first.label} te faltan ${formatCOP(first.amount)} para ${first.phrase}.`
      : `El ${first.label} te quedas sin plata: faltan ${formatCOP(first.amount)}.`;

    const day = sim.days.find((d) => d.date === first.date);
    const probableBalance = day?.balance.probable ?? 0;
    const differentiators = receivables
      .filter((r) => r.countedDate.probable !== null && r.countedDate.probable <= first.date && !(r.countedDate.prudente !== null && r.countedDate.prudente <= first.date))
      .map((r) => r.counterpartyName);
    if (probableBalance >= 0) {
      detail = differentiators.length > 0
        ? `Si ${joinNames(differentiators)} te paga${differentiators.length > 1 ? 'n' : ''} a tiempo, ese día quedas con ${formatCOP(probableBalance)}.`
        : `Con tu ritmo probable de ventas ese día quedas con ${formatCOP(probableBalance)}.`;
    } else {
      detail = `Ni con los cobros probables alcanza ese día: faltarían ${formatCOP(-probableBalance)}.`;
    }
    for (const hinge of hinges.slice(0, 2)) {
      detail += ` El ${hinge.label} alcanza solo si ${hinge.counterpartyName} paga a tiempo; sin ese cobro te faltarían ${formatCOP(-hinge.balanceWithout)}.`;
    }
    if (worst && worst.date !== first.date) {
      detail += ` Entre hoy y el ${worst.label} el hueco puede llegar a ${formatCOP(worst.amount)} si no entra más plata.`;
    }
  } else if (status === 'ajustado') {
    headline = `Con la plata segura alcanzas, pero muy justo: el ${formatDayLong(minPrudente.date)} te quedan solo ${formatCOP(minPrudente.balance)}.`;
    detail = 'Cualquier gasto extra o cobro que se demore te deja en rojo. Vale la pena asegurar los cobros de esta semana.';
  } else {
    headline = `Con la plata segura cubres todos tus pagos de los próximos ${horizonDays} días.`;
    detail = `Tu punto más bajo es el ${formatDayLong(minPrudente.date)}, con ${formatCOP(minPrudente.balance)}.`;
  }
  if (!first) {
    for (const hinge of hinges.slice(0, 2)) {
      detail += ` El ${hinge.label} alcanza solo si ${hinge.counterpartyName} paga a tiempo; sin ese cobro te faltarían ${formatCOP(-hinge.balanceWithout)}.`;
    }
  }
  if (!hasCommitments) {
    detail += ' Ojo: no tienes pagos fijos anotados (ayudantes, arriendo…); agrégalos para que el pronóstico no te engañe.';
  }

  const criticalWindow = findCriticalWindow(sim);

  return {
    status,
    headline,
    detail,
    firstGap: first,
    worstGap: worst,
    criticalWindow,
    hinges,
    endOfHorizon: sim.end,
    totalInflows: sim.totals.inflows,
    totalOutflows: sim.totals.outflows,
    receivablesNominal: sim.totals.receivablesNominal,
  };
}

/**
 * Para una acción que confirma un dato, calcula la certeza que quedaría si se confirma:
 * se devuelve la penalización que ese dato aporta hoy (proporcional cuando el factor agrupa varios).
 */
function withCertaintyAfter(
  action: RecommendedAction,
  certainty: CertaintyAssessment,
  receivables: ReceivableAssessment[],
  commitments: CommitmentInput[],
  totalOutflows: number,
): RecommendedAction {
  let gain = 0;
  if (action.type === 'confirmar-saldo') {
    gain = certainty.factors.find((f) => f.code === 'descuadre')?.penalty ?? 0;
  } else if (action.type === 'confirmar-fecha') {
    const factor = certainty.factors.find((f) => f.code === 'clientes-con-poco-historial');
    const shortHistory = receivables.filter((r) => r.bucket === 'historial-corto');
    const total = shortHistory.reduce((a, r) => a + r.pendingAmount, 0);
    const mine = shortHistory.find((r) => r.id === action.refId)?.pendingAmount ?? 0;
    gain = factor && total > 0 ? factor.penalty * (mine / total) : 0;
  } else if (action.type === 'confirmar-compromiso') {
    const factor = certainty.factors.find((f) => f.code === 'compromisos-sin-confirmar');
    const unconfirmed = commitments.filter((c) => !c.confirmed);
    const total = unconfirmed.reduce((a, c) => a + c.amount, 0);
    const mine = unconfirmed.find((c) => c.id === action.refId)?.amount ?? 0;
    gain = factor && total > 0 && totalOutflows > 0 ? factor.penalty * (mine / total) : 0;
  } else {
    return action;
  }
  const score = round2(Math.min(1, certainty.score + gain));
  const level = levelFor(score);
  const effect = level !== certainty.level ? `${action.effect} Con ese dato la certeza pasa de ${certainty.level} a ${level}.` : action.effect;
  return { ...action, effect, certaintyAfter: { score, level } };
}

/** Punto de entrada del motor: determinista, sin IA, auditable por `rulesVersion`. */
export function buildForecast(input: ForecastInput, options: EngineOptions = {}): ForecastResponse {
  const horizonDays = input.horizonDays ?? RULES.horizonDaysDefault;
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > RULES.maxHorizonDays) {
    throw new Error(`horizonDays debe ser un entero entre 1 y ${RULES.maxHorizonDays}`);
  }
  if (!isValidISODate(input.asOf)) throw new Error(`asOf inválido: ${String(input.asOf)}`);

  const asOf = input.asOf;
  const horizonEnd = addDays(asOf, horizonDays - 1);
  const storedLedgerBalance = Math.round(input.pockets.reduce((a, p) => a + p.storedLedgerBalance, 0));
  const projectedBalance = Math.round(input.pockets.reduce((a, p) => a + p.projectedBalance, 0));
  const alignmentDelta = storedLedgerBalance - projectedBalance;

  const opening = {
    prudente: Math.min(storedLedgerBalance, projectedBalance),
    probable: projectedBalance,
    favorable: Math.max(storedLedgerBalance, projectedBalance),
  };
  const basis = {
    prudente: projectedBalance <= storedLedgerBalance ? 'projectedBalance' : 'storedLedgerBalance',
    probable: 'projectedBalance',
    favorable: storedLedgerBalance >= projectedBalance ? 'storedLedgerBalance' : 'projectedBalance',
  } as const;

  const receivables = input.receivables.map((r) => assessReceivable(r, { asOf, horizonEnd }));
  const operatingRhythm = assessOperatingRhythm(input.operatingRhythm, asOf, horizonDays);
  const sim = simulate({
    asOf,
    horizonDays,
    opening,
    operatingNetByDay: operatingRhythm.days.map((d) => d.net),
    receivables,
    payables: input.payables,
    commitments: input.commitments,
  });
  const certainty = assessCertainty({
    asOf,
    horizonEnd,
    operating: operatingRhythm,
    projectedBalance,
    alignmentDelta,
    receivables,
    commitments: input.commitments,
    totalOutflows: sim.totals.outflows.prudente,
  });
  const hinges = findHinges(sim, receivables);
  const actions = recommendActions({
    asOf,
    horizonDays,
    horizonEnd,
    receivables,
    payables: input.payables,
    commitments: input.commitments,
    sim,
    alignmentDelta,
    hinges,
  });
  const verdict = buildVerdict(sim, receivables, horizonDays, input.commitments.length > 0, hinges);
  const actionsWithCertainty = actions.map((a) => withCertaintyAfter(a, certainty, receivables, input.commitments, sim.totals.outflows.prudente));

  const outflows: OutflowSummary[] = [
    ...input.payables
      .filter((p) => maxDate(p.dueDate, asOf) <= horizonEnd)
      .map<OutflowSummary>((p) => ({ id: p.id, kind: 'pago-proveedor', label: p.counterpartyName, amount: p.amount, dueDate: p.dueDate, source: 'registrado', confirmed: true, scenarios: [...SCENARIOS] })),
    ...input.commitments
      .filter((c) => maxDate(c.dueDate, asOf) <= horizonEnd)
      .map<OutflowSummary>((c) => ({ id: c.id, kind: 'compromiso', label: c.label, amount: c.amount, dueDate: c.dueDate, source: c.source, confirmed: c.confirmed, scenarios: commitmentScenarios(c) })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const deltaNote = alignmentDelta === 0
    ? 'Tu saldo guardado y tus movimientos cuadran.'
    : alignmentDelta > 0
      ? `Partimos de ${formatCOP(projectedBalance)} (lo que explican tus movimientos). Los ${formatCOP(alignmentDelta)} de diferencia con tu saldo guardado no se pierden: aparecen como plata por confirmar y solo entran en el escenario favorable hasta que confirmes cuánto tienes en la mano.`
      : `Tus movimientos suman ${formatCOP(-alignmentDelta)} más que tu saldo guardado. Partimos del saldo más bajo (${formatCOP(opening.prudente)}) hasta que confirmes cuánto tienes en la mano.`;

  const topActions = actionsWithCertainty.slice(0, RULES.maxMobileActions).map((a) => a.title);
  const pendingData = certainty.factors.filter((f) => f.code !== 'registro-parcial').length;

  return {
    storeId: input.storeId,
    asOf,
    horizonDays,
    horizonStart: sim.horizonStart,
    horizonEnd: sim.horizonEnd,
    currency: input.currency ?? 'COP',
    timeZone: input.timeZone ?? 'America/Bogota',
    rulesVersion: RULES_VERSION,
    computedAt: (options.now ?? new Date()).toISOString(),
    openingBalance: {
      storedLedgerBalance,
      projectedBalance,
      alignmentDelta,
      basis,
      opening,
      pockets: input.pockets.map((p) => ({ ...p })),
      note: deltaNote,
    },
    verdict,
    certainty,
    operatingRhythm,
    receivables,
    outflows,
    days: sim.days,
    actions: actionsWithCertainty,
    mobile: {
      headline: verdict.headline,
      certainty: pendingData > 0 ? `${certainty.label}: ${pendingData} dato${pendingData > 1 ? 's' : ''} por confirmar` : certainty.label,
      actions: topActions,
    },
  };
}
