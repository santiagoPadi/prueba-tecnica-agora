/**
 * Prueba de la lógica de negocio con los datos del caso de la prueba técnica
 * (Pruebas técnicas.pdf): Carmen Ortiz, «Limpia Ya», lunes 25 de mayo de 2026.
 */
import { RULES_VERSION } from '../src/engine/domain/rules';
import { SCENARIOS, type DayProjection } from '../src/engine/domain/types';
import { buildForecast } from '../src/engine/engine';
import { carmenForecastInput } from '../src/engine/fixtures/carmen';

const input = carmenForecastInput();
const forecast = buildForecast(input, { now: new Date('2026-05-25T06:00:00-05:00') });

const day = (date: string): DayProjection => {
  const found = forecast.days.find((d) => d.date === date);
  if (!found) throw new Error(`No hay proyección para ${date}`);
  return found;
};
const receivable = (id: string) => {
  const found = forecast.receivables.find((r) => r.id === id);
  if (!found) throw new Error(`No hay cuenta ${id}`);
  return found;
};

describe('Caso Carmen · horizonte y punto de partida', () => {
  it('cubre 14 días calendario, del lunes 25 de mayo al domingo 7 de junio de 2026', () => {
    expect(forecast.horizonStart).toBe('2026-05-25');
    expect(forecast.horizonEnd).toBe('2026-06-07');
    expect(forecast.days).toHaveLength(14);
    expect(forecast.days[0]?.label).toBe('lun 25 may');
    expect(forecast.days[13]?.label).toBe('dom 7 jun');
    expect(forecast.rulesVersion).toBe(RULES_VERSION);
  });

  it('parte de los $1.640.000 que dan los movimientos y deja los $260.000 como plata por confirmar', () => {
    const ob = forecast.openingBalance;
    expect(ob.storedLedgerBalance).toBe(1_900_000);
    expect(ob.projectedBalance).toBe(1_640_000);
    expect(ob.alignmentDelta).toBe(260_000);
    expect(ob.opening).toEqual({ prudente: 1_640_000, probable: 1_640_000, favorable: 1_900_000 });
    expect(ob.basis).toEqual({ prudente: 'projectedBalance', probable: 'projectedBalance', favorable: 'storedLedgerBalance' });
    expect(ob.note).toContain('$260.000');
  });
});

describe('Caso Carmen · lo que le deben ($5.600.000), fechado por comportamiento', () => {
  it('suma $5.600.000 nominales', () => {
    expect(forecast.verdict.receivablesNominal).toBe(5_600_000);
  });

  it('Hotel Brisas (6 de 6 a tiempo) es confiable: cuenta el jueves 28 en las tres bandas', () => {
    const brisas = receivable('rec_hotel_brisas');
    expect(brisas.bucket).toBe('confiable');
    expect(brisas.probabilityInHorizon).toBe(0.95);
    expect(brisas.countedDate).toEqual({ prudente: '2026-05-28', probable: '2026-05-28', favorable: '2026-05-28' });
    expect(brisas.explanation).toBe('Ha pagado a tiempo las 6 veces. Cuenta con esta plata el jue 28 may.');
  });

  it('Minimercado Sol (20 días vencida, más que sus 18 habituales) no cuenta hasta que haya un abono', () => {
    const sol = receivable('rec_minimercado_sol');
    expect(sol.daysOverdue).toBe(20);
    expect(sol.bucket).toBe('vencida-mas-de-lo-habitual');
    expect(sol.probabilityInHorizon).toBe(0.25);
    expect(sol.countedDate).toEqual({ prudente: null, probable: null, favorable: '2026-05-28' });
    expect(sol.explanation).toContain('abono');
  });

  it('Tienda La Esquina (2 de 5 a tiempo, 12 días tarde) es irregular: probable solo al final del horizonte', () => {
    const esquina = receivable('rec_tienda_la_esquina');
    expect(esquina.bucket).toBe('irregular');
    expect(esquina.probabilityInHorizon).toBe(0.7);
    expect(esquina.expectedDate).toBe('2026-06-07');
    expect(esquina.countedDate).toEqual({ prudente: null, probable: '2026-06-07', favorable: '2026-05-26' });
    expect(esquina.explanation).toContain('no la contamos como plata segura');
  });

  it('Tienda Doña Fina (4 de 4 a tiempo) cuenta el viernes 29 en las tres bandas', () => {
    const fina = receivable('rec_tienda_dona_fina');
    expect(fina.bucket).toBe('confiable');
    expect(fina.countedDate).toEqual({ prudente: '2026-05-29', probable: '2026-05-29', favorable: '2026-05-29' });
  });

  it('las otras 9 tiendas (22 de 31 a tiempo): el primer tramo entra el 5 de junio; el segundo se sale del horizonte', () => {
    const t1 = receivable('rec_otras_tiendas_semana_1');
    const t2 = receivable('rec_otras_tiendas_semana_2');
    expect(t1.bucket).toBe('irregular');
    expect(t1.probabilityInHorizon).toBe(0.85);
    expect(t1.countedDate).toEqual({ prudente: '2026-06-05', probable: '2026-06-05', favorable: '2026-05-29' });
    expect(t1.explanation).toContain('La plata segura la cuenta el vie 5 jun');
    expect(t2.probabilityInHorizon).toBe(0.71);
    expect(t2.countedDate).toEqual({ prudente: null, probable: null, favorable: '2026-06-05' });
  });
});

