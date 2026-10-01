export function formatSignedNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value < 0) return '−' + Math.abs(value);
  return value > 0 ? '+' + value : String(value);
}
