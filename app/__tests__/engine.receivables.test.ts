import { assessReceivable, resolveCommunitySignal } from '../src/engine/domain/receivables';
import type { ReceivableInput } from '../src/engine/domain/types';

const ctx = { asOf: '2026-05-25', horizonEnd: '2026-06-07' };

const hotelNuevo = (overrides: Partial<ReceivableInput> = {}): ReceivableInput => ({
  id: 'rec_hotel_palmar',
  counterpartyName: 'Hotel Palmar',
  totalAmount: 2_100_000,
  pendingAmount: 2_100_000,
  creditDueBy: '2026-05-28',
  history: { salesCount: 1, onTimeRate: 0, avgDaysLate: 9 },
  ...overrides,
});

describe('Señal comunitaria (Punto 5): K-anonimato y resolución de entidad', () => {
  it('con 4 comercios y entidad bien resuelta, el agregado ajusta fecha y probabilidad como prior', () => {
    const r = assessReceivable(hotelNuevo({ communitySignal: { independentMerchants: 4, entityResolutionConfidence: 0.9, avgDaysLate: 5, onTimeRate: 0.7 } }), ctx);
    // w_propio = 1 / (1 + 3) = 0.25 → atraso 0.25·9 + 0.75·5 = 6 días; p = 0.25·0.5 + 0.75·0.7 = 0.65
    expect(r.communitySignal.used).toBe(true);
    expect(r.expectedDate).toBe('2026-06-03');
    expect(r.probabilityInHorizon).toBe(0.65);
    // copy neutro con rango agregado (redondeado a 2 días), sin nombres ni montos de terceros
    expect(r.explanation).toContain('En negocios similares de tu zona suele tardar entre 4 y 6 días más de lo pactado');
    expect(r.explanation).not.toMatch(/distribuidora|comercios?\s+\d/i);
    expect(r.countedDate).toEqual({ prudente: null, probable: '2026-06-03', favorable: '2026-05-28' });
  });

  it('con menos de 3 comercios la señal se ignora por completo', () => {
    const r = assessReceivable(hotelNuevo({ communitySignal: { independentMerchants: 2, entityResolutionConfidence: 0.95, avgDaysLate: 2, onTimeRate: 0.95 } }), ctx);
    expect(r.communitySignal).toEqual({ used: false, reason: 'menos-de-k-comercios' });
    expect(r.expectedDate).toBe('2026-06-06');
    expect(r.probabilityInHorizon).toBe(0.5);
  });

  it('si la entidad solo coincide por nombre libre (baja confianza), la señal se ignora', () => {
    const r = assessReceivable(hotelNuevo({ communitySignal: { independentMerchants: 10, entityResolutionConfidence: 0.5, avgDaysLate: 2, onTimeRate: 0.95 } }), ctx);
    expect(r.communitySignal).toEqual({ used: false, reason: 'entidad-ambigua' });
    expect(r.probabilityInHorizon).toBe(0.5);
  });

  it('resolveCommunitySignal nunca devuelve identificadores de los comercios fuente', () => {
    const resolved = resolveCommunitySignal({ independentMerchants: 4, entityResolutionConfidence: 0.9, avgDaysLate: 5, onTimeRate: 0.7 });
    expect(Object.keys(resolved).sort()).toEqual(['avgDaysLate', 'onTimeRate', 'reason', 'used']);
  });
});

