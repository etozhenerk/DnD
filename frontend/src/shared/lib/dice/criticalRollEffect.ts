import {parseDiceExpression} from './diceExpression';

export type CriticalRollResult = 1 | 20;

export interface CriticalRollEffectEvent {
  id: number;
  result: CriticalRollResult;
}

export const CRITICAL_ROLL_EFFECT_DURATION_MS = 2600;
let criticalRollSequence = 0;
let activeEffect: CriticalRollEffectEvent | null = null;
let completionTimer: number | undefined;
const listeners = new Set<() => void>();

export const getCriticalRollEffect = () => activeEffect;
export const getServerCriticalRollEffect = () => null;

export function subscribeToCriticalRollEffect(listener: () => void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}

export function isNaturalD20Expression(expression: string) {
  const parsed = parseDiceExpression(expression);
  return parsed?.count === 1 && parsed.sides === 20 && parsed.modifier === 0;
}

export function triggerCriticalRollEffect(result: number, expression = '1d20') {
  if (
    typeof window === 'undefined'
    || !isNaturalD20Expression(expression)
    || (result !== 1 && result !== 20)
  ) return;

  criticalRollSequence += 1;
  window.clearTimeout(completionTimer);
  activeEffect = {id: criticalRollSequence, result};
  listeners.forEach((listener) => listener());
  completionTimer = window.setTimeout(() => {
    activeEffect = null;
    completionTimer = undefined;
    listeners.forEach((listener) => listener());
  }, CRITICAL_ROLL_EFFECT_DURATION_MS);
}
