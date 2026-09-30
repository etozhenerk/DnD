export type CharacterSummary = {
  id: string;
  displayName: string;
  raceId: string;
  classId: string;
  maxHp: number;
  baseAc: number;
  createdAt: string;
};

export type CreatedCharacterAbility = {
  id: string;
  name: string;
  description: string;
  effectText: string;
  uses: {scope: string; max: number} | null;
};

export type CreatedCharacterItem = {
  id: string;
  name: string;
  description: string;
  effectText: string;
  charges: {scope: string; max: number} | null;
};

export type CreatedCharacter = CharacterSummary & {
  pronouns: string;
  roleLabel: string;
  story: string;
  motivation: string;
  appearance: string;
  personality: string[];
  attributes: Record<string, number>;
  abilities: CreatedCharacterAbility[];
  equipment: CreatedCharacterItem[];
  rulesetId: string;
};

export type CreatorCatalog = {
  rulesetId: string;
  races: {id: string; name: string}[];
  classes: {id: string; name: string}[];
};
