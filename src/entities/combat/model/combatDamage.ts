import {getFirstCombatStatus} from './combatStatus';
import type {CombatDamageType, CombatEventInput, CombatState} from './types';

/** Apply these after the saving throw and before temporary HP / survival in the reducer. */
export function mitigateCombatDamage(combat: CombatState, targetId: string, type: CombatDamageType | undefined, damage: number) {
  const resistant = type === 'cold' ? getFirstCombatStatus(combat, targetId, 'cold-resistance')
    : type === 'poison' ? getFirstCombatStatus(combat, targetId, 'poison-resistance') : undefined;
  const armour = type === 'cold' && getFirstCombatStatus(combat, targetId, 'dragonborn-armour');
  const resisted = resistant ? Math.floor(damage / 2) : damage;
  return {
    amount: Math.max(0, resisted - (armour ? 1 : 0)),
    explanation: [resistant ? `сопротивление поглощает ${damage - resisted}` : '',
      armour ? 'драконорождённая броня поглощает 1' : ''].filter(Boolean).join('; '),
  };
}

export function createColdHitReactions(combat: CombatState, targetId: string, type: CombatDamageType | undefined, amount: number): CombatEventInput[] {
  const reactor = type === 'cold' && getFirstCombatStatus(combat, targetId, 'heat-reactor');
  if (!reactor || amount <= 0) return [];
  const heat = getFirstCombatStatus(combat, targetId, 'heat-charge');
  const next = Math.min(4, (heat?.amount ?? 0) + 2);
  if (next === heat?.amount) return [];
  return [{type: 'combat-status-applied', status: {
    id: heat?.id ?? `${targetId}-heat-charge`, kind: 'heat-charge', sourceActorId: reactor.sourceActorId,
    targetId, charges: 1, amount: next,
  }, text: `Холод разжигает внутренний огонь: следующая огненная атака получает +${next} урона.`}];
}
