import type {FocusedArtwork} from '../../../shared/lib/image/focusedArtwork';

export type CombatStat =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'wisdom'
  | 'intelligence'
  | 'charisma';

export type CombatUsageScope = 'turn' | 'round' | 'battle' | 'location' | 'campaign';

export type CombatActionActivation = 'attack' | 'action' | 'movement' | 'bonus' | 'passive';
export type CombatStance = 'airborne' | 'tiny';
export type CombatConditionId = 'blinded' | 'attack-disadvantage' | 'prone' | 'stunned';
export type CombatRollMode = 'normal' | 'advantage' | 'disadvantage';
export type CombatDamageType = 'physical' | 'cold' | 'fire' | 'poison' | 'arcane';
export type CombatAttackRange = 'melee' | 'ranged';

export type CombatStatusKind =
  | 'retaliating-crown'
  | 'movement-spent'
  | 'cold-resistance'
  | 'dragonborn-armour'
  | 'poison-resistance'
  | 'northern-ward'
  | 'bubis-balance'
  | 'attack-advantage'
  | 'guided-turn'
  | 'studied-target'
  | 'temporary-hp'
  | 'survival-instinct'
  | 'dive-ready'
  | 'resonance'
  | 'wind-guard'
  | 'tech-recalculation'
  | 'confused'
  | 'commanded-strike'
  | 'jammed'
  | 'heat-reactor'
  | 'heat-charge'
  | 'inspired'
  | 'bonus-damage'
  | 'critical-focus'
  | 'burning'
  | 'surveilled'
  | 'helping-reaction'
  | 'last-push'
  | 'beast-challenge'
  | 'critical-opening'
  | 'grease-trap'
  | 'guest-critical';

export type CombatStatusRecipient =
  | 'self'
  | 'selected-ally'
  | 'all-allies'
  | 'selected-enemy'
  | 'all-enemies';

export interface CombatStatusState {
  retaliationDamage?: number;
  id: string;
  kind: CombatStatusKind;
  sourceActorId: string;
  targetId: string;
  charges: number;
  amount?: number;
  consumedByIds?: string[];
  againstTargetId?: string;
  expiresAtTurnStartOf?: string;
}

export interface CombatOnHitSavingThrowDefinition {
  stat: CombatStat;
  dc: number;
  failureCondition?: CombatConditionId;
  failureConditions?: CombatConditionId[];
  duration: 'next-attack' | 'next-turn';
}

export interface CombatAttackDefinition {
  artwork?: FocusedArtwork;
  characterId: string;
  name: string;
  bonus: number;
  damage: string;
  range?: CombatAttackRange;
  damageType?: CombatDamageType;
  armorPiercing?: {
    minimumAc: number;
    reduction: number;
  };
  onHitSavingThrow?: CombatOnHitSavingThrowDefinition;
}
export interface CombatRollTableOutcomeDefinition {
  min: number;
  max: number;
  label: string;
  effects: CombatEffectDefinition[];
}

export type CombatEffectDefinition =
  | {type: 'enemy-area-damage'; damage: string; damageType: CombatDamageType; maxTargets: number}
  | {type: 'enemy-crown'; acBonus: number; retaliationDice: string}
  | {type: 'enemy-summon'; count: number; turns: number; tokens?: string[]; unit: CombatEnemyUnitDefinition}
  | {type: 'enemy-saving-throw'; stat: CombatStat; dc: number; maxTargets: number; damage?: string; damageType?: CombatDamageType; failureCondition?: CombatConditionId; successAttackBonus?: number}
  | {type: 'guest-skill'; kind: 'grease-trap' | 'healing-note' | 'guaranteed-critical'; enemyId: string; dice?: string}
  | {type: 'healing'; dice?: string; amount?: number}
  | {type: 'expose-weakness'}
  | {type: 'toggle-stance'; stance: CombatStance}
  | {
    type: 'summon-allies';
    countDice: string;
    durationRounds: number;
    unit: {
      idPrefix: string;
      name: string;
      hp: number;
      ac: number;
      initiative: number;
      token?: string;
      attack: Omit<CombatAttackDefinition, 'characterId'>;
    };
  }
  | {type: 'modify-ac'; amount: number; duration: 'until-source-next-turn'}
  | {
    type: 'modify-attack';
    amount: number;
    recipients: 'self' | 'selected-ally' | 'all-allies';
    duration: 'next-attack' | 'until-source-next-turn';
  }
  | {type: 'modify-stat'; stat: CombatStat; amount: number; duration: 'battle'}
  | {
    type: 'remove-negative-conditions';
    recipient?: 'self' | 'selected-ally';
    max?: number;
  }
  | {
    type: 'area-saving-throw';
    stat: CombatStat;
    dc: number;
    failureConditions: CombatConditionId[];
    successConditions?: CombatConditionId[];
    failureStatus?: CombatStatusKind;
    successStatus?: CombatStatusKind;
    duration: 'next-turn';
  }
  | {
    type: 'apply-status';
    status: CombatStatusKind;
    recipients: CombatStatusRecipient;
    charges?: number;
    amount?: number;
    duration?: 'battle' | 'until-source-next-turn';
  }
  | {
    type: 'area-damage';
    damage: string;
    damageType?: CombatDamageType;
    maxTargets: number;
    savingThrow: {
      stat: CombatStat;
      dc: number;
      halfOnSuccess: boolean;
      failureStatus?: CombatStatusKind;
    };
  }
  | {
    type: 'roll-table';
    dice: string;
    outcomes: CombatRollTableOutcomeDefinition[];
  }
  | {type: 'passive'; label: string}
  | {
    type: 'replace-attack';
    attack: Omit<CombatAttackDefinition, 'characterId'>;
    splitAgainstMultiple?: {
      secondaryDamage: string;
    };
  };

