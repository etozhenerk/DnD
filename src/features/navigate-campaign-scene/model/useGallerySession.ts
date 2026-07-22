import {useCallback, useEffect, useMemo, useState} from 'react';
import type {
  GalleryGameplayDefinition,
  GalleryHeroSource,
  GalleryView,
  HeroStat,
} from '../../../entities/campaign-session/model/galleryGameplay';
import {
  createGallerySession,
  replayGalleryEvents,
  resolveCheck,
  rollDie,
} from '../../../entities/campaign-session/model/gallerySession';
import type {GalleryEvent, GallerySessionSnapshot} from '../../../entities/campaign-session/model/gallerySession';
import {
  createApplyCombatDamageCommand,
  createEnemyAttackCommand,
  createEquipCombatItemCommand,
  createHeroAttackCommand,
  createSelectCombatActionCommand,
  createStartCombatCommand,
  createUseCombatActionCommand,
  resolveCombatWeaknessManeuver,
} from '../../run-combat/model/combatCommands';
import {clearGallerySessionEvents, readGallerySessionEvents, writeGallerySessionEvents} from './gallerySessionStorage';
import {readCampaignInventoryState, writeCampaignInventoryState} from './sessionStorage';

const galleryGrantedItemIds = new Set([
  'pussy-sultan-golden-scepter-microphone',
  'pussy-sultan-womanizer',
  'closed-bar-token',
]);

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function eventFactory(commandId: string) {
  return <T extends Omit<GalleryEvent, 'id' | 'commandId'>>(event: T): GalleryEvent => ({
    ...event,
    id: createId('event'),
    commandId,
  } as GalleryEvent);
}

