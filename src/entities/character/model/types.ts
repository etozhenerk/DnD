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
  stats: Record<'strength' | 'dexterity' | 'constitution' | 'wisdom' | 'intelligence' | 'charisma', number>;
  story: string;
  motivation: string;
  abilities: {id: string; name: string; description: string; effect: string}[];
  items: {id: string; name: string; effect: string}[];
}
