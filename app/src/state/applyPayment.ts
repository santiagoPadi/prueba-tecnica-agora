import { formatCOP, type ForecastInput, type ISODate } from '../engine';

export interface LocalPayment {
  kind: 'payment';
  clientMutationId: string;
  receivableId: string;
  bankId: string;
  amount: number;
  paymentDate: ISODate;
  clientTimestamp: string;
}

/** Cuadre en 1 toque: «tengo lo que dice el saldo guardado» (modo CONFIRM_STORED_BALANCE). */
export interface LocalReconcile {
  kind: 'reconcile';
  clientMutationId: string;
  bankId: string;
  mode: 'CONFIRM_STORED_BALANCE' | 'CONFIRM_PROJECTED_BALANCE';
  clientTimestamp: string;
}

export type LocalMutation = LocalPayment | LocalReconcile;

/** Misma validación que hará el servidor: cuenta y bolsillo existentes, monto > 0 y ≤ pendiente. */
export function validateMutation(input: ForecastInput, m: LocalMutation): string | null {
  if (!input.pockets.some((p) => p.bankId === m.bankId)) return 'No existe ese bolsillito.';
  if (m.kind === 'reconcile') return null;
  const r = input.receivables.find((x) => x.id === m.receivableId);
  if (!r) return 'No existe ese cobro.';
  if (!Number.isFinite(m.amount) || m.amount <= 0) return 'Escribe un monto mayor que cero.';
  if (m.amount > r.pendingAmount) return `Ese cobro solo tiene ${formatCOP(r.pendingAmount)} pendientes.`;
  return null;
}

/**
 * Aplica mutaciones locales sobre una copia de las entradas, en orden. Un abono es un
 * movimiento: sube el saldo guardado y el reconstruido por igual (el descuadre no cambia).
 * Las mutaciones inválidas se saltan (el servidor las rechazará con 409 y la app pedirá revisar).
 */
export function applyMutations(input: ForecastInput, mutations: LocalMutation[]): ForecastInput {
  const next: ForecastInput = JSON.parse(JSON.stringify(input)) as ForecastInput;
  for (const m of mutations) {
    if (validateMutation(next, m) !== null) continue;
    const pocket = next.pockets.find((p) => p.bankId === m.bankId)!;
    if (m.kind === 'payment') {
      const r = next.receivables.find((x) => x.id === m.receivableId)!;
      r.pendingAmount -= m.amount;
      pocket.projectedBalance += m.amount;
      pocket.storedLedgerBalance += m.amount;
    } else if (m.mode === 'CONFIRM_STORED_BALANCE') {
      pocket.projectedBalance = pocket.storedLedgerBalance;
      pocket.alignmentDelta = 0;
    } else {
      pocket.storedLedgerBalance = pocket.projectedBalance;
      pocket.alignmentDelta = 0;
    }
  }
  return next;
}
