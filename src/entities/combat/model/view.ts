import type {CombatActionDefinition, CombatEncounterDefinition, CombatHeroSource, CombatState} from './types';

export interface CombatPortraitPresentation {
  scale?: number;
  shiftYPercent?: number;
}

export interface CombatTargetView extends CombatPortraitPresentation {
  id: string;
  name: string;
  faction: 'hero' | 'enemy';
  token: string;
  hp: number;
  maxHp: number;
  ac: number;
}

export interface CombatantView extends CombatTargetView {
  attackName: string;
  attackBonus: number;
}

export interface CombatActionView {
  id: string;
  source: 'ability' | 'item';
  name: string;
  description: string;
  effectLabel: string;
  attackModifier: boolean;
  rollExpression?: string;
  target: 'self' | 'ally' | 'all-enemies';
  uses: number;
  maxUses: number;
  disabled: boolean;
  disabledReason?: string;
}

export interface CombatArenaViewModel {
  encounter: CombatEncounterDefinition;
  active: CombatantView;
  activeHero?: CombatHeroSource;
  actions: CombatActionView[];
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
  heroPortraits?: Record<string, CombatPortraitPresentation>;
  heroTokens: Record<string, string>;
  requestedEnemyTargetId: string;
  requestedHeroTargetId: string;
}
