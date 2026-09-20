import {getEffectiveGalleryEvents} from './galleryCheckpoint';
import {synchronizeStoryDoom} from './storyProgress';
import {createPartyRewardInventory} from './partyRewards';
import {isCombatVictory, releaseDefeatedPrisoners} from '../../combat/model/combatObjectives.ts';
import type {
  GalleryCounter,
  GalleryGameplayDefinition,
  GalleryHeroSource,
  GalleryNumericChange,
  GalleryStoryOutcome,
  GalleryView,
  HeroStat,
} from './galleryGameplay';
import {applyCombatEvent} from '../../combat/model/combatRules.ts';
import type {
  CombatEvent,
  CombatInventoryItemState,
  CombatPendingAttack,
  CombatState,
  CombatUsageScope,
} from '../../combat/model/types';
import {
  GALLERY_SESSION_VERSION,
  normalizeGalleryInitialInventoryIds,
  parseGalleryEventLog,
  type GallerySessionSeed,
} from './gallerySessionJournal.ts';

export {
  getPendingDamageRange,
  resolveAttackAgainstArmor,
  resolvePendingDamage,
  rollDamage,
  rollDie,
} from '../../combat/model/combatRules.ts';

export {GALLERY_SESSION_VERSION} from './gallerySessionJournal.ts';

export interface GalleryRollResult {
  checkId: string;
  heroId: string;
  stat: HeroStat;
  rolls: number[];
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  automatic: boolean;
  text: string;
}

export type GalleryCombatState = CombatState;
export type GalleryPendingAttack = CombatPendingAttack;

export type {GalleryCounter, GalleryNumericChange, GalleryStoryOutcome} from './galleryGameplay';

export interface GalleryInventoryItemState extends CombatInventoryItemState {}

export interface GalleryNpcOverride {
  actionId: string;
  targetId: string;
  targetIds: string[];
  confirmed: boolean;
  skipped: boolean;
  explanation: string;
}

export interface GalleryDialoguePresetSelection {
  sceneId: string;
  presetId: string;
  speaker: string;
  text: string;
}

export type GalleryManualAdjustment =
  | {
    kind: 'participant-stat';
    participantId: string;
    field: 'hp' | 'maxHp' | 'ac' | 'attackBonus' | 'temporaryModifier';
    value: number;
  }
  | {
    kind: 'inventory-item';
    itemId: string;
    acquired: boolean;
    ownerId: string | null;
    quantity: number;
    charges: number;
  }
  | {kind: 'condition'; participantId: string; conditionId: string; active: boolean}
  | {kind: 'flag'; flag: string; value: boolean}
  | {kind: 'counter'; counter: GalleryCounter; value: number}
  | {kind: 'initiative'; order: string[]; turnIndex: number; round: number}
  | {
    kind: 'npc-override';
    enemyId: string;
    actionId: string;
    targetId: string;
    targetIds: string[];
    confirmed: boolean;
    skipped: boolean;
    explanation: string;
  }
  | ({kind: 'dialogue-preset'} & GalleryDialoguePresetSelection)
  | {kind: 'scene'; sceneId: string; previousSceneId?: string; previousSceneSearch?: string}
  | {kind: 'relationship'; relationshipId: string; value: number}
  | {kind: 'location'; locationId: string; stateValue?: string | null}
  | {kind: 'location-state'; locationId: string; value: string | null};

export interface GalleryStoryActionResult {
  actionId: string;
  commandId: string;
  result: 'automatic' | 'success' | 'failure';
  sceneId: string;
}

