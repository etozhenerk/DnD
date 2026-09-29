export type RaceStatus = 'playable' | 'encountered';

export interface RaceFeature {
  name: string;
  effect: string;
}

export interface Race {
  id: string;
  name: string;
  status: RaceStatus;
  description: string;
  feature?: RaceFeature;
  source?: string;
}

export interface RaceConcept {
  id: string;
  path: string;
  status: string;
  note?: string;
}

export type RaceAppearanceKind = 'hero' | 'history' | 'npc' | 'enemy';

export interface RaceAppearance {
  id: string;
  name: string;
  kind: RaceAppearanceKind;
  context?: string;
  image?: string;
  video?: string;
  alt?: string;
}

export interface RaceCatalogueEntry {
  race: Race;
  concept?: RaceConcept;
  cover: {image?: string; video?: string; alt: string};
  heroes: RaceAppearance[];
  history: RaceAppearance[];
  npcs: RaceAppearance[];
  enemies: RaceAppearance[];
}

export interface RaceCatalogueAudit {
  raceCount: number;
  playableCount: number;
  heroCount: number;
  npcCount: number;
  enemyCount: number;
  unclassifiedNpcs: string[];
  unclassifiedEnemies: string[];
}
