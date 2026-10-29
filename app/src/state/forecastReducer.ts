import { buildForecast, type ForecastInput, type ForecastResponse } from '../engine';
import { applyMutations, validateMutation, type LocalMutation } from './applyPayment';

export type OutboxStatus = 'pendiente' | 'enviando' | 'conflicto';
export interface OutboxItem {
  mutation: LocalMutation;
  status: OutboxStatus;
  attempts: number;
  error: string | null;
}

export interface ForecastState {
  /** Última respuesta confirmada por el servidor (entradas compactas) y cuándo se calculó. */
  confirmedInput: ForecastInput;
  confirmedAt: Date;
  outbox: OutboxItem[];
  online: boolean;
  lastSyncMessage: string | null;
}

export type ForecastAction =
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'ENQUEUE'; mutation: LocalMutation }
  | { type: 'SYNC_START'; clientMutationId: string }
  | { type: 'SYNC_OK'; clientMutationId: string; confirmedAt: Date }
  | { type: 'SYNC_CONFLICT'; clientMutationId: string; error: string }
  | { type: 'DISCARD'; clientMutationId: string }
  | { type: 'CLEAR_MESSAGE' };

export function initialState(input: ForecastInput, confirmedAt: Date, online = true): ForecastState {
  return { confirmedInput: input, confirmedAt, outbox: [], online, lastSyncMessage: null };
}

export function forecastReducer(state: ForecastState, action: ForecastAction): ForecastState {
  switch (action.type) {
    case 'SET_ONLINE':
      return { ...state, online: action.online };
    case 'ENQUEUE': {
      // idempotencia local: el mismo clientMutationId no se encola dos veces
      if (state.outbox.some((o) => o.mutation.clientMutationId === action.mutation.clientMutationId)) return state;
      const error = validateMutation(projectedInput(state), action.mutation);
      if (error) return { ...state, lastSyncMessage: error };
      return { ...state, outbox: [...state.outbox, { mutation: action.mutation, status: 'pendiente', attempts: 0, error: null }], lastSyncMessage: null };
    }
    case 'SYNC_START':
      return { ...state, outbox: state.outbox.map((o) => (o.mutation.clientMutationId === action.clientMutationId ? { ...o, status: 'enviando', attempts: o.attempts + 1 } : o)) };
    case 'SYNC_OK': {
      const item = state.outbox.find((o) => o.mutation.clientMutationId === action.clientMutationId);
      if (!item) return state;
      return {
        ...state,
        confirmedInput: applyMutations(state.confirmedInput, [item.mutation]),
        confirmedAt: action.confirmedAt,
        outbox: state.outbox.filter((o) => o !== item),
        lastSyncMessage: item.mutation.kind === 'payment' ? 'Abono guardado' : 'Saldo cuadrado',
      };
    }
    case 'SYNC_CONFLICT':
      return { ...state, outbox: state.outbox.map((o) => (o.mutation.clientMutationId === action.clientMutationId ? { ...o, status: 'conflicto', error: action.error } : o)) };
    case 'DISCARD':
      return { ...state, outbox: state.outbox.filter((o) => o.mutation.clientMutationId !== action.clientMutationId) };
    case 'CLEAR_MESSAGE':
      return { ...state, lastSyncMessage: null };
    default:
      return state;
  }
}

/** Entradas proyectadas = confirmadas + mutaciones en cola (sin las que están en conflicto). */
export function projectedInput(state: ForecastState): ForecastInput {
  return applyMutations(state.confirmedInput, state.outbox.filter((o) => o.status !== 'conflicto').map((o) => o.mutation));
}

/** El mismo motor que corre en el servidor, sobre las entradas proyectadas. */
export function projectedForecast(state: ForecastState): ForecastResponse {
  return buildForecast(projectedInput(state), { now: state.confirmedAt });
}

export function pendingCount(state: ForecastState): number {
  return state.outbox.filter((o) => o.status !== 'conflicto').length;
}
