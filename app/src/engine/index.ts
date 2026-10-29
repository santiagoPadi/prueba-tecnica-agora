export { buildForecast } from './engine';
export { carmenForecastInput, CARMEN_STORE_ID } from './fixtures/carmen';
export { formatCOP } from './domain/money';
export { addDays, formatDayLong, formatDayShort, isValidISODate } from './domain/dates';
export { RULES, RULES_VERSION } from './domain/rules';
export type { ForecastInput, ForecastResponse, RecommendedAction, DayProjection, ReceivableAssessment, ISODate, ScenarioKey } from './domain/types';
