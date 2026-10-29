import { addDays, diffDays, formatDayShort, maxDate, minDate, type ISODate } from './dates';
import { clamp, formatCOP, round2 } from './money';
import { RULES } from './rules';
import { SCENARIOS, scenarioValues, type CommunitySignal, type ReceivableAssessment, type ReceivableInput, type ScenarioKey } from './types';

export interface ReceivableContext {
  asOf: ISODate;
  horizonEnd: ISODate;
}

interface ResolvedCommunity {
  used: boolean;
  reason: 'sin-senal' | 'entidad-ambigua' | 'menos-de-k-comercios' | 'k-anonimato-ok';
  avgDaysLate?: number;
  onTimeRate?: number;
}

/**
 * Punto 5: la señal comunitaria solo se usa como prior interno cuando la entidad
 * está bien resuelta y la reportan al menos K comercios independientes. Nunca
 * sale de aquí un dato de un tercero identificable.
 */
export function resolveCommunitySignal(signal?: CommunitySignal): ResolvedCommunity {
  if (!signal) return { used: false, reason: 'sin-senal' };
  if (signal.entityResolutionConfidence < RULES.communityMinEntityConfidence) return { used: false, reason: 'entidad-ambigua' };
  if (signal.independentMerchants < RULES.communityMinMerchants) return { used: false, reason: 'menos-de-k-comercios' };
  return { used: true, reason: 'k-anonimato-ok', avgDaysLate: signal.avgDaysLate, onTimeRate: signal.onTimeRate };
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function assessReceivable(r: ReceivableInput, ctx: ReceivableContext): ReceivableAssessment {
  const daysOverdue = Math.max(0, diffDays(r.creditDueBy, ctx.asOf));
  const h = r.history;
  const community = resolveCommunitySignal(r.communitySignal);
  const favorableOverdueDate = addDays(ctx.asOf, RULES.overdueFavorableLagDays);

  let bucket: ReceivableAssessment['bucket'];
  let probability: number;
  let expectedDate: ISODate | null = null;
  let expectedWindow: ReceivableAssessment['expectedWindow'] = null;
  let favorableDate: ISODate;
  let explanation: string;

  if (daysOverdue > 0) {
    const typicalLate = h.salesCount > 0 ? h.avgDaysLate : 0;
    if (daysOverdue > typicalLate) {
      bucket = 'vencida-mas-de-lo-habitual';
      probability = RULES.pOverdueBeyondTypical;
      favorableDate = favorableOverdueDate;
      explanation = h.salesCount > 0
        ? `Venció hace ${daysOverdue} días y normalmente se atrasa ${Math.round(typicalLate)}. Ya pasó su atraso habitual: no contamos esta plata hasta que registres un abono. Conviene pedir hoy un abono de al menos ${formatCOP(r.pendingAmount * RULES.partialPaymentShare)}.`
        : `Venció hace ${daysOverdue} días y no hay historial de pago. No contamos esta plata hasta que registres un abono.`;
    } else {
      bucket = 'vencida-dentro-de-lo-habitual';
      probability = RULES.pOverdueWithinTypical;
      expectedDate = maxDate(addDays(ctx.asOf, 1), addDays(r.creditDueBy, Math.ceil(typicalLate)));
      expectedWindow = { from: addDays(ctx.asOf, 1), to: expectedDate };
      favorableDate = minDate(expectedDate, favorableOverdueDate);
      explanation = `Venció hace ${daysOverdue} días; suele atrasarse unos ${Math.round(typicalLate)}. Lo más probable es que pague hacia el ${formatDayShort(expectedDate)}; un recordatorio hoy ayuda.`;
    }
  } else if (h.salesCount < RULES.minHistoryForProfile) {
    bucket = 'historial-corto';
    let lateDays = h.salesCount > 0 ? h.avgDaysLate : 0;
    let base: number = RULES.pShortHistory;
    if (community.used) {
      const w = h.salesCount / (h.salesCount + RULES.communityPriorWeight);
      if (community.avgDaysLate !== undefined) lateDays = w * lateDays + (1 - w) * community.avgDaysLate;
      if (community.onTimeRate !== undefined) base = w * base + (1 - w) * community.onTimeRate;
    }
    expectedDate = addDays(r.creditDueBy, Math.round(lateDays));
    expectedWindow = { from: r.creditDueBy, to: expectedDate };
    probability = expectedDate <= ctx.horizonEnd ? base : base * RULES.outsideHorizonPenalty;
    favorableDate = r.creditDueBy;
    const own = h.salesCount === 0
      ? 'Cliente nuevo: todavía no tiene ventas pagadas contigo.'
      : `Cliente nuevo: solo ${h.salesCount} venta${h.salesCount === 1 ? '' : 's'} previa${h.salesCount === 1 ? '' : 's'} (pagó ${Math.round(h.avgDaysLate)} días tarde).`;
    const blended = community.used && (community.avgDaysLate !== undefined || community.onTimeRate !== undefined);
    let net = '';
    if (community.used && blended) {
      const range = community.avgDaysLate !== undefined
        ? ` En negocios similares de tu zona suele tardar entre ${Math.floor(community.avgDaysLate / 2) * 2} y ${Math.floor(community.avgDaysLate / 2) * 2 + 2} días más de lo pactado;`
        : ' Otros negocios de Necta le venden desde hace tiempo;';
      net = `${range} esa señal agregada ajusta la estimación y no muestra datos de terceros.`;
    } else if (community.used) {
      net = ' Otros negocios de Necta le venden desde hace tiempo (señal agregada sin cifras: no cambia la estimación y no muestra datos de terceros).';
    }
    explanation = `${own} Vence el ${formatDayShort(r.creditDueBy)}; lo prudente es confirmar la fecha antes de contar con esta plata.${net}`;
  } else if (h.onTimeRate >= RULES.reliableOnTimeRate) {
    bucket = 'confiable';
    probability = h.onTimeRate;
    expectedDate = addDays(r.creditDueBy, Math.round(h.avgDaysLate * (1 - h.onTimeRate)));
    expectedWindow = { from: r.creditDueBy, to: addDays(r.creditDueBy, Math.ceil(h.avgDaysLate)) };
    favorableDate = r.creditDueBy;
    explanation = h.onTimeRate >= 0.99 || expectedWindow.from === expectedWindow.to
      ? `Ha pagado a tiempo ${h.onTimeRate >= 0.99 ? `las ${h.salesCount} veces` : 'casi siempre'}. Cuenta con esta plata el ${formatDayShort(r.creditDueBy)}.`
      : `Paga a tiempo el ${pct(h.onTimeRate)} de las veces; cuando se atrasa, son unos ${Math.round(h.avgDaysLate)} días. Cuenta con esta plata entre el ${formatDayShort(expectedWindow.from)} y el ${formatDayShort(expectedWindow.to)}.`;
  } else {
    bucket = 'irregular';
    const typicalDate = addDays(r.creditDueBy, Math.ceil(h.avgDaysLate));
    const halfDate = addDays(r.creditDueBy, Math.ceil(h.avgDaysLate / 2));
    const inside = typicalDate <= ctx.horizonEnd ? 1 : halfDate <= ctx.horizonEnd ? 0.5 : 0;
    probability = h.onTimeRate + (1 - h.onTimeRate) * inside * 0.5;
    expectedDate = typicalDate;
    expectedWindow = { from: r.creditDueBy, to: typicalDate };
    favorableDate = r.creditDueBy;
    explanation = probability >= RULES.pSafeThreshold && typicalDate <= ctx.horizonEnd
      ? `Paga a tiempo el ${pct(h.onTimeRate)} de las veces y, cuando se atrasa, unos ${Math.round(h.avgDaysLate)} días; aun así casi siempre entra dentro de los 14 días. La plata segura la cuenta el ${formatDayShort(typicalDate)}, no el ${formatDayShort(r.creditDueBy)}.`
      : `Paga a tiempo solo el ${pct(h.onTimeRate)} de las veces y se atrasa unos ${Math.round(h.avgDaysLate)} días. Puede demorar: no la contamos como plata segura.`;
  }

  probability = round2(clamp(probability, 0, 0.95));

  const clip = (d: ISODate | null): ISODate | null => (d !== null && d >= ctx.asOf && d <= ctx.horizonEnd ? d : null);
  const countedDate = scenarioValues<ISODate | null>((s: ScenarioKey) => {
    if (s === 'prudente') return probability >= RULES.pSafeThreshold ? clip(expectedWindow?.to ?? expectedDate) : null;
    if (s === 'probable') return probability >= RULES.pProbableThreshold ? clip(expectedDate) : null;
    return clip(favorableDate);
  });

  return {
    id: r.id,
    counterpartyName: r.counterpartyName,
    pendingAmount: r.pendingAmount,
    creditDueBy: r.creditDueBy,
    daysOverdue,
    bucket,
    probabilityInHorizon: probability,
    expectedDate,
    expectedWindow,
    countedDate,
    includedIn: SCENARIOS.filter((s) => countedDate[s] !== null),
    communitySignal: { used: community.used, reason: community.reason },
    explanation,
  };
}
