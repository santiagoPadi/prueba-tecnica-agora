/**
 * Reglas de negocio versionadas del motor. Todo número que influye en el
 * pronóstico vive aquí para que cada respuesta sea auditable: la respuesta
 * devuelve `rulesVersion` y un cambio de constante obliga a subir la versión.
 */
export const RULES_VERSION = '2026.05.r2';

export const RULES = {
  horizonDaysDefault: 14,
  maxHorizonDays: 60,

  /** Cobros */
  minHistoryForProfile: 3,          // ventas previas necesarias para confiar en el perfil individual
  reliableOnTimeRate: 0.75,         // puntualidad mínima para el perfil «confiable»
  pSafeThreshold: 0.8,              // el escenario prudente solo cuenta cobros con p ≥ 0.8
  pProbableThreshold: 0.5,          // el escenario probable cuenta cobros con p ≥ 0.5
  pShortHistory: 0.5,               // probabilidad base de un cliente con poco historial
  pOverdueWithinTypical: 0.6,       // vencida pero dentro de su atraso habitual
  pOverdueBeyondTypical: 0.25,      // vencida más allá de su atraso habitual (cobro completo)
  pPartialWhenBeyondTypical: 0.5,   // probabilidad de lograr un abono parcial
  partialPaymentShare: 0.5,         // abono parcial sugerido: 50 % del pendiente
  overdueFavorableLagDays: 3,       // en el escenario favorable una vencida entra 3 días después de gestionarla
  outsideHorizonPenalty: 0.5,       // si la fecha esperada cae fuera del horizonte, p se reduce a la mitad

  /** Señal comunitaria (Punto 5) */
  communityMinMerchants: 3,         // K-anonimato: mínimo de comercios independientes
  communityMinEntityConfidence: 0.8,// resolución de entidad (NIT/teléfono/ciudad), no solo el nombre
  communityPriorWeight: 3,          // peso del prior: w_propio = n / (n + 3)

  /** Ritmo operativo */
  prudentSalesFactor: 0.8,          // la plata segura cuenta el 80 % de las ventas de contado típicas
  quincenaBoostDefault: 0.3,        // +30 % en semanas de quincena (la que contiene el 15 o el 30)
  criticalWindowDays: 4,            // «muro»: los 4 días consecutivos con más salidas

  /** Acciones */
  renegotiateSuccessProbability: 0.5,
  askExtensionSuccessProbability: 0.5, // «pedir plazo por si acaso» cuando un día depende de un solo cobro
  confirmBalanceSuccessProbability: 0.5,
  actionBreadthWeight: 0.1,         // desempate por amplitud del impacto en el hueco máximo
  actionUrgencyFloor: 0.1,
  maxMobileActions: 3,

  /** Certeza */
  certaintyAltaMin: 0.7,
  certaintyMediaMin: 0.4,
  certaintyCoverageWeight: 0.5,     // penalización por la fracción de movimientos que no se registra en Necta
  certaintyDeltaCap: 0.3,           // penalización máxima por descuadre
  certaintyShortHistoryWeight: 0.4, // penalización por plata esperada de clientes con poco historial
  certaintyUnconfirmedWeight: 0.5,  // penalización por compromisos sin confirmar
  certaintyNoCommitmentsPenalty: 0.2, // penalización fija si la tienda no tiene ningún pago fijo anotado

  /** Veredicto */
  coveredMarginShare: 0.1,          // «cubierto» si el mínimo prudente supera el 10 % de las salidas
} as const;