export type GalleryEvent = (
  | {id: string; commandId: string; type: 'session-started'; seed: GallerySessionSeed}
  | {id: string; commandId: string; type: 'view-changed'; view: GalleryView}
  | {id: string; commandId: string; type: 'scene-navigated'; fromPath: string; toPath: string}
  | {id: string; commandId: string; type: 'flag-changed'; flag: string; value: boolean}
  | {id: string; commandId: string; type: 'counter-changed'; counter: GalleryCounter; delta: number}
  | {id: string; commandId: string; type: 'relationship-changed'; relationshipId: string; change: GalleryNumericChange}
  | {id: string; commandId: string; type: 'item-changed'; itemId: string; acquired: boolean; quantity?: number}
  | {id: string; commandId: string; type: 'item-charge-changed'; itemId: string; change: GalleryNumericChange}
  | {id: string; commandId: string; type: 'clue-revealed'; clueId: string}
  | {id: string; commandId: string; type: 'ending-selected'; endingId: string | null}
  | {id: string; commandId: string; type: 'story-action-resolved'; actionId: string; result: GalleryStoryActionResult['result']; sceneId: string}
  | {id: string; commandId: string; type: 'roll-entered'; result: GalleryRollResult}
  | {id: string; commandId: string; type: 'ability-used'; abilityId: string}
  | {
    id: string;
    commandId: string;
    type: 'manual-adjustment';
    label: string;
    reason: string;
    adjustment: GalleryManualAdjustment;
  }
  | {
    id: string;
    commandId: string;
    type: 'npc-action-selected';
    enemyId: string;
    actionId: string;
    targetId: string;
    targetIds: string[];
    confirmed: boolean;
    skipped: boolean;
    explanation: string;
  }
  | ({id: string; commandId: string; type: 'dialogue-preset-chosen'} & GalleryDialoguePresetSelection)
  | {
    id: string;
    commandId: string;
    type: 'safe-location-rested';
    locationId: string;
    healing: Array<{heroId: string; roll: number; amount: number}>;
  }
  | {id: string; commandId: string; type: 'scene-checkpoint-restored'; eventCount: number}
  | {id: string; commandId: string; type: 'party-fully-rested'; consumedItemId: string}
  | CombatEvent
  | {id: string; commandId: string; type: 'action-corrected'; correctedCommandId: string}
) & {sceneScopeId?: string};

export interface GallerySessionSnapshot {
  version: typeof GALLERY_SESSION_VERSION;
  campaignId: string;
  definitionId: string;
  definitionVersion: number;
  heroSources: GalleryHeroSource[];
  activeView: GalleryView;
  flags: Record<string, boolean>;
  counters: Record<GalleryCounter, number>;
  relationships: Record<string, number>;
  inventory: string[];
  itemCharges: Record<string, number>;
  clues: string[];
  selectedEnding: string | null;
  lastStoryAction: GalleryStoryActionResult | null;
  heroHp: Record<string, number>;
  heroMaxHp: Record<string, number>;
  heroAc: Record<string, number>;
  heroAttackBonuses: Record<string, number>;
  participantTemporaryModifiers: Record<string, number>;
  participantConditions: Record<string, string[]>;
  inventoryState: Record<string, GalleryInventoryItemState>;
  initialInventoryState: Record<string, GalleryInventoryItemState>;
  resourceUses: Record<string, number>;
  resourceScopes: Record<string, CombatUsageScope>;
  currentLocationId: string;
  locationStates: Record<string, string>;
  npcOverrides: Record<string, GalleryNpcOverride>;
  selectedDialoguePreset: GalleryDialoguePresetSelection | null;
  activeSceneId: string | null;
  usedAbilities: string[];
  lastRoll: GalleryRollResult | null;
  combat: GalleryCombatState | null;
  events: GalleryEvent[];
}

function normalizeInitialInventoryState(
  initialInventoryState: Record<string, GalleryInventoryItemState>,
) {
  const normalized: Record<string, GalleryInventoryItemState> = {};
  Object.entries(initialInventoryState).forEach(([itemId, item]) => {
    const normalizedItemId = normalizeGalleryInitialInventoryIds([itemId])[0] ?? itemId;
    if (!normalized[normalizedItemId] || normalizedItemId === itemId) {
      normalized[normalizedItemId] = structuredClone(item);
    }
  });
  return normalized;
}

