import {useState} from 'react';
import {rollDie} from '../../../shared/lib/dice/rollDie';

export interface DiceResult {
  sides: number;
  value: number;
}

export function useDiceRoll() {
  const [result, setResult] = useState<DiceResult | null>(null);

  return {
    result,
    roll: (sides: number) => setResult({sides, value: rollDie(sides)}),
  };
}
