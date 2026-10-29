/** Hora en formato de la app («7:02 a. m.») para la zona de la tienda. */
export function formatHour(date: Date, timeZone = 'America/Bogota'): string {
  const parts = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const period = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toLowerCase().includes('p') ? 'p. m.' : 'a. m.';
  return `${h}:${m} ${period}`;
}
export function newMutationId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
