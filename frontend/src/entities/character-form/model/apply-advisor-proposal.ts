import type {CharacterFormData} from './build-types';

// The transport supplies a validated full idea; only the requested part is applied.
export function applyAdvisorProposal(current: CharacterFormData, idea: CharacterFormData, target?: string): CharacterFormData {
  if (!target) return idea;
  if (target === 'name') {
    if (!idea.appearance) return current;
    return {...current, appearance: {...(current.appearance ?? idea.appearance), displayName: idea.appearance.displayName}};
  }
  if (target === 'class') return {...current, class: idea.class, attributes: idea.attributes};
  if (target === 'appearance') return {...current, appearance: idea.appearance};
  if (target === 'race') return {...current, race: idea.race};
  if (target === 'abilities') return {...current, abilities: idea.abilities};
  if (target === 'equipment') return {...current, equipment: idea.equipment};
  return current;
}
