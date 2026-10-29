import { addDays, formatDayLong, formatDayShort, maxDate, type ISODate } from './dates';
import {
  SCENARIOS,
  scenarioValues,
  type CommitmentInput,
  type DayEvent,
  type DayProjection,
  type GapPoint,
  type PayableInput,
  type ReceivableAssessment,
  type ScenarioKey,
  type ScenarioValues,
} from './types';

export interface SimulationInput {
  asOf: ISODate;
  horizonDays: number;
  opening: ScenarioValues;
  operatingNetByDay: ScenarioValues[];   // neto operativo de cada día del horizonte
  receivables: ReceivableAssessment[];
  payables: PayableInput[];
  commitments: CommitmentInput[];
}

export interface SimulationResult {
  horizonStart: ISODate;
  horizonEnd: ISODate;
  days: DayProjection[];
  end: ScenarioValues;
  min: ScenarioValues<{ date: ISODate; balance: number }>;
  firstGap: ScenarioValues<GapPoint | null>;
  worstGap: ScenarioValues<GapPoint | null>;
  totals: {
    receivablesNominal: number;
    inflows: ScenarioValues;
    outflows: ScenarioValues;
    payables: number;
    confirmedCommitments: number;
    unconfirmedCommitments: number;
  };
}

/** Primer día en o después de `from` con cierre prudente negativo. */
export function gapOnOrAfter(sim: SimulationResult, from: ISODate): GapPoint | null {
  const day = sim.days.find((d) => d.date >= from && d.balance.prudente < 0);
  return day ? gapPoint(day.date, -day.balance.prudente, day.events, 'prudente') : null;
}

/** Un compromiso sin confirmar se descuenta en prudente y probable, nunca en favorable. */
export function commitmentScenarios(c: CommitmentInput): ScenarioKey[] {
  return c.confirmed ? [...SCENARIOS] : ['prudente', 'probable'];
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

function joinPhrases(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export function gapPoint(date: ISODate, amount: number, events: DayEvent[], scenario: ScenarioKey): GapPoint {
  const outflows = events.filter((e) => e.kind !== 'cobro' && e.scenarios.includes(scenario));
  return {
    date,
    label: formatDayLong(date),
    amount,
    triggers: outflows.map((e) => e.label),
    phrase: joinPhrases(outflows.map((e) => e.phrase)),
  };
}

/**
 * Simulación día a día (Punto 1): saldo de cierre = saldo anterior + neto operativo
 * + cobros contados ese día − pagos y compromisos del día. Nunca «suma todo al día uno».
 * Convención de cierre: el neto del día se acredita al cierre de ese mismo día (hoy incluido)
 * y los pagos del día se descuentan en el mismo cierre; `startBalance` conserva el saldo con
 * el que amanece por si el pago se hace antes de vender.
 */
export function simulate(input: SimulationInput): SimulationResult {
  const horizonStart = input.asOf;
  const horizonEnd = addDays(input.asOf, input.horizonDays - 1);
  const balance: ScenarioValues = { ...input.opening };
  const min = scenarioValues(() => ({ date: horizonStart, balance: Number.POSITIVE_INFINITY }));
  const firstGap = scenarioValues<GapPoint | null>(() => null);
  const worstGap = scenarioValues<GapPoint | null>(() => null);
  const totalIn = scenarioValues(() => 0);
  const totalOut = scenarioValues(() => 0);
  const days: DayProjection[] = [];

  for (let i = 0; i < input.horizonDays; i += 1) {
    const date = addDays(input.asOf, i);
    const events: DayEvent[] = [];

    for (const r of input.receivables) {
      const scenarios = SCENARIOS.filter((s) => r.countedDate[s] === date);
      if (scenarios.length > 0) events.push({ kind: 'cobro', refId: r.id, label: r.counterpartyName, phrase: r.counterpartyName, amount: r.pendingAmount, scenarios });
    }
    for (const p of input.payables) {
      if (maxDate(p.dueDate, input.asOf) === date) events.push({ kind: 'pago-proveedor', refId: p.id, label: p.counterpartyName, phrase: `pagarle a ${p.counterpartyName}`, amount: p.amount, scenarios: [...SCENARIOS] });
    }
    for (const c of input.commitments) {
      if (maxDate(c.dueDate, input.asOf) === date) events.push({ kind: 'compromiso', refId: c.id, label: c.label, phrase: c.label, amount: c.amount, scenarios: commitmentScenarios(c) });
    }

    const startBalance: ScenarioValues = { ...balance };
    const operatingNet = input.operatingNetByDay[i] ?? { prudente: 0, probable: 0, favorable: 0 };
    const inflows = scenarioValues((s) => operatingNet[s] + sum(events.filter((e) => e.kind === 'cobro' && e.scenarios.includes(s)).map((e) => e.amount)));
    const outflows = scenarioValues((s) => sum(events.filter((e) => e.kind !== 'cobro' && e.scenarios.includes(s)).map((e) => e.amount)));

    for (const s of SCENARIOS) {
      balance[s] = Math.round(balance[s] + inflows[s] - outflows[s]);
      totalIn[s] += inflows[s];
      totalOut[s] += outflows[s];
      if (balance[s] < min[s].balance) min[s] = { date, balance: balance[s] };
      if (balance[s] < 0) {
        const gap = gapPoint(date, -balance[s], events, s);
        if (firstGap[s] === null) firstGap[s] = gap;
        const worst = worstGap[s];
        if (worst === null || gap.amount > worst.amount) worstGap[s] = gap;
      }
    }

    days.push({
      date,
      dayIndex: i + 1,
      label: formatDayShort(date),
      startBalance,
      operatingNet: { ...operatingNet },
      inflows,
      outflows,
      balance: { ...balance },
      pendingToConfirm: balance.probable - balance.prudente,
      events,
    });
  }

  const inHorizon = (due: ISODate): boolean => maxDate(due, input.asOf) <= horizonEnd;

  return {
    horizonStart,
    horizonEnd,
    days,
    end: { ...balance },
    min,
    firstGap,
    worstGap,
    totals: {
      receivablesNominal: sum(input.receivables.map((r) => r.pendingAmount)),
      inflows: totalIn,
      outflows: totalOut,
      payables: sum(input.payables.filter((p) => inHorizon(p.dueDate)).map((p) => p.amount)),
      confirmedCommitments: sum(input.commitments.filter((c) => c.confirmed && inHorizon(c.dueDate)).map((c) => c.amount)),
      unconfirmedCommitments: sum(input.commitments.filter((c) => !c.confirmed && inHorizon(c.dueDate)).map((c) => c.amount)),
    },
  };
}