describe('Caso Carmen · ritmo diario por día de la semana', () => {
  it('ventas de $260.000 lun–jue y $520.000 vie–sáb, cerrado domingos, +30 % en semana de quincena, $90.000 de gastos', () => {
    const o = forecast.operatingRhythm;
    expect(o.openDays).toBe(12);
    expect(o.recordedShare).toBe(0.25);
    const mon = o.days.find((d) => d.date === '2026-05-25')!;
    expect(mon.quincenaWeek).toBe(true);
    expect(mon.net).toEqual({ prudente: 118_000, probable: 248_000, favorable: 248_000 });
    const fri = o.days.find((d) => d.date === '2026-05-29')!;
    expect(fri.net.probable).toBe(586_000);
    const sun = o.days.find((d) => d.date === '2026-05-31')!;
    expect(sun.open).toBe(false);
    expect(sun.net).toEqual({ prudente: 0, probable: 0, favorable: 0 });
    const mon2 = o.days.find((d) => d.date === '2026-06-01')!;
    expect(mon2.quincenaWeek).toBe(false);
    expect(mon2.net).toEqual({ prudente: 118_000, probable: 170_000, favorable: 170_000 });
    expect(o.totals).toEqual({ prudente: 2_248_000, probable: 3_704_000, favorable: 3_704_000 });
    expect(o.note).toContain('25%');
    expect(o.note).toContain('80%');
  });
});

describe('Caso Carmen · la pregunta del viernes: ¿me alcanza o pido plazo?', () => {
  it('el viernes 29 alcanza para los $4.200.000 del proveedor: cierra con $938.000 de plata segura', () => {
    expect(day('2026-05-29').balance.prudente).toBe(938_000);
    expect(day('2026-05-29').balance.probable).toBe(1_718_000);
    expect(forecast.verdict.firstGap?.date).not.toBe('2026-05-29');
  });

  it('…pero solo si Hotel Brisas paga el jueves como siempre: sin ese cobro faltarían $1.162.000', () => {
    expect(forecast.verdict.hinges).toHaveLength(1);
    expect(forecast.verdict.hinges[0]).toMatchObject({
      date: '2026-05-29',
      receivableId: 'rec_hotel_brisas',
      countedDate: '2026-05-28',
      balanceWith: 938_000,
      balanceWithout: -1_162_000,
    });
    expect(forecast.verdict.detail).toContain('El viernes 29 de mayo alcanza solo si Hotel Brisas paga a tiempo; sin ese cobro te faltarían $1.162.000.');
  });

  it('propone pedir plazo al proveedor por si acaso, antes del viernes', () => {
    const plazo = forecast.actions.find((a) => a.type === 'pedir-plazo')!;
    expect(plazo.counterpartyName).toBe('tu proveedor principal');
    expect(plazo.amount).toBe(4_200_000);
    expect(plazo.deadline).toBe('2026-05-28');
    expect(plazo.title).toContain('por si Hotel Brisas no paga');
    expect(plazo.whatsappDraft).toBeTruthy();
  });
});

