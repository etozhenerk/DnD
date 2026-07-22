import type {
  CombatActionDefinition,
  CombatAttackDefinition,
  CombatEncounterDefinition,
  CombatHeroSource,
} from '../../combat/model/types';

export type GalleryView = 'gallery' | 'pussy' | 'prop-room' | 'archive' | 'kraken' | 'guards' | 'combat' | 'closed-bar';
export type HeroStat = 'strength' | 'dexterity' | 'intelligence' | 'charisma';

export interface GalleryDoorDefinition {
  id: 'pussy-suite' | 'archive' | 'prop-room-stairs';
  label: string;
  view: GalleryView;
  status: 'open' | 'conditional';
  actionLabel: string;
  description: string;
  availableDescription?: string;
  lockedDescription?: string;
  requiresAllFlags?: string[];
  requiresAnyFlag?: string[];
}

export interface GalleryCheckDefinition {
  id: 'earn-pussy-acquaintance' | 'earn-pussy-trust' | 'intimidate-pussy' | 'steal-pussy-key' | 'recover-pussy-scepter' | 'calm-alexis' | 'search-hotel-archive' | 'stop-rail-kraken';
  label: string;
  stats: HeroStat[];
  dc: number;
  eligibleHeroIds?: string[];
  dcModifiers?: Array<{flag: string; delta: number}>;
  automaticSuccessAbilityId?: string;
  advantageAbilityId?: string;
  successText: string;
  failureText: string;
}

export interface GalleryDialogueDefinition {
  speaker: string;
  opening: string;
  acquaintance?: string;
  acquaintanceFailure?: string;
  charmSuccess?: string;
  charmFailure?: string;
  yesterdayRefusal?: string;
  yesterdayReveal?: string;
  trustRefusal?: string;
  threatSuccess?: string;
  threatSuccessAnonymous?: string;
  threatFailure?: string;
  theftPrompt?: string;
  theftSuccess?: string;
  theftFailure?: string;
  guardsDefeated?: string;
  quest?: string;
  lore?: {
    title: string;
    art: string;
    alt: string;
    paragraphs: string[];
  };
  help?: string;
  threat?: string;
  reward?: string;
  success?: string;
  pressure?: string;
  search?: string;
}

export type GalleryAttackDefinition = CombatAttackDefinition;
export type GalleryCombatActionDefinition = CombatActionDefinition;
export type GalleryEncounterDefinition = CombatEncounterDefinition;

export interface GalleryGameplayDefinition {
  version: number;
  id: string;
  campaignId: string;
  sceneId: string;
  initialView: GalleryView;
  doors: GalleryDoorDefinition[];
  narration: {
    initial: string;
    afterKraken: string;
    archiveWithKey: string;
    passageOpen: string;
  };
  dialogues: {
    pussy: GalleryDialogueDefinition;
    alexis: GalleryDialogueDefinition;
  };
  checks: GalleryCheckDefinition[];
  combatActions: GalleryCombatActionDefinition[];
  encounters: GalleryEncounterDefinition[];
}

export interface GalleryHeroSource extends CombatHeroSource {
  abilities: Array<{id: string; name: string; description?: string; effect?: string}>;
  items: Array<{id: string; name: string; description?: string; effect: string}>;
}