export interface CombatActionDefinition {
  artwork?: FocusedArtwork;
  id: string;
  /** Stable canonical ability/item id. Different encounter actions may share one resource. */
  sourceId: string;
  encounterIds: string[];
  characterId: string;
  source: 'ability' | 'item';
  name: string;
  description: string;
  activation?: CombatActionActivation;
  target: 'self' | 'ally' | 'enemy' | 'all-allies' | 'all-enemies';
  resolution: 'automatic';
  check?: {
    dice: string;
    successMin: number;
    successMax?: number;
  };
  effects: CombatEffectDefinition[];
  skillVideo?: {
    source: string;
    poster?: string;
  };
  deactivationVideo?: {
    source: string;
    poster?: string;
  };
  uses: {
    scope: CombatUsageScope;
    max: number;
  };
}

export interface CombatInventoryItemState {
  ownerId: string | null;
  quantity: number;
  charges: number;
  maxCharges: number | null;
  chargeScope: CombatUsageScope | null;
}

export interface CombatEnemyAttackDefinition {
  artwork?: FocusedArtwork;
  id: string;
  name: string;
  bonus: number;
  damage: string;
  range?: CombatAttackRange;
  damageType?: CombatDamageType;
  attacks?: number;
  savingThrow?: {
    stat: CombatStat;
    dc: number;
    condition: 'shamed' | 'assigned-role';
  };
}

export interface CombatPhaseTransitionDefinition {
  hpFloor: number;
  phase: number;
  name: string;
  ac?: number;
  attack: CombatEnemyAttackDefinition;
}

export interface CombatReleasedAllyDefinition {
  id: string;
  name: string;
  hp: number;
  ac: number;
  token: string;
  attack: Omit<CombatAttackDefinition, 'characterId'>;
}

export interface CombatEnemyUnitDefinition {
  kind?: 'creature' | 'object';
  releaseAlly?: CombatReleasedAllyDefinition;
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
  segmentedHp?: number[];
  overflowDamageCarries?: boolean;
  phaseTransitions?: CombatPhaseTransitionDefinition[];
  defeatFallback?: {
    resolution: string;
    completionActionId?: string;
    outcome?: {
      flags?: Record<string, boolean>;
      timePressureDelta?: number;
      inventoryAcquire?: string[];
      clues?: string[];
    };
  };
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
  summonedBy?: string;
  remainingTurns?: number;
  kind?: 'creature' | 'object';
  releaseAlly?: CombatReleasedAllyDefinition;
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  attack: CombatEnemyAttackDefinition;
  token?: string;
}

export interface CombatAllyState {
  id: string;
  ownerId: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  attack: Omit<CombatAttackDefinition, 'characterId'>;
  expiresAfterRound: number;
  remainingTurns?: number;
  token?: string;
}

export interface CombatAcModifierState {
  id: string;
  sourceActorId: string;
  targetIds: string[];
  amount: number;
  expiresAtTurnStartOf: string;
}

export interface CombatAttackModifierState {
  id: string;
  sourceActorId: string;
  targetIds: string[];
  againstTargetIds?: string[];
  amount: number;
  consumeOnAttack: boolean;
  expiresAtTurnStartOf?: string;
}

export interface CombatStatModifierState {
  id: string;
  sourceActorId: string;
  targetId: string;
  stat: CombatStat;
  amount: number;
}

export interface CombatPendingAttack {
  automatic?: boolean;
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
  range?: CombatAttackRange;
  rerolledFrom?: number;
  bonusDamageDice?: Array<{
    expression: string;
    label: string;
  }>;
  damageType?: CombatDamageType;
  rollMode?: CombatRollMode;
  onHitSavingThrow?: CombatOnHitSavingThrowDefinition;
  secondaryTargetId?: string;
  secondaryTargetName?: string;
}

