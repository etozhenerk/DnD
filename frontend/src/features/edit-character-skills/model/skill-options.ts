import {abilityRules, getProfileLabel} from '../../../entities/character-form';
import {getAttributeLabel} from '../../../entities/character';

export const modifierOptions = abilityRules.modifierStats.map((id) => ({value: id, label: getAttributeLabel(id)}));

export function getProfileOptions(kind: string, selectedIds: readonly string[], currentId: string) {
  return [
    {value: '', label: 'Выберите профиль'},
    ...abilityRules.profiles.filter((profile) => profile.kind === kind).map((profile) => ({
      value: profile.id, label: getProfileLabel(profile.id),
      disabled: selectedIds.includes(profile.id) && profile.id !== currentId,
    })),
  ];
}

export function getSkillKind(profileId: string): string {
  return abilityRules.profiles.find((profile) => profile.id === profileId)?.kind ?? 'damage';
}
