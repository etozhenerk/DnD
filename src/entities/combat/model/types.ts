export type CombatStat =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'wisdom'
  | 'intelligence'
  | 'charisma';

export type CombatUsageScope = 'turn' | 'round' | 'battle' | 'location' | 'campaign';

export interface CombatAttackDefinition {
  characterId: string;
  name: string;
  bonus: number;
  damage: string;
}
export type CombatEffectDefinition =
  | {type: 'healing'; dice: string}
  | {type: 'expose-weakness'};

export interface CombatActionDefinition {
  id: string;
  encounterIds: string[];
  characterId: string;
  source: 'ability' | 'item';
  name: string;
  description: string;
  target: 'self' | 'ally' | 'all-enemies';
  resolution: 'automatic';
  effects: CombatEffectDefinition[];
  uses: {
    scope: CombatUsageScope;
    max: number;
  };
}

export interface CombatEnemyAttackDefinition {
  id: string;
  name: string;
  bonus: number;
  damage: string;
}

export interface CombatEnemyUnitDefinition {
  id: string;
  name: string;
  token?: string;
  hp?: number;
  maxHp?: number;
  ac?: number;
  initiative?: number;
  attack?: CombatEnemyAttackDefinition;
}

export interface CombatEncounterDefinition {
  id: string;
  name: string;
  hp: number;
  ac: number;
  initiative: number;
  units?: CombatEnemyUnitDefinition[];
  attack: CombatEnemyAttackDefinition;
  weakness: {
    stats: CombatStat[];
    dc: number;
    reducedAc: number;
    text: string;
  };
  heroAttacks: CombatAttackDefinition[];
  startText?: string;
  victoryText?: string;
}

export interface CombatDefinition {
  combatActions: CombatActionDefinition[];
  encounters: CombatEncounterDefinition[];
}

export interface CombatHeroSource {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  stats: Record<string, number>;
}

export interface CombatEnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  attack: CombatEnemyAttackDefinition;
  token?: string;
}

export interface CombatPendingAttack {
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  attackName: string;
  natural: number;
  bonus: number;
  total: number;
  targetAc: number;
  critical: boolean;
  damageExpression: string;
}

export interface CombatState {
  encounterId: string;
  enemies: Record<string, CombatEnemyState>;
  weaknessExposed: boolean;
  actionUses: Record<string, number>;
  equippedItems: Record<string, string | null>;
  selectedActionIds: string[];
  initiativeOrder: string[];
  turnIndex: number;
  round: number;
  pendingAttack: CombatPendingAttack | null;
  log: string[];
}

interface CombatEventMeta {
  id: string;
  commandId: string;
}

export type CombatEvent = CombatEventMeta & (
  | {type: 'combat-started'; encounterId: string; initiativeOrder: string[]}
  | {type: 'combat-attack-resolved'; attack: CombatPendingAttack; hit: boolean; text: string}
  | {type: 'combat-damage-resolved'; targetId: string; amount: number; text: string}
  | {type: 'healing-applied'; targetId: string; amount: number; maxHp: number; text: string}
  | {type: 'combat-action-used'; actionId: string}
  | {type: 'combat-action-selected'; actionId: string; selected: boolean}
  | {type: 'combat-item-equipped'; heroId: string; actionId: string | null}
  | {type: 'combat-weakness-exposed'; text: string}
  | {type: 'turn-advanced'}
  | {type: 'combat-ended'; text: string}
);

export type CombatEventInput = CombatEvent extends infer Event
  ? Event extends CombatEvent
    ? Omit<Event, 'id' | 'commandId'>
    : never
  : never;
