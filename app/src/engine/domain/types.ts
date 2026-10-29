import type { ISODate } from './dates';

export type { ISODate };

export type ScenarioKey = 'prudente' | 'probable' | 'favorable';
export const SCENARIOS: readonly ScenarioKey[] = ['prudente', 'probable', 'favorable'];

export type CertaintyLevel = 'alta' | 'media' | 'baja';

export type ReceivableBucket =
  | 'confiable'                    // historial suficiente y puntualidad alta
  | 'irregular'                    // historial suficiente, puntualidad baja
  | 'historial-corto'              // cliente nuevo o con muy pocas ventas
  | 'vencida-dentro-de-lo-habitual'
  | 'vencida-mas-de-lo-habitual';

export type ActionType =
  | 'cobrar'
  | 'abono-parcial'
  | 'confirmar-fecha'
  | 'renegociar-pago'
  | 'pedir-plazo'
  | 'confirmar-saldo'
  | 'confirmar-compromiso';

/* ───────────────────────── Entrada ───────────────────────── */

/** Un bolsillo («Mis cuentas»), tal como lo devuelve `GET /v2/banks/:id/projection`. */
export interface PocketBalance {
  bankId: string;
  name: string;
  storedLedgerBalance: number;
  projectedBalance: number;
  alignmentDelta: number;
}

/** Comportamiento de pago del cliente en los últimos meses dentro de Necta. */
export interface CounterpartyHistory {
  salesCount: number;   // ventas a crédito con desenlace conocido
  onTimeRate: number;   // 0..1, proporción pagada a tiempo
  avgDaysLate: number;  // promedio de días de atraso cuando se atrasa
}

/** Señal agregada de la red Necta sobre la misma entidad (Punto 5). Nunca contiene datos de un tercero identificable. */
export interface CommunitySignal {
  independentMerchants: number;        // comercios independientes que le venden
  entityResolutionConfidence: number;  // 0..1: NIT/teléfono/ciudad > nombre libre
  avgDaysLate?: number;                // agregado, opcional
  onTimeRate?: number;                 // agregado, opcional
}

export interface ReceivableInput {
  id: string;
  counterpartyName: string;
  totalAmount: number;
  pendingAmount: number;
  creditDueBy: ISODate;
  history: CounterpartyHistory;
  communitySignal?: CommunitySignal;
}

export interface PayableInput {
  id: string;
  counterpartyName: string;
  amount: number;
  dueDate: ISODate;
}

export type CommitmentSource = 'confirmado-por-usuaria' | 'dictado-por-voz' | 'sugerido-por-patron';

/** Compromiso fijo que Necta no conoce como cuenta por pagar (nómina, arriendo…). */
export interface CommitmentInput {
  id: string;
  label: string;
  amount: number;
  dueDate: ISODate;
  recurrence?: 'unica' | 'quincenal' | 'mensual';
  source: CommitmentSource;
  confirmed: boolean;
}

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * Ritmo operativo: ventas de contado típicas por día de la semana (0 = cerrado), gastos de contado
 * por día abierto, subida de quincena y qué fracción de sus movimientos registra la dueña en Necta.
 */
export interface OperatingRhythmInput {
  cashSalesByWeekday: Record<WeekdayKey, number>;
  pettyExpensesPerOpenDay: number;
  quincenaBoost?: number;       // 0..1; por defecto 0,3
  recordedShare: number;        // 0..1; Carmen registra el 20–30 % → 0,25
  source?: 'declarado' | 'historial';
}

export interface ForecastInput {
  storeId: string;
  asOf: ISODate;
  horizonDays?: number;
  timeZone?: string;
  currency?: string;
  pockets: PocketBalance[];
  receivables: ReceivableInput[];
  payables: PayableInput[];
  commitments: CommitmentInput[];
  operatingRhythm: OperatingRhythmInput;
}

/* ───────────────────────── Salida ───────────────────────── */

export interface ScenarioValues<T = number> {
  prudente: T;
  probable: T;
  favorable: T;
}

export interface DayEvent {
  kind: 'cobro' | 'pago-proveedor' | 'compromiso';
  refId: string;
  label: string;
  phrase: string;           // cómo se nombra en una frase: «pagarle a X», «el arriendo de la bodega»
  amount: number;
  scenarios: ScenarioKey[];
}

export interface DayProjection {
  date: ISODate;
  dayIndex: number;         // 1..horizonDays
  label: string;            // «vie 29 may»
  startBalance: ScenarioValues; // saldo con el que amanece (cierre del día anterior)
  operatingNet: ScenarioValues;
  inflows: ScenarioValues;
  outflows: ScenarioValues;
  balance: ScenarioValues;  // saldo al cierre del día: amanece + entradas − salidas
  pendingToConfirm: number; // «plata por confirmar» = cierre probable − cierre prudente
  events: DayEvent[];
}

