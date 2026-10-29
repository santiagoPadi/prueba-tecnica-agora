import { maxDate, type ISODate } from './dates';
import { formatCOP, round2 } from './money';
import { RULES } from './rules';
import type { CertaintyAssessment, CertaintyFactor, CertaintyLevel, CommitmentInput, OperatingRhythmAssessment, ReceivableAssessment } from './types';

export interface CertaintyInput {
  asOf: ISODate;
  horizonEnd: ISODate;
  operating: OperatingRhythmAssessment;
  projectedBalance: number;
  alignmentDelta: number;
  receivables: ReceivableAssessment[];
  commitments: CommitmentInput[];
  totalOutflows: number;
}

export function levelFor(score: number): CertaintyLevel {
  return score >= RULES.certaintyAltaMin ? 'alta' : score >= RULES.certaintyMediaMin ? 'media' : 'baja';
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * Punto 1d: la certeza sale de señales observables (no de la opinión de un modelo):
 * días sin registro, descuadre de saldo, plata esperada de clientes con poco historial
 * y compromisos sin confirmar. Cada factor se muestra con su peso.
 */
export function assessCertainty(input: CertaintyInput): CertaintyAssessment {
  const factors: CertaintyFactor[] = [];
  const { operating } = input;

  const coveragePenalty = round2((1 - operating.recordedShare) * RULES.certaintyCoverageWeight);
  if (coveragePenalty > 0) {
    factors.push({
      code: 'registro-parcial',
      label: `Registras en Necta cerca del ${Math.round(operating.recordedShare * 100)}% de lo que vendes y gastas: el ritmo diario es estimado, no observado`,
      penalty: coveragePenalty,
    });
  }

  if (input.alignmentDelta !== 0) {
    const base = Math.max(Math.abs(input.projectedBalance), 1);
    factors.push({
      code: 'descuadre',
      label: `Hay ${formatCOP(Math.abs(input.alignmentDelta))} que no cuadran entre tu saldo guardado y tus movimientos`,
      penalty: round2(Math.min(RULES.certaintyDeltaCap, Math.abs(input.alignmentDelta) / base)),
    });
  }

  const nominal = input.receivables.reduce((a, r) => a + r.pendingAmount, 0);
  const shortHistory = input.receivables.filter((r) => r.bucket === 'historial-corto');
  const shortAmount = shortHistory.reduce((a, r) => a + r.pendingAmount, 0);
  if (shortAmount > 0 && nominal > 0) {
    const plural = shortHistory.length > 1;
    factors.push({
      code: 'clientes-con-poco-historial',
      label: `${joinNames(shortHistory.map((r) => r.counterpartyName))} ${plural ? 'son clientes' : 'es cliente'} con poco historial: ${formatCOP(shortAmount)} por confirmar`,
      penalty: round2((shortAmount / nominal) * RULES.certaintyShortHistoryWeight),
    });
  }

  if (input.commitments.length === 0) {
    factors.push({
      code: 'sin-compromisos-capturados',
      label: 'No tienes pagos fijos anotados (ayudantes, arriendo…): el pronóstico puede verse mejor de lo que es',
      penalty: RULES.certaintyNoCommitmentsPenalty,
    });
  }

  const unconfirmed = input.commitments.filter((c) => !c.confirmed && maxDate(c.dueDate, input.asOf) <= input.horizonEnd);
  const unconfirmedAmount = unconfirmed.reduce((a, c) => a + c.amount, 0);
  if (unconfirmedAmount > 0 && input.totalOutflows > 0) {
    factors.push({
      code: 'compromisos-sin-confirmar',
      label: `Hay ${unconfirmed.length} compromiso${unconfirmed.length > 1 ? 's' : ''} sin confirmar por ${formatCOP(unconfirmedAmount)}`,
      penalty: round2((unconfirmedAmount / input.totalOutflows) * RULES.certaintyUnconfirmedWeight),
    });
  }

  const score = round2(Math.max(0, 1 - factors.reduce((a, f) => a + f.penalty, 0)));
  const level = levelFor(score);

  // Qué pasaría si Carmen confirma hoy lo confirmable (el registro parcial no se arregla en un toque).
  const confirmable = factors.filter((f) => f.code !== 'registro-parcial');
  let ifConfirmed: CertaintyAssessment['ifConfirmed'] = null;
  if (confirmable.length > 0) {
    const scoreAfter = round2(Math.min(1, score + confirmable.reduce((a, f) => a + f.penalty, 0)));
    const levelAfter = levelFor(scoreAfter);
    const parts: string[] = [];
    if (confirmable.some((f) => f.code === 'descuadre')) parts.push('cuánto tienes en caja');
    if (confirmable.some((f) => f.code === 'clientes-con-poco-historial')) parts.push(`la fecha de pago de ${joinNames(shortHistory.map((r) => r.counterpartyName))}`);
    if (confirmable.some((f) => f.code === 'compromisos-sin-confirmar')) parts.push('los compromisos pendientes');
    if (confirmable.some((f) => f.code === 'sin-compromisos-capturados')) parts.push('tus pagos fijos');
    const note = levelAfter !== level
      ? `Si confirmas ${joinNames(parts)}, la certeza sube a ${levelAfter}.`
      : `Confirmar ${joinNames(parts)} mejora la certeza, aunque sigue ${levelAfter} mientras registres solo una parte de tus movimientos.`;
    ifConfirmed = { score: scoreAfter, level: levelAfter, note };
  }

  return { level, label: `Certeza ${level}`, score, factors, ifConfirmed };
}
