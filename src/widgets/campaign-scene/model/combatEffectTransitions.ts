import type {CombatEffectView} from '../../../entities/combat/model/view';

export interface CombatEffectTransition {
  effect: CombatEffectView;
  phase: 'applied';
}

export function isAnimatedCombatEffect(effect: CombatEffectView) {
  return !effect.passive && !['guest-turn', 'summon-turns', 'breakable-object'].includes(effect.id);
}

export function getCombatEffectTransitions(previous: readonly CombatEffectView[], current: readonly CombatEffectView[]): CombatEffectTransition[] {
  const before = new Map(previous.map((effect) => [effect.id, effect]));
  // Expiry, charge counters and passive readiness are not new combat applications.
  return current.filter((effect) => isAnimatedCombatEffect(effect) && !before.has(effect.id))
    .map((effect) => ({effect, phase: 'applied'}));
}
