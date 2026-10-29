/** Formato colombiano sin depender de ICU: `$1.234.567`, `-$136.000`. */
export function formatCOP(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const digits = String(rounded);
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${amount < 0 ? '-' : ''}$${grouped}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
