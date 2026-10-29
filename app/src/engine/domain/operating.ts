import { addDays, parseISODate, type ISODate } from './dates';
import { clamp, formatCOP } from './money';
import { RULES } from './rules';
import type { OperatingDay, OperatingRhythmAssessment, OperatingRhythmInput, WeekdayKey } from './types';

const WEEKDAYS: readonly WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_ES: Record<WeekdayKey, string> = { mon: 'lunes', tue: 'martes', wed: 'miércoles', thu: 'jueves', fri: 'viernes', sat: 'sábado', sun: 'domingo' };

/** Semana (lunes a domingo) que contiene el 15 o el 30: semana de quincena. */
export function isQuincenaWeek(date: ISODate): boolean {
  const dow = parseISODate(date).getUTCDay();
  const monday = addDays(date, -((dow + 6) % 7));
  for (let i = 0; i < 7; i += 1) {
    const dayOfMonth = parseISODate(addDays(monday, i)).getUTCDate();
    if (dayOfMonth === 15 || dayOfMonth === 30) return true;
  }
  return false;
}

/**
 * Ritmo operativo día a día (Punto 1b). Las cifras típicas por día de la semana vienen de lo que
 * la dueña cuenta (Necta solo ve el 20–30 % de sus movimientos), así que:
 *  - probable y favorable usan el patrón tal cual, con la subida de quincena cuando toca;
 *  - prudente cuenta solo el 80 % de las ventas y no cuenta la subida de quincena hasta que se dé;
 *  - los gastos de contado se descuentan completos cada día abierto;
 *  - la fracción registrada no recorta la banda: penaliza la certeza (no es evidencia observada).
 */
export function assessOperatingRhythm(input: OperatingRhythmInput, asOf: ISODate, horizonDays: number): OperatingRhythmAssessment {
  const boost = clamp(input.quincenaBoost ?? RULES.quincenaBoostDefault, 0, 1);
  const recordedShare = clamp(input.recordedShare, 0, 1);
  const days: OperatingDay[] = [];
  const totals = { prudente: 0, probable: 0, favorable: 0 };

  for (let i = 0; i < horizonDays; i += 1) {
    const date = addDays(asOf, i);
    const weekday = WEEKDAYS[parseISODate(date).getUTCDay()] as WeekdayKey;
    const base = Math.max(0, input.cashSalesByWeekday[weekday] ?? 0);
    const open = base > 0;
    const quincenaWeek = isQuincenaWeek(date);
    const probableSales = Math.round(base * (quincenaWeek ? 1 + boost : 1));
    const prudentSales = Math.round(base * RULES.prudentSalesFactor);
    const expenses = open ? Math.max(0, input.pettyExpensesPerOpenDay) : 0;
    const net = { prudente: prudentSales - expenses, probable: probableSales - expenses, favorable: probableSales - expenses };
    days.push({ date, weekday, open, quincenaWeek, cashSales: { prudente: prudentSales, probable: probableSales, favorable: probableSales }, expenses, net });
    totals.prudente += net.prudente;
    totals.probable += net.probable;
    totals.favorable += net.favorable;
  }

  const closed = (Object.keys(input.cashSalesByWeekday) as WeekdayKey[]).filter((k) => (input.cashSalesByWeekday[k] ?? 0) <= 0).map((k) => WEEKDAY_ES[k]);
  const openValues = (Object.values(input.cashSalesByWeekday) as number[]).filter((v) => v > 0);
  const minSales = openValues.length ? Math.min(...openValues) : 0;
  const maxSales = openValues.length ? Math.max(...openValues) : 0;
  const note = `Tus ventas de contado típicas van de ${formatCOP(minSales)} a ${formatCOP(maxSales)} según el día${closed.length ? ` (${closed.join(' y ')} cerrado)` : ''}, con unos ${formatCOP(input.pettyExpensesPerOpenDay)} de gastos de contado por día; en semana de quincena suben ${Math.round(boost * 100)}%. La plata segura cuenta solo el ${Math.round(RULES.prudentSalesFactor * 100)}% de esas ventas y no cuenta la subida de quincena hasta que se dé. Como registras en Necta cerca del ${Math.round(recordedShare * 100)}% de tus movimientos, este ritmo sale de lo que nos contaste, no de tus registros: por eso la certeza baja.`;

  return { recordedShare, quincenaBoost: boost, prudentSalesFactor: RULES.prudentSalesFactor, openDays: days.filter((d) => d.open).length, days, totals, note };
}
