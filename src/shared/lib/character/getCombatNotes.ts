import type {Character} from '../../../entities/character/model/types';

const combatPattern = /атака\s*\+|\d+d\d|урон\s+\d/i;

export interface CombatNote {
  id: string;
  name: string;
  effect: string;
}

export function getCombatNotes(character: Character): CombatNote[] {
  const itemNotes = character.items
    .filter((item) => combatPattern.test(item.effect))
    .map((item) => ({id: item.id, name: item.name, effect: item.effect}));

  const abilityNotes = character.abilities
    .filter((ability) => ability.trigger === 'attack' || combatPattern.test(ability.effect))
    .map((ability) => ({id: ability.id, name: ability.name, effect: ability.effect}));

  return [...itemNotes, ...abilityNotes].slice(0, 3);
}
