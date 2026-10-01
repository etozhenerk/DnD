import type {CharacterAppearance} from './appearance';

export type BasicAction = {name: string; description: string; modifierStat: string};
export type CustomAbility = BasicAction & {id: string; profileId: string};
export type NarrativeAbility = {id: string; name: string; description: string};
export type CharacterSkills = {
  basicAction: BasicAction;
  items: CustomAbility[];
  narrativeItems: NarrativeAbility[];
};
export type EquipmentItem = {id: string; name: string; description: string};
export type CharacterFormData = {
  appearance?: CharacterAppearance;
  race?: {raceId: string};
  class?: {classId: string};
  attributes?: Record<string, number>;
  abilities?: CharacterSkills;
  equipment?: {items: EquipmentItem[]};
};
export type EditableSection = Exclude<keyof CharacterFormData, 'appearance'>;
