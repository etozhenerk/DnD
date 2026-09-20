import {getRawDicePoolRange, parseDicePoolExpression} from './diceExpression';

export type DiceSelectionMode = 'sum' | 'highest' | 'lowest';

export interface DiceSelectionResult {
  value: number;
  rolls: number[];
}

export function resolveDiceSelection(
  values: number[],
  diceExpression: string,
  mode: DiceSelectionMode = 'sum',
): DiceSelectionResult | null {
  const dice = parseDicePoolExpression(diceExpression);
  if (!dice || values.some((value) => !Number.isInteger(value))) return null;
  if (mode !== 'sum') {
    const naturalD20 = dice.length === 1
      && dice[0].count === 1
      && dice[0].sides === 20
      && dice[0].modifier === 0;
    if (!naturalD20 || values.length !== 2 || values.some((value) => value < 1 || value > 20)) return null;
    return {
      value: mode === 'highest' ? Math.max(...values) : Math.min(...values),
      rolls: values,
    };
  }
  const value = values.reduce((sum, roll) => sum + roll, 0);
  const range = getRawDicePoolRange(dice);
  return Number.isInteger(value) && value >= range.min && value <= range.max
    ? {value, rolls: values}
    : null;
}