export function createGallerySession(seed: GallerySessionSeed): GallerySessionSnapshot {
  const heroes = seed.heroSources;
  const inventoryState = normalizeInitialInventoryState(seed.initialInventoryState);
  return {
    version: GALLERY_SESSION_VERSION,
    campaignId: seed.campaignId,
    definitionId: seed.definitionId,
    definitionVersion: seed.definitionVersion,
    heroSources: structuredClone(heroes),
    activeView: 'gallery',
    flags: {},
    counters: {
      doom: 0,
      'kreed-evidence-count': 0,
      'show18-contradictions-broken': 0,
      timePressure: 0,
      preFinalCombats: 0,
      show18LiveSuccesses: 0,
      show18TeleprompterSuccesses: 0,
      show18Failures: 0,
      groomTunnelSuccesses: 0,
      groomTunnelFailures: 0,
      restoreLogSuccesses: 0,
      restoreLogFailures: 0,
    },
    relationships: {},
    inventory: Object.keys(inventoryState),
    itemCharges: Object.fromEntries(Object.entries(inventoryState).map(([itemId, item]) => [itemId, item.charges])),
    clues: [],
    selectedEnding: null,
    lastStoryAction: null,
    heroHp: Object.fromEntries(heroes.map((hero) => [hero.id, hero.hp])),
    heroMaxHp: Object.fromEntries(heroes.map((hero) => [hero.id, hero.maxHp])),
    heroAc: Object.fromEntries(heroes.map((hero) => [hero.id, hero.ac])),
    heroAttackBonuses: {},
    participantTemporaryModifiers: {},
    participantConditions: {},
    inventoryState,
    initialInventoryState: structuredClone(inventoryState),
    resourceUses: {},
    resourceScopes: {},
    currentLocationId: seed.initialLocationId,
    locationStates: {},
    npcOverrides: {},
    selectedDialoguePreset: null,
    activeSceneId: seed.initialLocationId,
    usedAbilities: [],
    lastRoll: null,
    combat: null,
    events: [],
  };
}

function updateEnemy(
  state: GallerySessionSnapshot,
  enemyId: string,
  update: (enemy: NonNullable<GallerySessionSnapshot['combat']>['enemies'][string]) => NonNullable<GallerySessionSnapshot['combat']>['enemies'][string],
) {
  const combat = state.combat;
  const enemy = combat?.enemies[enemyId];
  if (!combat || !enemy) return state;
  const updated = releaseDefeatedPrisoners({
    ...combat,
    enemies: {...combat.enemies, [enemyId]: update(enemy)},
  });
  return {
    ...state,
    combat: isCombatVictory(updated)
      ? {...updated, pendingAttack: null, pendingSavingThrow: null}
      : updated,
  };
}