export function useGallerySession(
  definition: GalleryGameplayDefinition,
  heroes: GalleryHeroSource[],
  legacySceneIds: string[],
) {
  const legacyInventory = useMemo(
    () => (readCampaignInventoryState(definition.campaignId, legacySceneIds)?.revealedInspectableIds ?? [])
      .filter((itemId) => !galleryGrantedItemIds.has(itemId)),
    [definition.campaignId, legacySceneIds],
  );
  const baseState = useMemo(
    () => createGallerySession(definition.campaignId, heroes, legacyInventory),
    [definition.campaignId, heroes, legacyInventory],
  );
  const [events, setEvents] = useState<GalleryEvent[]>(
    () => readGallerySessionEvents(definition.campaignId),
  );
  const state = useMemo(
    () => replayGalleryEvents(baseState, events, definition),
    [baseState, definition, events],
  );

  useEffect(() => {
    writeGallerySessionEvents(definition.campaignId, events);
    const existing = readCampaignInventoryState(definition.campaignId, legacySceneIds);
    const retainedRevealed = (existing?.revealedInspectableIds ?? [])
      .filter((itemId) => !galleryGrantedItemIds.has(itemId));
    const retainedViewed = (existing?.viewedInspectableIds ?? [])
      .filter((itemId) => !galleryGrantedItemIds.has(itemId) || state.inventory.includes(itemId));
    writeCampaignInventoryState({
      campaignId: definition.campaignId,
      revealedInspectableIds: [...new Set([...retainedRevealed, ...state.inventory])],
      viewedInspectableIds: retainedViewed,
    });
  }, [definition.campaignId, events, legacySceneIds, state.inventory]);

  const appendEvents = useCallback((nextEvents: GalleryEvent[]) => {
    setEvents((current) => [...current, ...nextEvents]);
  }, []);

  const changeView = useCallback((view: GalleryView) => {
    const commandId = createId('view');
    const makeEvent = eventFactory(commandId);
    const wakesKraken = view === 'gallery'
      && state.flags['scepter-recovered']
      && !state.flags['rail-kraken-resolved'];
    const nextEvents: GalleryEvent[] = [];
    if (wakesKraken) {
      nextEvents.push(makeEvent({
        type: 'flag-changed',
        flag: 'rail-kraken-awakened-by-scepter',
        value: true,
      }));
    }
    nextEvents.push(makeEvent({type: 'view-changed', view: wakesKraken ? 'kraken' : view}));
    appendEvents(nextEvents);
  }, [appendEvents, state.flags]);

  const acceptPussyTask = useCallback(() => {
    if (!state.flags['pussy-trust-max']) return;
    const commandId = createId('pussy-task');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'pussy-quest-accepted', value: true}),
      makeEvent({type: 'flag-changed', flag: 'vip-prop-room-open', value: true}),
      makeEvent({type: 'view-changed', view: 'gallery'}),
    ]);
  }, [appendEvents, state.flags]);

  const revealPussyLore = useCallback(() => {
    if (!state.flags['pussy-acquainted'] || state.flags['pussy-lore-revealed']) return;
    const commandId = createId('pussy-lore');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'pussy-lore-revealed', value: true}),
    ]);
  }, [appendEvents, state.flags]);

  const resolveSceneCheck = useCallback((
    checkId: string,
    heroId: string,
    stat: HeroStat,
    providedRolls?: number[],
    abilityId?: string,
  ) => {
    const check = definition.checks.find((item) => item.id === checkId);
    const hero = heroes.find((item) => item.id === heroId);
    if (!check || !hero || !check.stats.includes(stat)) return;
    if (check.eligibleHeroIds && !check.eligibleHeroIds.includes(heroId)) return;
    if (checkId === 'earn-pussy-acquaintance' && (state.flags['pussy-acquainted'] || state.flags['pussy-acquaintance-failed'])) return;
    if (checkId === 'earn-pussy-trust' && (!(state.flags['pussy-lore-revealed'] || state.flags['pussy-acquaintance-failed']) || state.flags['pussy-trust-max'] || state.flags['pussy-trust-refused'])) return;
    if (checkId === 'intimidate-pussy' && (!(state.flags['pussy-trust-refused'] || state.flags['pussy-acquaintance-failed']) || state.flags['pussy-path-resolved'] || state.flags['pussy-guards-summoned'])) return;
    if (checkId === 'steal-pussy-key' && (!state.flags['pussy-trust-refused'] || state.flags['archive-key-recovered'] || state.flags['pussy-guards-summoned'])) return;
    if (abilityId && state.usedAbilities.includes(abilityId)) return;

    const automatic = Boolean(abilityId && abilityId === check.automaticSuccessAbilityId);
    const advantage = Boolean(abilityId && abilityId === check.advantageAbilityId);
    const rolls = automatic ? [] : providedRolls?.length
      ? providedRolls
      : Array.from({length: advantage ? 2 : 1}, () => rollDie(20));
    const effectiveDc = check.dc + (check.dcModifiers ?? [])
      .filter((modifier) => state.flags[modifier.flag])
      .reduce((sum, modifier) => sum + modifier.delta, 0);
    const result = resolveCheck({...check, dc: effectiveDc}, hero, stat, rolls, automatic);
    const commandId = createId(checkId);
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [makeEvent({type: 'roll-entered', result})];
    if (abilityId) nextEvents.push(makeEvent({type: 'ability-used', abilityId}));

    if (checkId === 'earn-pussy-acquaintance') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-acquainted', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-lore-revealed', value: true}),
        );
      } else {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-acquaintance-failed', value: true}),
          makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}),
        );
      }
    }

    if (checkId === 'earn-pussy-trust') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-acquainted', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-trust-max', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-yesterday-revealed', value: true}),
          makeEvent({type: 'clue-revealed', clueId: 'egorik-nastya-service-door'}),
        );
      } else {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-trust-refused', value: true}),
          makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}),
        );
      }
    }

    if (checkId === 'intimidate-pussy') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-acquainted', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-path-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-intimidated', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-yesterday-revealed', value: true}),
          makeEvent({type: 'flag-changed', flag: 'archive-key-recovered', value: true}),
          makeEvent({type: 'clue-revealed', clueId: 'egorik-nastya-service-door'}),
        );
      } else {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-guards-summoned', value: true}),
          makeEvent({type: 'view-changed', view: 'guards'}),
        );
      }
    }

    if (checkId === 'steal-pussy-key') {
      nextEvents.push(makeEvent({type: 'ability-used', abilityId: 'tiny-size'}));
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-key-stolen', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-path-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'archive-key-recovered', value: true}),
        );
      } else {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-guards-summoned', value: true}),
          makeEvent({type: 'view-changed', view: 'guards'}),
        );
      }
    }

    if (checkId === 'recover-pussy-scepter') {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'scepter-recovered', value: true}),
        makeEvent({type: 'item-changed', itemId: 'pussy-sultan-golden-scepter-microphone', acquired: true}),
      );
      if (!result.success) nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
    }

    if (checkId === 'calm-alexis') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'alexis-calmed', value: true}),
          makeEvent({type: 'flag-changed', flag: 'archive-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'bar-route-known', value: true}),
          makeEvent({type: 'flag-changed', flag: 'closed-bar-token', value: true}),
          makeEvent({type: 'item-changed', itemId: 'closed-bar-token', acquired: true}),
          makeEvent({type: 'clue-revealed', clueId: 'egorik-lead'}),
          makeEvent({type: 'clue-revealed', clueId: 'dressing-room-route'}),
        );
      } else {
        nextEvents.push(makeEvent({type: 'flag-changed', flag: 'alexis-refused', value: true}));
      }
    }

    if (checkId === 'search-hotel-archive') {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'archive-resolved', value: true}),
        makeEvent({type: 'flag-changed', flag: 'bar-route-known', value: true}),
        makeEvent({type: 'clue-revealed', clueId: 'dressing-room-route'}),
      );
      if (!result.success) nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
    }

    if (checkId === 'stop-rail-kraken') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'rail-kraken-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'rail-kraken-disabled', value: true}),
          makeEvent({type: 'view-changed', view: 'gallery'}),
        );
      } else {
        const encounter = definition.encounters.find((item) => item.id === 'rail-prop-kraken');
        if (!encounter) return;
        const initiatives = [...heroes.map((item) => ({
          id: item.id,
          score: rollDie(20) + (item.stats.dexterity ?? 0),
        })), {id: encounter.id, score: rollDie(20) + encounter.initiative}]
          .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
          .map((item) => item.id);
        nextEvents.push(
          makeEvent({type: 'counter-changed', counter: 'preFinalCombats', delta: 1}),
          makeEvent({type: 'combat-started', encounterId: encounter.id, initiativeOrder: initiatives}),
        );
      }
    }

    appendEvents(nextEvents);
    return result;
  }, [appendEvents, definition, heroes, state.flags, state.usedAbilities]);

  const returnScepter = useCallback(() => {
    if (!state.flags['pussy-trust-max'] || !state.flags['pussy-quest-accepted'] || !state.flags['scepter-recovered'] || state.flags['pussy-reward-received']) return;
    const commandId = createId('return-scepter');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'pussy-reward-received', value: true}),
      makeEvent({type: 'flag-changed', flag: 'archive-key-recovered', value: true}),
      makeEvent({type: 'item-changed', itemId: 'pussy-sultan-golden-scepter-microphone', acquired: false}),
      makeEvent({type: 'item-changed', itemId: 'pussy-sultan-womanizer', acquired: true}),
    ]);
  }, [appendEvents, state.flags]);

  const pressureAlexis = useCallback(() => {
    const commandId = createId('alexis-pressure');
    const makeEvent = eventFactory(commandId);
    appendEvents([makeEvent({type: 'flag-changed', flag: 'alexis-refused', value: true})]);
  }, [appendEvents]);

  const disableKrakenWithLinda = useCallback(() => {
    const commandId = createId('linda-kraken');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'ability-used', abilityId: 'tiny-size'}),
      makeEvent({type: 'flag-changed', flag: 'rail-kraken-resolved', value: true}),
      makeEvent({type: 'flag-changed', flag: 'rail-kraken-disabled', value: true}),
      makeEvent({type: 'view-changed', view: 'gallery'}),
    ]);
  }, [appendEvents]);

  const startCombat = useCallback((encounterId = 'rail-prop-kraken') => {
    if (state.combat) return;
    const encounter = definition.encounters.find((item) => item.id === encounterId);
    if (!encounter) return;
    const commandId = createId('combat');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'counter-changed', counter: 'preFinalCombats', delta: 1}),
      makeEvent(createStartCombatCommand(encounter, heroes)),
    ]);
  }, [appendEvents, definition.encounters, heroes, state.combat]);

  const heroAttack = useCallback((heroId: string, targetEnemyId: string, providedRoll?: number) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createHeroAttackCommand(
      {combat, definition, heroes, heroHp: state.heroHp},
      heroId,
      targetEnemyId,
      providedRoll,
    );
    if (!events) return;
    const commandId = createId('hero-attack');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const exposeCombatWeakness = useCallback((heroId: string, stat: HeroStat, providedRoll?: number) => {
    const combat = state.combat;
    if (!combat) return;
    const resolution = resolveCombatWeaknessManeuver(
      {combat, definition, heroes, heroHp: state.heroHp},
      heroId,
      stat,
      providedRoll,
    );
    if (!resolution) return;
    const commandId = createId('combat-weakness');
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [makeEvent({
      type: 'roll-entered',
      result: {
        checkId: `${combat.encounterId}-weakness`,
        heroId,
        stat,
        rolls: [resolution.natural],
        modifier: resolution.modifier,
        total: resolution.total,
        dc: resolution.encounter.weakness.dc,
        success: resolution.success,
        automatic: false,
        text: resolution.success
          ? resolution.encounter.weakness.text
          : 'Манёвр не удаётся, противник удерживает строй.',
      },
    })];
    nextEvents.push(...resolution.events.map(makeEvent));
    appendEvents(nextEvents);
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const selectCombatAction = useCallback((actionId: string) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createSelectCombatActionCommand(
      {combat, definition, heroes, heroHp: state.heroHp},
      actionId,
    );
    if (!events) return;
    const commandId = createId('select-combat-action');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const useCombatAction = useCallback((actionId: string, selectedTargetId?: string, providedRoll?: number) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createUseCombatActionCommand(
      {combat, definition, heroes, heroHp: state.heroHp},
      actionId,
      selectedTargetId,
      providedRoll,
    );
    if (!events) return;
    const commandId = createId('combat-action');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const equipCombatItem = useCallback((actionId: string | null) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createEquipCombatItemCommand(
      {combat, definition, heroes, heroHp: state.heroHp},
      actionId,
    );
    if (!events) return;
    const commandId = createId('equip-combat-item');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const enemyAttack = useCallback((targetId: string, providedRoll?: number) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createEnemyAttackCommand(
      {combat, definition, heroes, heroHp: state.heroHp},
      targetId,
      providedRoll,
    );
    if (!events) return;
    const commandId = createId('enemy-attack');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const applyCombatDamage = useCallback((rawDiceTotal: number) => {
    const combat = state.combat;
    if (!combat) return;
    const resolution = createApplyCombatDamageCommand(
      {combat, definition, heroes, heroHp: state.heroHp},
      rawDiceTotal,
    );
    if (!resolution) return;
    const commandId = createId('combat-damage');
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = resolution.events.map(makeEvent);
    if (resolution.victory) {
      if (combat.encounterId === 'rail-prop-kraken') nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'rail-kraken-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'rail-kraken-defeated-in-combat', value: true}),
      );
      if (combat.encounterId === 'hotel-vip-guards') nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-acquainted', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-lore-revealed', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-guards-defeated', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-path-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-yesterday-revealed', value: true}),
          makeEvent({type: 'flag-changed', flag: 'archive-key-recovered', value: true}),
          makeEvent({type: 'clue-revealed', clueId: 'egorik-service-door'}),
      );
    }

    appendEvents(nextEvents);
  }, [appendEvents, definition, heroes, state.combat, state.heroHp]);

  const undoLastCommand = useCallback(() => {
    const correctedCommandIds = new Set(
      events
        .filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
        .map((event) => event.correctedCommandId),
    );
    const lastCommandId = [...events].reverse().find(
      (event) => event.type !== 'action-corrected' && !correctedCommandIds.has(event.commandId),
    )?.commandId;
    if (!lastCommandId) return;
    const commandId = createId('undo');
    const makeEvent = eventFactory(commandId);
    appendEvents([makeEvent({type: 'action-corrected', correctedCommandId: lastCommandId})]);
  }, [appendEvents, events]);

  const resetSession = useCallback(() => {
    clearGallerySessionEvents(definition.campaignId);
    setEvents([]);
  }, [definition.campaignId]);

  return {
    state,
    changeView,
    revealPussyLore,
    acceptPussyTask,
    resolveSceneCheck,
    returnScepter,
    pressureAlexis,
    disableKrakenWithLinda,
    startCombat,
    heroAttack,
    exposeCombatWeakness,
    selectCombatAction,
    useCombatAction,
    equipCombatItem,
    enemyAttack,
    applyCombatDamage,
    undoLastCommand,
    resetSession,
  };
}

export type GallerySessionController = ReturnType<typeof useGallerySession>;
export type {GallerySessionSnapshot};