describe('Perfiles de cobro', () => {
  it('sin ninguna venta previa: historial corto, fecha esperada = vencimiento, p = 0.5', () => {
    const r = assessReceivable(hotelNuevo({ history: { salesCount: 0, onTimeRate: 0, avgDaysLate: 0 } }), ctx);
    expect(r.bucket).toBe('historial-corto');
    expect(r.expectedDate).toBe('2026-05-28');
    expect(r.probabilityInHorizon).toBe(0.5);
  });

  it('cliente nuevo cuya fecha esperada cae fuera del horizonte pierde la mitad de la probabilidad', () => {
    const r = assessReceivable(hotelNuevo({ creditDueBy: '2026-06-05', history: { salesCount: 1, onTimeRate: 0, avgDaysLate: 9 } }), ctx);
    expect(r.expectedDate).toBe('2026-06-14');
    expect(r.probabilityInHorizon).toBe(0.25);
    expect(r.countedDate).toEqual({ prudente: null, probable: null, favorable: '2026-06-05' });
  });

  it('vencida dentro de su atraso habitual: probable hacia su fecha típica, favorable 3 días después de gestionarla', () => {
    const r = assessReceivable(hotelNuevo({ id: 'rec_x', counterpartyName: 'Droguería Mar', creditDueBy: '2026-05-20', history: { salesCount: 8, onTimeRate: 0.6, avgDaysLate: 10 } }), ctx);
    expect(r.daysOverdue).toBe(5);
    expect(r.bucket).toBe('vencida-dentro-de-lo-habitual');
    expect(r.probabilityInHorizon).toBe(0.6);
    expect(r.expectedDate).toBe('2026-05-30');
    expect(r.countedDate).toEqual({ prudente: null, probable: '2026-05-30', favorable: '2026-05-28' });
  });

  it('cliente irregular con historial: probable solo si su atraso típico cae dentro del horizonte', () => {
    const inside = assessReceivable(hotelNuevo({ creditDueBy: '2026-05-30', history: { salesCount: 8, onTimeRate: 0.4, avgDaysLate: 6 } }), ctx);
    expect(inside.bucket).toBe('irregular');
    expect(inside.probabilityInHorizon).toBe(0.7); // 0.4 + 0.6 · 1 · 0.5
    expect(inside.countedDate).toEqual({ prudente: null, probable: '2026-06-05', favorable: '2026-05-30' });

    const outside = assessReceivable(hotelNuevo({ creditDueBy: '2026-06-05', history: { salesCount: 8, onTimeRate: 0.4, avgDaysLate: 10 } }), ctx);
    expect(outside.probabilityInHorizon).toBe(0.4);
    expect(outside.countedDate).toEqual({ prudente: null, probable: null, favorable: '2026-06-05' });
  });

  it('cliente confiable: la plata segura la cuenta en su fecha más tardía', () => {
    const r = assessReceivable(hotelNuevo({ creditDueBy: '2026-05-27', history: { salesCount: 12, onTimeRate: 0.9, avgDaysLate: 4 } }), ctx);
    expect(r.bucket).toBe('confiable');
    expect(r.probabilityInHorizon).toBe(0.9);
    expect(r.countedDate).toEqual({ prudente: '2026-05-31', probable: '2026-05-27', favorable: '2026-05-27' });
  });

  it('cliente que siempre paga a tiempo: p 0,95, fecha única y explicación sin «0 días»', () => {
    const r = assessReceivable(hotelNuevo({ creditDueBy: '2026-05-28', history: { salesCount: 6, onTimeRate: 1, avgDaysLate: 0 } }), ctx);
    expect(r.bucket).toBe('confiable');
    expect(r.probabilityInHorizon).toBe(0.95);
    expect(r.countedDate).toEqual({ prudente: '2026-05-28', probable: '2026-05-28', favorable: '2026-05-28' });
    expect(r.explanation).toBe('Ha pagado a tiempo las 6 veces. Cuenta con esta plata el jue 28 may.');
  });

  it('cliente irregular que aun así entra en los 14 días: la plata segura lo cuenta en su fecha típica', () => {
    const r = assessReceivable(hotelNuevo({ creditDueBy: '2026-05-29', history: { salesCount: 31, onTimeRate: 22 / 31, avgDaysLate: 7 } }), ctx);
    expect(r.probabilityInHorizon).toBe(0.85);
    expect(r.countedDate.prudente).toBe('2026-06-05');
    expect(r.explanation).toContain('La plata segura la cuenta el vie 5 jun, no el vie 29 may');
  });

  it('un cobro cuya fecha prudente cae después del horizonte no entra en la plata segura', () => {
    const r = assessReceivable(hotelNuevo({ creditDueBy: '2026-06-06', history: { salesCount: 12, onTimeRate: 0.9, avgDaysLate: 4 } }), ctx);
    expect(r.countedDate).toEqual({ prudente: null, probable: '2026-06-06', favorable: '2026-06-06' });
  });
});
