import { carmenForecastInput } from '../src/engine';
import type { LocalPayment } from '../src/state/applyPayment';
import { forecastReducer, initialState, pendingCount, projectedForecast } from '../src/state/forecastReducer';

const at = new Date('2026-05-25T07:02:00-05:00');
const abono = (amount: number, id = 'm_1'): LocalPayment => ({ kind: 'payment', clientMutationId: id, receivableId: 'rec_minimercado_sol', bankId: 'bank_caja', amount, paymentDate: '2026-05-25', clientTimestamp: at.toISOString() });

describe('outbox y proyección optimista', () => {
  it('sin señal, un abono de $300.000 cambia el titular al instante y queda pendiente de sincronizar', () => {
    let s = initialState(carmenForecastInput(), at, false);
    expect(projectedForecast(s).verdict.headline).toBe('El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes.');
    s = forecastReducer(s, { type: 'ENQUEUE', mutation: abono(300_000) });
    expect(pendingCount(s)).toBe(1);
    expect(projectedForecast(s).verdict.headline).toBe('El lunes 1 de junio te faltan $1.018.000 para el arriendo de la bodega.');
  });

  it('el mismo clientMutationId no se encola dos veces', () => {
    let s = initialState(carmenForecastInput(), at, false);
    s = forecastReducer(s, { type: 'ENQUEUE', mutation: abono(300_000, 'dup') });
    s = forecastReducer(s, { type: 'ENQUEUE', mutation: abono(300_000, 'dup') });
    expect(pendingCount(s)).toBe(1);
  });

  it('al confirmar el servidor, el abono pasa al estado confirmado y el titular no cambia', () => {
    let s = initialState(carmenForecastInput(), at, true);
    s = forecastReducer(s, { type: 'ENQUEUE', mutation: abono(300_000) });
    s = forecastReducer(s, { type: 'SYNC_START', clientMutationId: 'm_1' });
    s = forecastReducer(s, { type: 'SYNC_OK', clientMutationId: 'm_1', confirmedAt: new Date('2026-05-25T11:00:00-05:00') });
    expect(s.outbox).toHaveLength(0);
    expect(s.confirmedInput.receivables.find((r) => r.id === 'rec_minimercado_sol')?.pendingAmount).toBe(900_000);
    expect(projectedForecast(s).verdict.firstGap).toMatchObject({ date: '2026-06-01', amount: 1_018_000 });
    expect(s.lastSyncMessage).toBe('Abono guardado');
  });

  it('un 409 del servidor deja el abono en conflicto y lo saca de la proyección', () => {
    let s = initialState(carmenForecastInput(), at, true);
    s = forecastReducer(s, { type: 'ENQUEUE', mutation: abono(300_000) });
    s = forecastReducer(s, { type: 'SYNC_CONFLICT', clientMutationId: 'm_1', error: 'Ya había otro abono desde la web' });
    expect(s.outbox[0]?.status).toBe('conflicto');
    expect(pendingCount(s)).toBe(0);
    expect(projectedForecast(s).verdict.firstGap?.amount).toBe(136_000);
    s = forecastReducer(s, { type: 'DISCARD', clientMutationId: 'm_1' });
    expect(s.outbox).toHaveLength(0);
  });

  it('un abono mayor al pendiente no se encola y deja un mensaje', () => {
    const s = forecastReducer(initialState(carmenForecastInput(), at, false), { type: 'ENQUEUE', mutation: abono(5_000_000) });
    expect(pendingCount(s)).toBe(0);
    expect(s.lastSyncMessage).toMatch(/pendientes/);
  });
});