function applyManualAdjustment(
  state: GallerySessionSnapshot,
  adjustment: GalleryManualAdjustment,
): GallerySessionSnapshot {
  if (adjustment.kind === 'participant-stat') {
    const {field, participantId, value} = adjustment;
    const enemy = state.combat?.enemies[participantId];
    if (enemy) {
      if (field === 'hp') return updateEnemy(state, participantId, (current) => ({
        ...current,
        hp: Math.max(0, Math.min(current.maxHp, value)),
      }));
      if (field === 'maxHp') return updateEnemy(state, participantId, (current) => ({
        ...current,
        maxHp: Math.max(1, value),
        hp: Math.min(current.hp, Math.max(1, value)),
      }));
      if (field === 'ac') return updateEnemy(state, participantId, (current) => ({...current, ac: value}));
      if (field === 'attackBonus') return updateEnemy(state, participantId, (current) => ({
        ...current,
        attack: {...current.attack, bonus: value},
      }));
      return {
        ...state,
        participantTemporaryModifiers: {
          ...state.participantTemporaryModifiers,
          [participantId]: value,
        },
      };
    }

    if (!(participantId in state.heroHp)) return state;
    if (field === 'hp') {
      const heroHp = {
        ...state.heroHp,
        [participantId]: Math.max(0, Math.min(state.heroMaxHp[participantId] ?? value, value)),
      };
      const partyDown = state.heroSources.every((hero) => (heroHp[hero.id] ?? hero.hp) <= 0);
      return {
        ...state, heroHp,
        combat: partyDown && state.combat
          ? {...state.combat, pendingAttack: null, pendingSavingThrow: null}
          : state.combat,
      };
    }
    if (field === 'maxHp') return {
      ...state,
      heroMaxHp: {...state.heroMaxHp, [participantId]: Math.max(1, value)},
      heroHp: {
        ...state.heroHp,
        [participantId]: Math.min(state.heroHp[participantId] ?? value, Math.max(1, value)),
      },
    };
    if (field === 'ac') return {...state, heroAc: {...state.heroAc, [participantId]: value}};
    if (field === 'attackBonus') return {
      ...state,
      heroAttackBonuses: {...state.heroAttackBonuses, [participantId]: value},
    };
    return {
      ...state,
      participantTemporaryModifiers: {
        ...state.participantTemporaryModifiers,
        [participantId]: value,
      },
    };
  }

  if (adjustment.kind === 'inventory-item') {
    if (!adjustment.acquired) {
      const {[adjustment.itemId]: _removed, ...remainingInventoryState} = state.inventoryState;
      const {[adjustment.itemId]: _removedCharges, ...remainingCharges} = state.itemCharges;
      return {
        ...state,
        inventory: state.inventory.filter((itemId) => itemId !== adjustment.itemId),
        inventoryState: remainingInventoryState,
        itemCharges: remainingCharges,
      };
    }
    return {
      ...state,
      inventory: [...new Set([...state.inventory, adjustment.itemId])],
      inventoryState: {
        ...state.inventoryState,
        [adjustment.itemId]: {
          ownerId: adjustment.ownerId,
          quantity: adjustment.quantity,
          charges: adjustment.charges,
          maxCharges: state.inventoryState[adjustment.itemId]?.maxCharges
            ?? state.initialInventoryState[adjustment.itemId]?.maxCharges
            ?? createPartyRewardInventory(adjustment.itemId)?.maxCharges
            ?? null,
          chargeScope: state.inventoryState[adjustment.itemId]?.chargeScope
            ?? state.initialInventoryState[adjustment.itemId]?.chargeScope
            ?? createPartyRewardInventory(adjustment.itemId)?.chargeScope
            ?? null,
        },
      },
      itemCharges: {...state.itemCharges, [adjustment.itemId]: adjustment.charges},
    };
  }

  if (adjustment.kind === 'condition') {
    const current = state.participantConditions[adjustment.participantId] ?? [];
    const next = adjustment.active
      ? [...new Set([...current, adjustment.conditionId])]
      : current.filter((conditionId) => conditionId !== adjustment.conditionId);
    return {
      ...state,
      participantConditions: {...state.participantConditions, [adjustment.participantId]: next},
    };
  }
  if (adjustment.kind === 'flag') return {
    ...state,
    flags: {...state.flags, [adjustment.flag]: adjustment.value},
  };
  if (adjustment.kind === 'counter') return {
    ...state,
    counters: {...state.counters, [adjustment.counter]: Math.max(0, adjustment.value)},
  };
  if (adjustment.kind === 'initiative') return state.combat ? {
    ...state,
    combat: {
      ...state.combat,
      initiativeOrder: adjustment.order,
      turnIndex: adjustment.turnIndex,
      round: adjustment.round,
      pendingAttack: null,
    },
  } : state;
  if (adjustment.kind === 'npc-override') return {
    ...state,
    npcOverrides: {
      ...state.npcOverrides,
      [adjustment.enemyId]: {
        actionId: adjustment.actionId,
        targetId: adjustment.targetId,
        targetIds: adjustment.targetIds ?? (adjustment.targetId ? [adjustment.targetId] : []),
        confirmed: adjustment.confirmed,
        skipped: adjustment.skipped ?? adjustment.actionId === 'skip',
        explanation: adjustment.explanation ?? '',
      },
    },
  };
  if (adjustment.kind === 'dialogue-preset') return {
    ...state,
    selectedDialoguePreset: {
      sceneId: adjustment.sceneId,
      presetId: adjustment.presetId,
      speaker: adjustment.speaker,
      text: adjustment.text,
    },
  };
  if (adjustment.kind === 'scene') return {...state, activeSceneId: adjustment.sceneId};
  if (adjustment.kind === 'relationship') return {
    ...state,
    relationships: {...state.relationships, [adjustment.relationshipId]: adjustment.value},
  };
  if (adjustment.kind === 'location') {
    const locationChanged = adjustment.locationId !== state.currentLocationId;
    const locationStates = {...state.locationStates};
    if (adjustment.stateValue !== undefined) {
      if (adjustment.stateValue === null) delete locationStates[adjustment.locationId];
      else locationStates[adjustment.locationId] = adjustment.stateValue;
    }
    return recoverGalleryResourceScopes({
      ...state,
      currentLocationId: adjustment.locationId,
      locationStates,
    }, locationChanged ? ['location'] : []);
  }
  const nextLocationStates = {...state.locationStates};
  if (adjustment.value === null) delete nextLocationStates[adjustment.locationId];
  else nextLocationStates[adjustment.locationId] = adjustment.value;
  return {...state, locationStates: nextLocationStates};
}

