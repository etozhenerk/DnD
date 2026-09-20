import type {
  CombatActionDefinition,
  CombatActionActivation,
  CombatAllyState,
  CombatEncounterDefinition,
  CombatHeroSource,
  CombatInventoryItemState,
  CombatState,
  CombatStat,
} from './types';

export interface CombatPortraitPresentation {
  scale?: number;
  shiftYPercent?: number;
}

export interface CombatEffectView {
  id: string;
  visual?: import('./combatEffectVisuals').CombatEffectVisualId;
  label: string;
  passive?: boolean;
  shortLabel: string;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface CombatStatView {
  id: CombatStat;
  label: string;
  base: number;
  modifier: number;
  total: number;
}

export interface CombatTargetView extends CombatPortraitPresentation {
  id: string;
  name: string;
  faction: 'hero' | 'enemy';
  token: string;
  hp: number;
  maxHp: number;
  ac: number;
  kind?: 'hero' | 'summon' | 'enemy';
  effects?: CombatEffectView[];
  characterStats?: CombatStatView[];
}

export interface CombatantView extends CombatTargetView {
  attackArtwork?: import('../../../shared/lib/image/focusedArtwork').FocusedArtwork;
  attackName: string;
  attackBonus: number;
}

export interface CombatMechanicsGlossaryEntryView {
  term: string;
  description: string;
}

export interface CombatMechanicsHelpView {
  entries: CombatMechanicsGlossaryEntryView[];
}

export interface CombatActionEffectRowView {
  label: string;
  description: string;
}

export interface CombatActionView {
  artwork?: import('../../../shared/lib/image/focusedArtwork').FocusedArtwork;
  id: string;
  source: 'ability' | 'item';
  name: string;
  description: string;
  effectLabel: string;
  effectRows?: CombatActionEffectRowView[];
  activation: CombatActionActivation;
  active: boolean;
  attackModifier: boolean;
  requiresRoll: boolean;
  rollExpression?: string;
  rollOwnerLabel?: string;
  target: 'self' | 'ally' | 'enemy' | 'all-allies' | 'all-enemies';
  uses: number;
  maxUses: number;
  cost?: {
    remaining: number;
    limitLabel: string;
    badgeLabel: string;
    turnLabel: string;
    hint: string;
  };
  disabled: boolean;
  disabledReason?: string;
  mechanicsHelp: CombatMechanicsHelpView;
  skillVideo?: {
    source: string;
    poster?: string;
  };
}

export interface CombatArenaViewModel {
  encounter: CombatEncounterDefinition;
  active: CombatantView;
  activeHero?: CombatHeroSource;
  activeAlly?: CombatAllyState;
  actions: CombatActionView[];
  attackRollMode: 'normal' | 'advantage' | 'disadvantage';
  attackEnhancements: string[];
  equippedItemId: string;
  enemyTargets: CombatTargetView[];
  party: CombatTargetView[];
  participants: CombatantView[];
  selectedHeroTargetId: string;
  selectedTarget?: CombatTargetView;
  selectedTargetId: string;
  supportTargets: CombatTargetView[];
  targets: CombatTargetView[];
  utilityAction?: CombatActionView;
  victory: boolean;
}

export interface CombatArenaViewInput {
  actions: CombatActionDefinition[];
  combat: CombatState;
  encounter: CombatEncounterDefinition;
  fallbackEnemyToken: string;
  heroes: CombatHeroSource[];
  heroHp: Record<string, number>;
  inventoryState: Record<string, CombatInventoryItemState>;
  resourceUses: Record<string, number>;
  heroPortraits?: Record<string, CombatPortraitPresentation>;
  heroTokens: Record<string, string>;
  participantConditions?: Record<string, string[]>;
  requestedEnemyTargetId: string;
  requestedHeroTargetId: string;
}
