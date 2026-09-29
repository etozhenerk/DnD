export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
}

export interface DamageRoll extends DiceExpression {
  multiplier: 1 | 2;
}

const diceExpressionPattern = /^(\d+)d(\d+)(?:([+-])(\d+))?$/iu;

export function parseDiceExpression(expression: string): DiceExpression | null {
  const match = expression.trim().match(diceExpressionPattern);
  if (!match) return null;

  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifierMagnitude = Number(match[4] ?? 0);
  const modifier = match[3] === '-' ? -modifierMagnitude : modifierMagnitude;
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(sides) || count < 1 || sides < 2) return null;

  return {count, sides, modifier};
}

export function formatDiceExpression(expression: DiceExpression, includeModifier = true) {
  const base = `${expression.count}d${expression.sides}`;
  if (!includeModifier || expression.modifier === 0) return base;
  return `${base}${expression.modifier > 0 ? '+' : ''}${expression.modifier}`;
}

export function getRawDiceRange(expression: DiceExpression) {
  return {
    min: expression.count,
    max: expression.count * expression.sides,
  };
}

export function parseDicePoolExpression(expression: string) {
  const dice = expression
    .split(/\s*\+\s*/u)
    .map((part) => parseDiceExpression(part));
  if (!dice.length || dice.some((part) => !part || part.modifier !== 0)) return null;
  return dice as DiceExpression[];
}

export function formatDicePoolExpression(dice: DiceExpression[]) {
  return dice.map((part) => formatDiceExpression(part, false)).join(' + ');
}

export function getRawDicePoolRange(dice: DiceExpression[]) {
  return dice.reduce((range, part) => {
    const partRange = getRawDiceRange(part);
    return {
      min: range.min + partRange.min,
      max: range.max + partRange.max,
    };
  }, {min: 0, max: 0});
}

export function getDamageRoll(expression: string, critical = false): DamageRoll | null {
  const parsed = parseDiceExpression(expression);
  if (!parsed) return null;
  return {
    ...parsed,
    multiplier: critical ? 2 : 1,
  };
}

export function resolveDamageTotal(expression: DiceExpression & {multiplier?: 1 | 2}, rawDiceTotal: number) {
  const range = getRawDiceRange(expression);
  if (!Number.isInteger(rawDiceTotal) || rawDiceTotal < range.min || rawDiceTotal > range.max) return null;
  return Math.max(0, rawDiceTotal + expression.modifier) * (expression.multiplier ?? 1);
}

export function formatDamageCalculation(rawDiceTotal: number, modifier: number, critical = false) {
  const sum = `${rawDiceTotal}${modifier === 0 ? '' : ` ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)}`}`;
  return critical ? `(${sum}) × 2` : sum;
}
