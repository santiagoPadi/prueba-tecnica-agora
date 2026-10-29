import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { ForecastInput } from '../engine';
import { validateMutation, type LocalMutation } from './applyPayment';
import { forecastReducer, initialState, pendingCount, projectedForecast, type ForecastState } from './forecastReducer';

/**
 * Estado de la pantalla: reducer puro + un «servidor» simulado que acepta cada mutación
 * ~0,9 s después de tener señal. En la app real, la outbox vive en SQLite y cada ítem es un
 * POST idempotente (clientMutationId); un 409 deja el ítem en «conflicto» para revisarlo.
 */
export function useForecast(input: ForecastInput, confirmedAt: Date, startOnline = true) {
  const [state, dispatch] = useReducer(forecastReducer, undefined, () => initialState(input, confirmedAt, startOnline));
  const forecast = useMemo(() => projectedForecast(state), [state]);
  const inFlight = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!state.online || inFlight.current) return;
    const next = state.outbox.find((o) => o.status === 'pendiente');
    if (!next) return;
    const id = next.mutation.clientMutationId;
    const serverState = state.confirmedInput; // el servidor valida contra SU estado confirmado
    inFlight.current = id;
    dispatch({ type: 'SYNC_START', clientMutationId: id });
    const timer = setTimeout(() => {
      inFlight.current = null;
      const error = validateMutation(serverState, next.mutation);
      if (error) dispatch({ type: 'SYNC_CONFLICT', clientMutationId: id, error });
      else dispatch({ type: 'SYNC_OK', clientMutationId: id, confirmedAt: new Date() });
    }, 900);
    timers.current.push(timer);
  }, [state.online, state.outbox, state.confirmedInput]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  return { state: state as ForecastState, forecast, dispatch, pending: pendingCount(state), enqueue: (mutation: LocalMutation) => dispatch({ type: 'ENQUEUE', mutation }) };
}
