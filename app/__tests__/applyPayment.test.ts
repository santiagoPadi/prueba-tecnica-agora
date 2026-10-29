import { carmenForecastInput } from '../src/engine';
import { applyMutations, validateMutation, type LocalPayment, type LocalReconcile } from '../src/state/applyPayment';

const abono = (amount: number, id = 'm_1'): LocalPayment => ({ kind: 'payment', clientMutationId: id, receivableId: 'rec_minimercado_sol', bankId: 'bank_caja', amount, paymentDate: '2026-05-25', clientTimestamp: '2026-05-25T09:00:00-05:00' });

describe('mutaciones locales (misma validación que el servidor)', () => {
  it('un abono baja el pendiente y sube los dos saldos del bolsillito por igual', () => {
    const next = applyMutations(carmenForecastInput(), [abono(300_000)]);
    expect(next.receivables.find((r) => r.id === 'rec_minimercado_sol')?.pendingAmount).toBe(900_000);
    const caja = next.pockets.find((p) => p.bankId === 'bank_caja')!;
    expect(caja.projectedBalance).toBe(1_340_000);
    expect(caja.storedLedgerBalance).toBe(1_600_000);
    expect(caja.storedLedgerBalance - caja.projectedBalance).toBe(260_000);
  });

  it('rechaza montos inválidos, cuentas o bolsillitos inexistentes y abonos mayores al pendiente', () => {
    const input = carmenForecastInput();
    expect(validateMutation(input, abono(0))).toMatch(/mayor que cero/);
    expect(validateMutation(input, abono(1_300_000))).toMatch(/\$1\.200\.000 pendientes/);
    expect(validateMutation(input, { ...abono(100), receivableId: 'rec_x' })).toMatch(/No existe ese cobro/);
    expect(validateMutation(input, { ...abono(100), bankId: 'bank_x' })).toMatch(/bolsillito/);
  });

  it('el cuadre «tengo lo que dice el saldo guardado» deja el descuadre en cero', () => {
    const reconcile: LocalReconcile = { kind: 'reconcile', clientMutationId: 'm_r', bankId: 'bank_caja', mode: 'CONFIRM_STORED_BALANCE', clientTimestamp: '2026-05-25T09:00:00-05:00' };
    const next = applyMutations(carmenForecastInput(), [reconcile]);
    const caja = next.pockets.find((p) => p.bankId === 'bank_caja')!;
    expect(caja).toMatchObject({ storedLedgerBalance: 1_300_000, projectedBalance: 1_300_000, alignmentDelta: 0 });
  });

  it('no muta la entrada original', () => {
    const input = carmenForecastInput();
    applyMutations(input, [abono(300_000)]);
    expect(input.receivables.find((r) => r.id === 'rec_minimercado_sol')?.pendingAmount).toBe(1_200_000);
  });
});