export function recoverGalleryResourceScopes(
  state: GallerySessionSnapshot,
  scopes: CombatUsageScope[],
): GallerySessionSnapshot {
  if (!scopes.length) return state;
  const recovered = new Set(scopes);
  const resourceUses = Object.fromEntries(Object.entries(state.resourceUses)
    .filter(([resourceKey]) => !recovered.has(state.resourceScopes[resourceKey])));
  const resourceScopes = Object.fromEntries(Object.entries(state.resourceScopes)
    .filter(([resourceKey]) => resourceKey in resourceUses));
  const inventoryState = Object.fromEntries(Object.entries(state.inventoryState).map(([itemId, item]) => {
    if (item.maxCharges === null || item.chargeScope === null || !recovered.has(item.chargeScope)) {
      return [itemId, item];
    }
    return [itemId, {...item, charges: item.maxCharges}];
  }));
  const itemCharges = {...state.itemCharges};
  Object.entries(inventoryState).forEach(([itemId, item]) => {
    itemCharges[itemId] = item.charges;
  });
  return {...state, resourceUses, resourceScopes, inventoryState, itemCharges};
}

export function applyGalleryEvent(
  state: GallerySessionSnapshot,
  event: GalleryEvent,
  definition: GalleryGameplayDefinition,
): GallerySessionSnapshot {
  switch (event.type) {
    case 'session-started': return state;
    case 'scene-navigated': return state;
    case 'view-changed': return {...state, activeView: event.view, lastRoll: null};
    case 'flag-changed': return synchronizeStoryDoom(state, {...state, flags: {...state.flags, [event.flag]: event.value}}, definition);
    case 'counter-changed': return event.counter === 'doom' && definition.doomMilestones ? state : {
      ...state,
      counters: {...state.counters, [event.counter]: Math.max(0, state.counters[event.counter] + event.delta)},
    };
    case 'relationship-changed': {
      const currentValue = state.relationships[event.relationshipId] ?? 0;
      const nextValue = event.change.mode === 'set'
        ? event.change.value
        : currentValue + event.change.value;
      return {
        ...state,
        relationships: {...state.relationships, [event.relationshipId]: nextValue},
      };
    }
    case 'item-changed': {
      if (!event.acquired) {
        const {[event.itemId]: _removed, ...remainingInventoryState} = state.inventoryState;
        const {[event.itemId]: _removedCharges, ...remainingCharges} = state.itemCharges;
        return {
          ...state,
          inventory: state.inventory.filter((itemId) => itemId !== event.itemId),
          inventoryState: remainingInventoryState,
          itemCharges: remainingCharges,
        };
      }
      const reacquiredItem = state.inventoryState[event.itemId]
        ?? state.initialInventoryState[event.itemId]
        ?? createPartyRewardInventory(event.itemId)
        ?? {
          ownerId: null,
          quantity: 1,
          charges: 0,
          maxCharges: null,
          chargeScope: null,
        };
      const quantity = event.quantity ?? reacquiredItem.quantity;
      return {
        ...state,
        inventory: [...new Set([...state.inventory, event.itemId])],
        itemCharges: {...state.itemCharges, [event.itemId]: reacquiredItem.charges},
        inventoryState: {
          ...state.inventoryState,
          [event.itemId]: {...reacquiredItem, quantity},
        },
      };
    }
    case 'item-charge-changed': {
      const currentValue = state.itemCharges[event.itemId] ?? 0;
      const nextValue = event.change.mode === 'set'
        ? event.change.value
        : currentValue + event.change.value;
      return {
        ...state,
        itemCharges: {...state.itemCharges, [event.itemId]: Math.max(0, nextValue)},
        inventoryState: state.inventoryState[event.itemId] ? {
          ...state.inventoryState,
          [event.itemId]: {
            ...state.inventoryState[event.itemId],
            charges: Math.max(0, nextValue),
          },
        } : state.inventoryState,
      };
    }
    case 'clue-revealed': return {...state, clues: [...new Set([...state.clues, event.clueId])]};
    case 'ending-selected': return {...state, selectedEnding: event.endingId};
    case 'story-action-resolved': return {
      ...state,
      lastStoryAction: {
        actionId: event.actionId,
        commandId: event.commandId,
        result: event.result,
        sceneId: event.sceneId,
      },
    };
    case 'roll-entered': return {...state, lastRoll: event.result};
    case 'ability-used': return {...state, usedAbilities: [...new Set([...state.usedAbilities, event.abilityId])]};
    case 'manual-adjustment': return synchronizeStoryDoom(state, applyManualAdjustment(state, event.adjustment), definition);
    case 'npc-action-selected': return {
      ...state,
      npcOverrides: {
        ...state.npcOverrides,
        [event.enemyId]: {
          actionId: event.actionId,
          targetId: event.targetId,
          targetIds: event.targetIds ?? (event.targetId ? [event.targetId] : []),
          confirmed: event.confirmed,
          skipped: event.skipped ?? event.actionId === 'skip',
          explanation: event.explanation ?? '',
        },
      },
    };
    case 'dialogue-preset-chosen': return {
      ...state,
      selectedDialoguePreset: {
        sceneId: event.sceneId,
        presetId: event.presetId,
        speaker: event.speaker,
        text: event.text,
      },
    };
    case 'party-fully-rested': {
      const inventoryState = Object.fromEntries(Object.entries(state.inventoryState).map(([id, item]) => [id,
        id !== event.consumedItemId && item.quantity > 0 && item.maxCharges !== null ? {...item, charges: item.maxCharges} : item,
      ]));
      const heroIds = new Set(state.heroSources.map(hero => hero.id));
      const heroAbilityIds = new Set(state.heroSources.flatMap(hero => hero.abilities.map(ability => ability.id)));
      const recoveredResourceKeys = new Set([
        ...state.heroSources.flatMap(hero => [
          ...hero.abilities.map(ability => `${hero.id}-ability-${ability.id}`),
          ...Object.keys(inventoryState).filter(id => id !== event.consumedItemId).map(id => `${hero.id}-item-${id}`),
        ]),
        ...definition.combatActions.filter(action => heroIds.has(action.characterId) && action.sourceId !== event.consumedItemId)
          .map(action => `${action.characterId}-${action.source}-${action.sourceId}`),
      ]);
      return {...state, inventoryState,
        itemCharges: {...state.itemCharges, ...Object.fromEntries(Object.entries(inventoryState).map(([id, item]) => [id, item.charges]))},
        resourceUses: Object.fromEntries(Object.entries(state.resourceUses).filter(([key]) => !recoveredResourceKeys.has(key))),
        resourceScopes: Object.fromEntries(Object.entries(state.resourceScopes).filter(([key]) => !recoveredResourceKeys.has(key))),
        usedAbilities: state.usedAbilities.filter(id => !heroAbilityIds.has(id)),
        heroHp: {...state.heroMaxHp},
        participantConditions: Object.fromEntries(Object.entries(state.participantConditions)
          .map(([id, conditions]) => [id, id in state.heroMaxHp ? conditions.filter(condition => condition !== 'downed') : conditions])),
      };
    }
    case 'safe-location-rested': {
      const heroHp = {...state.heroHp};
      event.healing.forEach(({heroId, amount}) => {
        if (!(heroId in heroHp)) return;
        heroHp[heroId] = Math.min(
          state.heroMaxHp[heroId] ?? heroHp[heroId],
          heroHp[heroId] + amount,
        );
      });
      return recoverGalleryResourceScopes({
        ...state,
        heroHp,
        currentLocationId: event.locationId,
        locationStates: {...state.locationStates, [event.locationId]: 'rested'},
      }, ['location']);
    }
    case 'combat-started':
    case 'combat-attack-resolved':
    case 'combat-attack-cancelled':
    case 'combat-damage-resolved':
    case 'healing-applied':
    case 'combat-action-used':
    case 'combat-action-selected':
    case 'combat-item-equipped':
    case 'combat-stance-changed':
    case 'combat-enemies-summoned':
    case 'combat-allies-summoned':
    case 'combat-ac-modifier-applied':
    case 'combat-attack-modifier-applied':
    case 'combat-stat-modifier-applied':
    case 'combat-status-applied':
    case 'combat-status-removed':
    case 'combat-saving-throw-requested':
    case 'combat-saving-throw-resolved':
    case 'combat-condition-changed':
    case 'combat-weakness-exposed':
    case 'combat-weakness-cleared':
    case 'combat-log-added':
    case 'combat-phase-advanced':
    case 'turn-advanced':
    case 'combat-ended':
    case 'combat-cleared': {
      const previousCombat = state.combat;
      const downedParticipantIds = new Set(Object.entries(state.participantConditions)
        .filter(([, conditions]) => conditions.includes('downed'))
        .map(([participantId]) => participantId));
      const next = applyCombatEvent(
        state.combat,
        state.heroHp,
        event,
        definition,
        downedParticipantIds,
      );
      const clearsRoll = event.type === 'combat-started'
        || event.type === 'combat-attack-resolved'
        || event.type === 'combat-damage-resolved'
        || event.type === 'healing-applied'
        || event.type === 'combat-saving-throw-resolved';
      let nextState: GallerySessionSnapshot = {
        ...state,
        activeView: event.type === 'combat-started' ? 'combat' : state.activeView,
        lastRoll: clearsRoll ? null : state.lastRoll,
        combat: next.combat,
        heroHp: next.heroHp,
      };
      if (event.type === 'combat-action-used') {
        nextState = {
          ...nextState,
          resourceUses: {
            ...nextState.resourceUses,
            [event.resourceKey]: (nextState.resourceUses[event.resourceKey] ?? 0) + 1,
          },
          resourceScopes: {...nextState.resourceScopes, [event.resourceKey]: event.scope},
        };
      }
      if (event.type === 'combat-started') {
        nextState = recoverGalleryResourceScopes(nextState, ['turn', 'round', 'battle']);
      }
      if (event.type === 'turn-advanced') {
        nextState = recoverGalleryResourceScopes(
          nextState,
          next.combat && previousCombat && next.combat.round > previousCombat.round
            ? ['turn', 'round']
            : ['turn'],
        );
      }
      return nextState;
    }
    case 'scene-checkpoint-restored':
    case 'action-corrected': return state;
  }
}

