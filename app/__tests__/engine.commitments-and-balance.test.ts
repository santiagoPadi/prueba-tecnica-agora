import { buildForecast } from '../src/engine/engine';
import { carmenForecastInput } from '../src/engine/fixtures/carmen';

describe('Compromisos que Necta no conoce (Punto 1c)', () => {
  it('un compromiso sugerido por patrón se descuenta en prudente y probable, no en favorable, y pide confirmación primero', () => {
    const input = carmenForecastInput();
    const arriendo = input.commitments.find((c) => c.id === 'cmt_arriendo_bodega')!;
    arriendo.source = 'sugerido-por-patron';
    arriendo.confirmed = false;

    const f = buildForecast(input);
    const summary = f.outflows.find((o) => o.id === 'cmt_arriendo_bodega')!;
    expect(summary.scenarios).toEqual(['prudente', 'probable']);
    expect(f.verdict.endOfHorizon.prudente).toBe(113_000);
    expect(f.verdict.endOfHorizon.favorable).toBe(4_304_000 + 1_300_000);
    expect(f.actions[0]?.type).toBe('confirmar-compromiso');
    expect(f.actions[0]?.title).toBe('Confirmar: ¿el arriendo de la bodega por $1.300.000 el lunes 1 de junio?');
    expect(f.certainty.factors.map((x) => x.code)).toContain('compromisos-sin-confirmar');
    expect(f.certainty.level).toBe('baja'); // un dato más por confirmar baja la certeza de media a baja
  });

  it('sin ayudantes ni arriendo la banda favorable reproduce el espejismo (+$7.004.000): el motor lo advierte y baja la certeza', () => {
    const input = carmenForecastInput();
    input.commitments = [];
    const f = buildForecast(input);
    expect(f.verdict.endOfHorizon.favorable).toBe(7_004_000);
    expect(f.verdict.status).toBe('cubierto');
    expect(f.verdict.firstGap).toBeNull();
    // la dependencia de Hotel Brisas sigue visible aunque no haya hueco
    expect(f.verdict.detail).toContain('alcanza solo si Hotel Brisas paga a tiempo');
    expect(f.certainty.factors.map((x) => x.code)).toContain('sin-compromisos-capturados');
    expect(f.certainty.level).toBe('baja');
    expect(f.verdict.detail).toContain('no tienes pagos fijos anotados');
  });
});

describe('Descuadre de saldo (Punto 1a)', () => {
  it('si el saldo guardado es menor que el reconstruido, la plata segura parte del menor', () => {
    const input = carmenForecastInput();
    input.pockets = [
      { bankId: 'bank_caja', name: 'Caja', storedLedgerBalance: 1_000_000, projectedBalance: 1_040_000, alignmentDelta: -40_000 },
      { bankId: 'bank_banco', name: 'Banco', storedLedgerBalance: 600_000, projectedBalance: 600_000, alignmentDelta: 0 },
    ];
    const f = buildForecast(input);
    expect(f.openingBalance.alignmentDelta).toBe(-40_000);
    expect(f.openingBalance.opening).toEqual({ prudente: 1_600_000, probable: 1_640_000, favorable: 1_640_000 });
    expect(f.openingBalance.basis).toEqual({ prudente: 'storedLedgerBalance', probable: 'projectedBalance', favorable: 'projectedBalance' });
    const saldo = f.actions.find((a) => a.type === 'confirmar-saldo')!;
    expect(saldo.why).toContain('$40.000');
  });

  it('sin descuadre no se pide confirmar el saldo', () => {
    const input = carmenForecastInput();
    input.pockets = [{ bankId: 'bank_caja', name: 'Caja', storedLedgerBalance: 1_640_000, projectedBalance: 1_640_000, alignmentDelta: 0 }];
    const f = buildForecast(input);
    expect(f.actions.some((a) => a.type === 'confirmar-saldo')).toBe(false);
    expect(f.certainty.factors.map((x) => x.code)).not.toContain('descuadre');
  });
});

describe('Veredicto cuando sí alcanza', () => {
  it('con caja suficiente el estado es «cubierto», sin faltantes ni dependencias, y las acciones de cobro siguen disponibles', () => {
    const input = carmenForecastInput();
    input.pockets = [{ bankId: 'bank_caja', name: 'Caja', storedLedgerBalance: 12_000_000, projectedBalance: 12_000_000, alignmentDelta: 0 }];
    const f = buildForecast(input);
    expect(f.verdict.status).toBe('cubierto');
    expect(f.verdict.firstGap).toBeNull();
    expect(f.verdict.hinges).toEqual([]);
    expect(f.verdict.headline).toContain('cubres todos tus pagos');
    expect(f.actions.length).toBeGreaterThan(0);
    expect(f.actions.some((a) => a.type === 'renegociar-pago' || a.type === 'pedir-plazo')).toBe(false);
  });

  it('rechaza horizontes inválidos', () => {
    const input = carmenForecastInput();
    input.horizonDays = 0;
    expect(() => buildForecast(input)).toThrow(/horizonDays/);
  });
});
