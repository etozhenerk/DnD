export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
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

export function getDamageRoll(expression: string, critical = false) {
  const parsed = parseDiceExpression(expression);
  if (!parsed) return null;
  return {
    ...parsed,
    count: parsed.count * (critical ? 2 : 1),
  };
}

export function resolveDamageTotal(expression: DiceExpression, rawDiceTotal: number) {
  const range = getRawDiceRange(expression);
  if (!Number.isInteger(rawDiceTotal) || rawDiceTotal < range.min || rawDiceTotal > range.max) return null;
  return Math.max(0, rawDiceTotal + expression.modifier);
}
