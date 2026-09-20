const romanDigits: Array<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function formatCombatantIndex(value: number) {
  if (!Number.isInteger(value) || value < 1) return String(value);
  let remainder = value;
  let result = '';
  romanDigits.forEach(([amount, glyph]) => {
    while (remainder >= amount) {
      result += glyph;
      remainder -= amount;
    }
  });
  return result;
}

export function getCombatantIndexLabel(name: string) {
  const suffix = name.match(/\b([IVX]+|\d+)$/u)?.[1];
  if (!suffix) return undefined;
  return /^\d+$/u.test(suffix) ? formatCombatantIndex(Number(suffix)) : suffix;
}
