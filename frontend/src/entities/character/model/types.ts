interface AbilityUses {
  scope: 'turn' | 'round' | 'battle' | 'location' | 'campaign';
  max: number;
}

export interface CharacterAbility {
  id: string;
  name: string;
  description: string;
  trigger?: string;
  check?: string;
  effect: string;
  uses?: AbilityUses | null;
}

export interface CharacterItem {
  id: string;
  name: string;
  description?: string;
  effect: string;
  charges?: number | AbilityUses | null;
}

export interface Character {
  id: string;
  name: string;
  pronouns?: string;
  race: string;
  role: string;
  hp: number;
  maxHp: number;
  ac: number;
  visual: {portrait: string; status: string; raceConceptIds: string[]; alt: string};
  raceHistory?: {raceConceptId: string; displayName: string; status: 'former'; note: string}[];
  stats: Record<'strength' | 'dexterity' | 'constitution' | 'wisdom' | 'intelligence' | 'charisma', number>;
  story: string;
  motivation: string;
  abilities: CharacterAbility[];
  items: CharacterItem[];
}
