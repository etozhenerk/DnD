import type {GalleryGameplayDefinition, GalleryHeroSource, GalleryView, HeroStat} from './galleryGameplay';
import {applyCombatEvent} from '../../combat/model/combatRules';
import type {CombatEvent, CombatPendingAttack, CombatState} from '../../combat/model/types';

export {
  getPendingDamageRange,
  resolveAttackAgainstArmor,
  resolvePendingDamage,
  rollDamage,
  rollDie,
} from '../../combat/model/combatRules';

export const GALLERY_SESSION_VERSION = 13;

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

export type GalleryEvent =
  | {id: string; commandId: string; type: 'view-changed'; view: GalleryView}
  | {id: string; commandId: string; type: 'flag-changed'; flag: string; value: boolean}
  | {id: string; commandId: string; type: 'counter-changed'; counter: 'timePressure' | 'preFinalCombats'; delta: number}
  | {id: string; commandId: string; type: 'item-changed'; itemId: string; acquired: boolean}
  | {id: string; commandId: string; type: 'clue-revealed'; clueId: string}
  | {id: string; commandId: string; type: 'roll-entered'; result: GalleryRollResult}
  | {id: string; commandId: string; type: 'ability-used'; abilityId: string}
  | CombatEvent
  | {id: string; commandId: string; type: 'action-corrected'; correctedCommandId: string};

export interface GallerySessionSnapshot {
  version: typeof GALLERY_SESSION_VERSION;
  campaignId: string;
  activeView: GalleryView;
  flags: Record<string, boolean>;
  counters: {
    timePressure: number;
    preFinalCombats: number;
  };
  inventory: string[];
  clues: string[];
  heroHp: Record<string, number>;
  usedAbilities: string[];
  lastRoll: GalleryRollResult | null;
  combat: GalleryCombatState | null;
  events: GalleryEvent[];
}

export function createGallerySession(
  campaignId: string,
  heroes: GalleryHeroSource[],
  existingInventory: string[] = [],
): GallerySessionSnapshot {
  return {
    version: GALLERY_SESSION_VERSION,
    campaignId,
    activeView: 'gallery',
    flags: {},
    counters: {timePressure: 0, preFinalCombats: 0},
    inventory: [...new Set(existingInventory)],
    clues: [],
    heroHp: Object.fromEntries(heroes.map((hero) => [hero.id, hero.hp])),
    usedAbilities: [],
    lastRoll: null,
    combat: null,
    events: [],
  };
}

function applyEvent(
  state: GallerySessionSnapshot,
  event: GalleryEvent,
  definition: GalleryGameplayDefinition,
): GallerySessionSnapshot {
  switch (event.type) {
    case 'view-changed': return {...state, activeView: event.view, lastRoll: null};
    case 'flag-changed': return {...state, flags: {...state.flags, [event.flag]: event.value}};
    case 'counter-changed': return {
      ...state,
      counters: {...state.counters, [event.counter]: Math.max(0, state.counters[event.counter] + event.delta)},
    };
    case 'item-changed': return {
      ...state,
      inventory: event.acquired
        ? [...new Set([...state.inventory, event.itemId])]
        : state.inventory.filter((itemId) => itemId !== event.itemId),
    };
    case 'clue-revealed': return {...state, clues: [...new Set([...state.clues, event.clueId])]};
    case 'roll-entered': return {...state, lastRoll: event.result};
    case 'ability-used': return {...state, usedAbilities: [...new Set([...state.usedAbilities, event.abilityId])]};
    case 'combat-started':
    case 'combat-attack-resolved':
    case 'combat-damage-resolved':
    case 'healing-applied':
    case 'combat-action-used':
    case 'combat-action-selected':
    case 'combat-item-equipped':
    case 'combat-weakness-exposed':
    case 'turn-advanced':
    case 'combat-ended': {
      const next = applyCombatEvent(state.combat, state.heroHp, event, definition);
      const clearsRoll = event.type === 'combat-started'
        || event.type === 'combat-attack-resolved'
        || event.type === 'combat-damage-resolved'
        || event.type === 'healing-applied';
      return {
        ...state,
        activeView: event.type === 'combat-started' ? 'combat' : state.activeView,
        lastRoll: clearsRoll ? null : state.lastRoll,
        combat: next.combat,
        heroHp: next.heroHp,
      };
    }
    case 'action-corrected': return state;
  }
}

export function replayGalleryEvents(
  base: GallerySessionSnapshot,
  events: GalleryEvent[],
  definition: GalleryGameplayDefinition,
) {
  const correctedCommands = new Set(
    events.filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  );
  const replayBase: GallerySessionSnapshot = {...base, events: []};
  const nextState = events
    .filter((event) => event.type === 'action-corrected' || !correctedCommands.has(event.commandId))
    .reduce<GallerySessionSnapshot>((state, event) => applyEvent(state, event, definition), replayBase);

  return {...nextState, events};
}

export function resolveCheck(
  definition: GalleryCheckDefinitionLike,
  hero: GalleryHeroSource,
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