export function replayGalleryEvents(
  events: GalleryEvent[],
  definition: GalleryGameplayDefinition,
) {
  const firstEvent = events[0];
  if (!firstEvent || firstEvent.type !== 'session-started') {
    throw new Error('Gallery session replay requires session-started as the first event.');
  }
  const parsed = parseGalleryEventLog(events, {
    campaignId: firstEvent.seed.campaignId,
    definitionId: definition.id,
    definitionVersion: definition.version,
  });
  if (!parsed.ok) throw new Error(`Invalid gallery event log: ${parsed.error}`);
  const effectiveEvents = getEffectiveGalleryEvents(parsed.events);
  const correctedCommands = new Set(
    effectiveEvents.filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  );
  const base = createGallerySession(firstEvent.seed);
  const replayBase: GallerySessionSnapshot = {...base, events: []};
  const nextState = effectiveEvents
    .filter((event) => event.type === 'action-corrected' || !correctedCommands.has(event.commandId))
    .reduce<GallerySessionSnapshot>((state, event) => applyGalleryEvent(state, event, definition), replayBase);

  return {...nextState, events: effectiveEvents};
}

export function getLastUndoableCommandId(events: GalleryEvent[]) {
  events = getEffectiveGalleryEvents(events);
  const correctedCommandIds = new Set(
    events
      .filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  );
  return [...events].reverse().find(
    (event) => event.type !== 'action-corrected'
      && event.type !== 'session-started'
      && !correctedCommandIds.has(event.commandId),
  )?.commandId;
}

