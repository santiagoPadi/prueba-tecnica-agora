import { assessOperatingRhythm, isQuincenaWeek } from '../src/engine/domain/operating';
import type { OperatingRhythmInput } from '../src/engine/domain/types';

const carmen: OperatingRhythmInput = {
  cashSalesByWeekday: { mon: 260_000, tue: 260_000, wed: 260_000, thu: 260_000, fri: 520_000, sat: 520_000, sun: 0 },
  pettyExpensesPerOpenDay: 90_000,
  quincenaBoost: 0.3,
  recordedShare: 0.25,
};

describe('Ritmo operativo por día de la semana (Punto 1b)', () => {
  it('detecta la semana de quincena (la que contiene el 15 o el 30)', () => {
    expect(isQuincenaWeek('2026-05-25')).toBe(true);  // semana del 25 al 31 contiene el 30
    expect(isQuincenaWeek('2026-05-31')).toBe(true);
    expect(isQuincenaWeek('2026-06-01')).toBe(false);
    expect(isQuincenaWeek('2026-06-15')).toBe(true);
    expect(isQuincenaWeek('2026-05-10')).toBe(false);
  });

  it('en 14 días desde el lunes 25: 12 días abiertos, $3.704.000 probables y $2.248.000 prudentes', () => {
    const o = assessOperatingRhythm(carmen, '2026-05-25', 14);
    expect(o.openDays).toBe(12);
    expect(o.totals).toEqual({ prudente: 2_248_000, probable: 3_704_000, favorable: 3_704_000 });
    expect(o.days[4]).toMatchObject({ date: '2026-05-29', weekday: 'fri', quincenaWeek: true, cashSales: { prudente: 416_000, probable: 676_000, favorable: 676_000 }, expenses: 90_000 });
  });

  it('la plata segura cuenta el 80 % de las ventas y no cuenta la subida de quincena; los gastos van completos', () => {
    const o = assessOperatingRhythm(carmen, '2026-05-25', 1);
    expect(o.days[0]?.cashSales.prudente).toBe(208_000);
    expect(o.days[0]?.cashSales.probable).toBe(338_000);
    expect(o.days[0]?.net.prudente).toBe(118_000);
  });

  it('un día cerrado no vende ni gasta', () => {
    const o = assessOperatingRhythm(carmen, '2026-05-31', 1);
    expect(o.days[0]).toMatchObject({ weekday: 'sun', open: false, expenses: 0, net: { prudente: 0, probable: 0, favorable: 0 } });
  });

  it('si las ventas apenas cubren los gastos, la banda prudente queda en rojo y la probable en verde', () => {
    const o = assessOperatingRhythm({ ...carmen, cashSalesByWeekday: { ...carmen.cashSalesByWeekday, mon: 100_000 } }, '2026-06-01', 1);
    expect(o.days[0]?.net).toEqual({ prudente: -10_000, probable: 10_000, favorable: 10_000 });
  });

  it('usa 30 % de quincena por defecto y nunca produce NaN con un patrón vacío', () => {
    const o = assessOperatingRhythm({ cashSalesByWeekday: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }, pettyExpensesPerOpenDay: 90_000, recordedShare: 1 }, '2026-05-25', 14);
    expect(o.quincenaBoost).toBe(0.3);
    expect(o.openDays).toBe(0);
    expect(o.totals).toEqual({ prudente: 0, probable: 0, favorable: 0 });
  });
});