export interface CombatPendingSavingThrow {
  kind?: 'on-hit' | 'area-damage-save' | 'area-damage-status' | 'enemy-skill' | 'action-healing' | 'enemy-attack-reroll';
  actionName?: string;
  healing?: {maxHp: number; endTurn: boolean};
  attackReroll?: {firstRoll: number; targetId: string};
  enemySkill?: {actionId: string; actionName: string; remainingTargetIds: string[]; damage: number; damageType?: CombatDamageType; successAttackBonus?: number};
  sourceActorId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  stat: CombatStat;
  modifier: number;
  dc: number;
  failureConditions: CombatConditionId[];
  duration: 'next-attack' | 'next-turn';
  rollExpression?: string;
  areaDamage?: {
    actionId: string;
    actionName: string;
    damage: number;
    damageType?: CombatDamageType;
    halfOnSuccess: boolean;
    failureStatus?: CombatStatusKind;
    remainingTargetIds: string[];
  };
}

export interface CombatState {
  encounterId: string;
  enemies: Record<string, CombatEnemyState>;
  allies: Record<string, CombatAllyState>;
  weaknessExposed: boolean;
  weaknessOriginalAc?: Record<string, number> | null;
  stances: Record<string, CombatStance[]>;
  conditions: Record<string, CombatConditionId[]>;
  acModifiers: CombatAcModifierState[];
  attackModifiers: CombatAttackModifierState[];
  statModifiers: CombatStatModifierState[];
  statuses: CombatStatusState[];
  actionUses: Record<string, number>;
  equippedItems: Record<string, string | null>;
  selectedActionIds: string[];
  initiativeOrder: string[];
  turnIndex: number;
  round: number;
  pendingAttack: CombatPendingAttack | null;
  pendingSavingThrow: CombatPendingSavingThrow | null;
  recentlySkippedParticipantIds?: string[];
  log: string[];
}

interface CombatEventMeta {
  id: string;
  commandId: string;
}

export type CombatEvent = CombatEventMeta & (
  | {type: 'combat-started'; encounterId: string; initiativeOrder: string[]}
  | {type: 'combat-attack-resolved'; attack: CombatPendingAttack; hit: boolean; text: string}
  | {type: 'combat-attack-cancelled'; text: string}
  | {type: 'combat-damage-resolved'; targetId: string; amount: number; text: string}
  | {type: 'healing-applied'; targetId: string; amount: number; maxHp: number; text: string}
  | {
    type: 'combat-action-used';
    actionId: string;
    sourceId: string;
    resourceKey: string;
    scope: CombatUsageScope;
    max: number;
  }
  | {type: 'combat-action-selected'; actionId: string; selected: boolean}
  | {type: 'combat-item-equipped'; heroId: string; actionId: string | null}
  | {type: 'combat-stance-changed'; participantId: string; stance: CombatStance; active: boolean; text: string}
  | {type: 'combat-enemies-summoned'; enemies: CombatEnemyState[]; text: string}
  | {type: 'combat-allies-summoned'; allies: CombatAllyState[]; text: string}
  | {type: 'combat-ac-modifier-applied'; modifier: CombatAcModifierState; text: string}
  | {type: 'combat-attack-modifier-applied'; modifier: CombatAttackModifierState; text: string}
  | {type: 'combat-stat-modifier-applied'; modifier: CombatStatModifierState; text: string}
  | {type: 'combat-status-applied'; status: CombatStatusState; text?: string}
  | {type: 'combat-status-removed'; statusId: string; text?: string}
  | {type: 'combat-saving-throw-requested'; savingThrow: CombatPendingSavingThrow}
  | {type: 'combat-saving-throw-resolved'; text: string}
  | {
    type: 'combat-condition-changed';
    participantId: string;
    condition: CombatConditionId;
    active: boolean;
    bypassImmunity?: boolean;
    text?: string;
  }
  | {type: 'combat-weakness-exposed'; text: string}
  | {type: 'combat-weakness-cleared'; ac?: number; text?: string}
  | {type: 'combat-log-added'; text: string}
  | {type: 'combat-phase-advanced'; phase: number; name: string; ac: number; attack: CombatEnemyAttackDefinition; text: string}
  | {type: 'turn-advanced'}
  | {type: 'combat-ended'; text: string}
  | {type: 'combat-cleared'; encounterId: string}
);

export type CombatEventInput = CombatEvent extends infer Event
  ? Event extends CombatEvent
    ? Omit<Event, 'id' | 'commandId'>
    : never
  : never;