describe('Caso Carmen · el hueco real: ayudantes el sábado y arriendo el lunes', () => {
  it('el sábado 30 faltan $136.000 para los ayudantes con la plata segura', () => {
    expect(day('2026-05-30').balance.prudente).toBe(-136_000);
    expect(day('2026-05-30').balance.probable).toBe(904_000);
    expect(forecast.verdict.status).toBe('faltante');
    expect(forecast.verdict.headline).toBe('El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes.');
    expect(forecast.verdict.firstGap).toMatchObject({ date: '2026-05-30', amount: 136_000, triggers: ['el pago de tus ayudantes'] });
  });

  it('el lunes 1 el hueco llega a $1.318.000 por el arriendo y se recupera al final de la segunda semana', () => {
    expect(forecast.verdict.worstGap).toMatchObject({ date: '2026-06-01', amount: 1_318_000, triggers: ['el arriendo de la bodega'] });
    expect(day('2026-06-01').balance).toEqual({ prudente: -1_318_000, probable: -226_000, favorable: 2_509_000 });
    expect(forecast.verdict.endOfHorizon).toEqual({ prudente: 113_000, probable: 2_419_000, favorable: 4_304_000 });
    expect(forecast.verdict.detail).toContain('lunes 1 de junio');
    expect(forecast.verdict.detail).toContain('$1.318.000');
  });

  it('el muro de 4 días va del viernes 29 al lunes 1: salen $6.900.000', () => {
    expect(forecast.verdict.criticalWindow).toEqual({
      from: '2026-05-29',
      to: '2026-06-01',
      label: 'del viernes 29 de mayo al lunes 1 de junio',
      outflows: 6_900_000,
    });
    expect(forecast.verdict.totalOutflows).toEqual({ prudente: 6_900_000, probable: 6_900_000, favorable: 6_900_000 });
  });

  it('la cuota del préstamo (día 10) queda fuera de los 14 días pero registrada como compromiso', () => {
    expect(input.commitments.some((c) => c.id === 'cmt_cuota_prestamo')).toBe(true);
    expect(forecast.outflows.map((o) => o.label)).toEqual(['tu proveedor principal', 'el pago de tus ayudantes', 'el arriendo de la bodega']);
  });

  it('el espejismo ingenuo diría «te sobran $7.004.000»; ninguna banda lo muestra', () => {
    const naive = 1_900_000 + 5_600_000 + forecast.operatingRhythm.totals.probable - 4_200_000;
    expect(naive).toBe(7_004_000);
    for (const s of SCENARIOS) expect(forecast.verdict.endOfHorizon[s]).toBeLessThan(naive);
    expect(forecast.verdict.endOfHorizon.favorable).toBe(4_304_000);
  });

  it('cada día cierra con saldo anterior + entradas − salidas, en las tres bandas', () => {
    for (const s of SCENARIOS) {
      let balance = forecast.openingBalance.opening[s];
      for (const d of forecast.days) {
        expect(d.startBalance[s]).toBe(balance);
        balance += d.inflows[s] - d.outflows[s];
        expect(d.balance[s]).toBe(balance);
      }
      expect(forecast.verdict.endOfHorizon[s]).toBe(balance);
    }
  });
});

