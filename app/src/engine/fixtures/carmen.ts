import type { ForecastInput } from '../domain/types';

export const CARMEN_STORE_ID = 'store_limpia_ya';

/**
 * Datos EXACTOS del caso de la prueba técnica (Pruebas técnicas.pdf): Carmen Ortiz, «Limpia Ya»,
 * Barranquilla. Es lunes 25 (de mayo de 2026, según las fechas del anexo). Horizonte: 25 may – 7 jun.
 *
 * Supuestos explícitos (el caso no los dice):
 *  - «Otras 9 tiendas, 850.000 en las próximas dos semanas, 22 de 31 a tiempo» se modela en dos
 *    tramos iguales (viernes 29 y viernes 5) con atraso medio de 7 días cuando se atrasan.
 *  - La cuota del préstamo (650.000 el día 10) cae fuera de los 14 días: se registra como compromiso
 *    para que el motor la vea en cuanto el horizonte la alcance.
 *  - Los clientes que pagan «6 de 6» o «4 de 4» a tiempo llevan atraso medio 0.
 *  - Ayudantes y arriendo entran como compromisos confirmados por Carmen (chips de 1 toque).
 */
export function carmenForecastInput(): ForecastInput {
  return {
    storeId: CARMEN_STORE_ID,
    asOf: '2026-05-25',
    horizonDays: 14,
    timeZone: 'America/Bogota',
    currency: 'COP',
    pockets: [
      { bankId: 'bank_caja', name: 'Caja', storedLedgerBalance: 1_300_000, projectedBalance: 1_040_000, alignmentDelta: 260_000 },
      { bankId: 'bank_banco', name: 'Banco', storedLedgerBalance: 600_000, projectedBalance: 600_000, alignmentDelta: 0 },
    ],
    receivables: [
      { id: 'rec_hotel_brisas', counterpartyName: 'Hotel Brisas', totalAmount: 2_100_000, pendingAmount: 2_100_000, creditDueBy: '2026-05-28', history: { salesCount: 6, onTimeRate: 1, avgDaysLate: 0 } },
      { id: 'rec_minimercado_sol', counterpartyName: 'Minimercado Sol', totalAmount: 1_200_000, pendingAmount: 1_200_000, creditDueBy: '2026-05-05', history: { salesCount: 4, onTimeRate: 0.25, avgDaysLate: 18 } },
      { id: 'rec_tienda_la_esquina', counterpartyName: 'Tienda La Esquina', totalAmount: 850_000, pendingAmount: 850_000, creditDueBy: '2026-05-26', history: { salesCount: 5, onTimeRate: 0.4, avgDaysLate: 12 } },
      { id: 'rec_tienda_dona_fina', counterpartyName: 'Tienda Doña Fina', totalAmount: 600_000, pendingAmount: 600_000, creditDueBy: '2026-05-29', history: { salesCount: 4, onTimeRate: 1, avgDaysLate: 0 } },
      { id: 'rec_otras_tiendas_semana_1', counterpartyName: 'las otras 9 tiendas (primera semana)', totalAmount: 425_000, pendingAmount: 425_000, creditDueBy: '2026-05-29', history: { salesCount: 31, onTimeRate: 22 / 31, avgDaysLate: 7 } },
      { id: 'rec_otras_tiendas_semana_2', counterpartyName: 'las otras 9 tiendas (segunda semana)', totalAmount: 425_000, pendingAmount: 425_000, creditDueBy: '2026-06-05', history: { salesCount: 31, onTimeRate: 22 / 31, avgDaysLate: 7 } },
    ],
    payables: [
      { id: 'pay_proveedor_principal', counterpartyName: 'tu proveedor principal', amount: 4_200_000, dueDate: '2026-05-29' },
    ],
    commitments: [
      { id: 'cmt_ayudantes_quincena', label: 'el pago de tus ayudantes', amount: 1_400_000, dueDate: '2026-05-30', recurrence: 'quincenal', source: 'confirmado-por-usuaria', confirmed: true },
      { id: 'cmt_arriendo_bodega', label: 'el arriendo de la bodega', amount: 1_300_000, dueDate: '2026-06-01', recurrence: 'mensual', source: 'confirmado-por-usuaria', confirmed: true },
      { id: 'cmt_cuota_prestamo', label: 'la cuota del préstamo', amount: 650_000, dueDate: '2026-06-10', recurrence: 'mensual', source: 'confirmado-por-usuaria', confirmed: true },
    ],
    operatingRhythm: {
      cashSalesByWeekday: { mon: 260_000, tue: 260_000, wed: 260_000, thu: 260_000, fri: 520_000, sat: 520_000, sun: 0 },
      pettyExpensesPerOpenDay: 90_000,
      quincenaBoost: 0.3,
      recordedShare: 0.25, // registra el 20–30 % de sus movimientos
      source: 'declarado',
    },
  };
}