export interface GapPoint {
  date: ISODate;
  label: string;
  amount: number;       // cuánto falta ese día (positivo)
  triggers: string[];   // pagos que caen ese día
  phrase: string;       // «pagarle a X y el arriendo de la bodega»
}

/** Un día de pago que solo se cubre si un cobro concreto llega a tiempo. */
export interface Hinge {
  date: ISODate;
  label: string;
  receivableId: string;
  counterpartyName: string;
  amount: number;
  countedDate: ISODate;
  balanceWith: number;
  balanceWithout: number;
}

export interface ReceivableAssessment {
  id: string;
  counterpartyName: string;
  pendingAmount: number;
  creditDueBy: ISODate;
  daysOverdue: number;
  bucket: ReceivableBucket;
  probabilityInHorizon: number;
  expectedDate: ISODate | null;
  expectedWindow: { from: ISODate; to: ISODate } | null;
  countedDate: ScenarioValues<ISODate | null>;
  includedIn: ScenarioKey[];
  communitySignal: { used: boolean; reason: string };
  explanation: string;
}

export interface OperatingDay {
  date: ISODate;
  weekday: WeekdayKey;
  open: boolean;
  quincenaWeek: boolean;
  cashSales: ScenarioValues;
  expenses: number;
  net: ScenarioValues;
}

export interface OperatingRhythmAssessment {
  recordedShare: number;
  quincenaBoost: number;
  prudentSalesFactor: number;
  openDays: number;
  days: OperatingDay[];
  totals: ScenarioValues;
  note: string;
}

export interface CertaintyFactor {
  code: 'registro-parcial' | 'descuadre' | 'clientes-con-poco-historial' | 'compromisos-sin-confirmar' | 'sin-compromisos-capturados';
  label: string;
  penalty: number;
}

export interface CertaintyAssessment {
  level: CertaintyLevel;
  label: string;
  score: number;
  factors: CertaintyFactor[];
  /** Qué pasaría con la certeza si Carmen confirma hoy los datos confirmables (saldo, fechas, compromisos). */
  ifConfirmed: { score: number; level: CertaintyLevel; note: string } | null;
}

export interface ActionScoreFactors {
  gapCovered: number;
  probability: number;
  urgency: number;
  breadth: number;
}

export interface RecommendedAction {
  rank: number;
  type: ActionType;
  title: string;
  why: string;
  effect: string;
  counterpartyName: string | null;
  refId: string | null;
  amount: number;
  deadline: ISODate;
  deadlineLabel: string;
  channel: 'whatsapp' | 'app';
  deepLink: string;
  whatsappDraft: string | null;
  score: number;
  factors: ActionScoreFactors;
  /** Para acciones que confirman un dato: certeza resultante si se confirma. */
  certaintyAfter: { score: number; level: CertaintyLevel } | null;
}

export interface OutflowSummary {
  id: string;
  kind: 'pago-proveedor' | 'compromiso';
  label: string;
  amount: number;
  dueDate: ISODate;
  source: 'registrado' | CommitmentSource;
  confirmed: boolean;
  scenarios: ScenarioKey[];
}

export interface ForecastResponse {
  storeId: string;
  asOf: ISODate;
  horizonDays: number;
  horizonStart: ISODate;
  horizonEnd: ISODate;
  currency: string;
  timeZone: string;
  rulesVersion: string;
  computedAt: string;
  openingBalance: {
    storedLedgerBalance: number;
    projectedBalance: number;
    alignmentDelta: number;
    basis: ScenarioValues<'storedLedgerBalance' | 'projectedBalance'>;
    opening: ScenarioValues;
    pockets: PocketBalance[];
    note: string;
  };
  verdict: {
    status: 'faltante' | 'ajustado' | 'cubierto';
    headline: string;
    detail: string;
    firstGap: GapPoint | null;
    worstGap: GapPoint | null;
    /** «Muro»: los 4 días consecutivos del horizonte con más salidas. */
    criticalWindow: { from: ISODate; to: ISODate; label: string; outflows: number } | null;
    /** Días de pago que solo se cubren si un cobro concreto llega a tiempo. */
    hinges: Hinge[];
    endOfHorizon: ScenarioValues;
    totalInflows: ScenarioValues;
    totalOutflows: ScenarioValues;
    receivablesNominal: number;
  };
  certainty: CertaintyAssessment;
  operatingRhythm: OperatingRhythmAssessment;
  receivables: ReceivableAssessment[];
  outflows: OutflowSummary[];
  days: DayProjection[];
  actions: RecommendedAction[];
  mobile: {
    headline: string;
    certainty: string;
    actions: string[];
  };
}

export function scenarioValues<T>(build: (scenario: ScenarioKey) => T): ScenarioValues<T> {
  return { prudente: build('prudente'), probable: build('probable'), favorable: build('favorable') };
}