describe('Caso Carmen · certeza y acciones', () => {
  it('certeza media (0,46): registra el 25 % de sus movimientos y hay $260.000 sin cuadrar', () => {
    expect(forecast.certainty.level).toBe('media');
    expect(forecast.certainty.score).toBe(0.46);
    expect(forecast.certainty.factors.map((f) => [f.code, f.penalty])).toEqual([['registro-parcial', 0.38], ['descuadre', 0.16]]);
    expect(forecast.certainty.ifConfirmed).toEqual({
      score: 0.62,
      level: 'media',
      note: 'Confirmar cuánto tienes en caja mejora la certeza, aunque sigue media mientras registres solo una parte de tus movimientos.',
    });
  });

  it('a quién cobrarle primero: Brisas (asegura el viernes), La Esquina (irregular, vence mañana), Doña Fina', () => {
    const top = forecast.actions.slice(0, 3);
    expect(top.map((a) => [a.type, a.counterpartyName])).toEqual([
      ['cobrar', 'Hotel Brisas'],
      ['cobrar', 'Tienda La Esquina'],
      ['cobrar', 'Tienda Doña Fina'],
    ]);
    expect(top[0]?.title).toBe('Recordarle a Hotel Brisas el pago de $2.100.000 del jueves 28 de mayo');
    expect(top[0]?.effect).toBe('Ya está contado en tu plata segura: sin este cobro el viernes 29 de mayo te faltarían $1.162.000.');
    expect(top[1]?.deadline).toBe('2026-05-26');
    expect(top[1]?.effect).toContain('cubre el faltante de $136.000 del sábado 30 de mayo');
  });

  it('después: las otras tiendas, abono parcial de Sol, confirmar saldo, pedir plazo, y el tramo que vence el 5', () => {
    const rest = forecast.actions.slice(3).map((a) => [a.type, a.counterpartyName]);
    expect(rest).toEqual([
      ['cobrar', 'las otras 9 tiendas (primera semana)'],
      ['abono-parcial', 'Minimercado Sol'],
      ['confirmar-saldo', null],
      ['pedir-plazo', 'tu proveedor principal'],
      ['cobrar', 'las otras 9 tiendas (segunda semana)'],
    ]);
    const sol = forecast.actions.find((a) => a.type === 'abono-parcial')!;
    expect(sol.amount).toBe(600_000);
    const saldo = forecast.actions.find((a) => a.type === 'confirmar-saldo')!;
    expect(saldo.certaintyAfter).toEqual({ score: 0.62, level: 'media' });
    expect(saldo.effect).toContain('cubres el faltante de $136.000 del sábado 30 de mayo');
    const tramo2 = forecast.actions[forecast.actions.length - 1]!;
    expect(tramo2.deadline).toBe('2026-06-05');
    expect(tramo2.effect).toContain('del viernes 5 de junio');
    for (let i = 1; i < forecast.actions.length; i += 1) {
      expect(forecast.actions[i]!.score).toBeLessThanOrEqual(forecast.actions[i - 1]!.score);
    }
  });

  it('cada acción es auditable (factores en 0..1) y accionable (deep link, borrador de WhatsApp)', () => {
    for (const a of forecast.actions) {
      expect(a.deepLink.startsWith('necta://')).toBe(true);
      for (const value of Object.values(a.factors)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      if (a.channel === 'whatsapp') expect(a.whatsappDraft).toBeTruthy();
      else expect(a.whatsappDraft).toBeNull();
    }
  });

  it('la vista móvil recibe el veredicto, la certeza y máximo 3 acciones', () => {
    expect(forecast.mobile.headline).toBe(forecast.verdict.headline);
    expect(forecast.mobile.certainty).toBe('Certeza media: 1 dato por confirmar');
    expect(forecast.mobile.actions).toHaveLength(3);
  });
});

describe('Caso Carmen · «Necta habla tu idioma» (cero jerga contable)', () => {
  const forbidden = [
    'cuentas por cobrar', 'cuentas por pagar', 'conciliaci', 'cartera', 'pasivo', 'liquidez',
    'percentil', 'intervalo de confianza', 'desviaci', 'asiento', 'transacci', 'flujo de caja',
    'libro mayor', 'subcuenta', 'centro de costo', 'heur', 'solvencia',
  ];
  const userFacing: string[] = [
    forecast.verdict.headline,
    forecast.verdict.detail,
    forecast.openingBalance.note,
    forecast.operatingRhythm.note,
    forecast.certainty.label,
    forecast.mobile.certainty,
    forecast.certainty.ifConfirmed?.note ?? '',
    ...forecast.certainty.factors.map((f) => f.label),
    ...forecast.receivables.map((r) => r.explanation),
    ...forecast.actions.flatMap((a) => [a.title, a.why, a.effect, a.whatsappDraft ?? '']),
    ...forecast.mobile.actions,
  ];

  it('ningún texto para la usuaria contiene jerga prohibida', () => {
    for (const text of userFacing) {
      const lower = text.toLowerCase();
      for (const term of forbidden) expect(`${text} ⟶ ${lower.includes(term) ? 'CONTIENE ' + term : 'ok'}`).not.toContain('CONTIENE');
    }
  });
});