export function getLastUndoableCommandIdForScene(
  events: GalleryEvent[],
  sceneScopeId: string,
) {
  if (!sceneScopeId) return undefined;
  events = getEffectiveGalleryEvents(events);
  const correctedCommandIds = new Set(
    events
      .filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  );
  return [...events].reverse().find(
    (event) => event.type !== 'action-corrected'
      && event.type !== 'session-started'
      && event.sceneScopeId === sceneScopeId
      && !correctedCommandIds.has(event.commandId),
  )?.commandId;
}

export function createSafeLocationRestCommand(
  state: GallerySessionSnapshot,
  locationId: string,
  rolls: Record<string, number>,
): Omit<Extract<GalleryEvent, {type: 'safe-location-rested'}>, 'id' | 'commandId'> | null {
  if (state.combat || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(locationId)) return null;
  const healing = state.heroSources.map((hero) => {
    const roll = rolls[hero.id];
    if (!Number.isInteger(roll) || roll < 1 || roll > 8) return null;
    const currentHp = state.heroHp[hero.id] ?? hero.hp;
    const maxHp = state.heroMaxHp[hero.id] ?? hero.maxHp;
    return {heroId: hero.id, roll, amount: Math.max(0, Math.min(roll, maxHp - currentHp))};
  });
  if (healing.some((entry) => entry === null)) return null;
  return {
    type: 'safe-location-rested',
    locationId,
    healing: healing as Array<{heroId: string; roll: number; amount: number}>,
  };
}

export function resolveCheck(
  definition: GalleryCheckDefinitionLike,
  hero: Pick<GalleryHeroSource, 'id' | 'stats'>,
  stat: HeroStat,
  rolls: number[],
  automatic = false,
): GalleryRollResult {
  const modifier = hero.stats[stat] ?? 0;
  const natural = rolls.length ? Math.max(...rolls) : 20;
  const total = automatic ? definition.dc : natural + modifier;
  const success = automatic || natural === 20 || (natural !== 1 && total >= definition.dc);
  return {
    checkId: definition.id,
    heroId: hero.id,
    stat,
    rolls,
    modifier,
    total,
    dc: definition.dc,
    success,
    automatic,
    text: success ? definition.successText : definition.failureText,
  };
}

interface GalleryCheckDefinitionLike {
  id: string;
  dc: number;
  successText: string;
  failureText: string;
}
