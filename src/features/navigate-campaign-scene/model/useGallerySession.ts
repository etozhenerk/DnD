import {formatDamageCalculation} from '../../../shared/lib/dice/diceExpression';
import {getManagedInventoryIds, toCampaignInspectableId} from '../../../entities/campaign-session/model/inventoryPresentation';
import {getEffectiveGalleryEvents} from '../../../entities/campaign-session/model/galleryCheckpoint';
import {canResolveOlvaVerdict, olvaQuest} from '../../../entities/campaign-session/model/olvaQuest';
import {createOlvaRestCommand, getOlvaRewardOutcome} from '../../../entities/campaign-session/model/olvaRest';
import {readCarriedPartyRewards, writePartyRewards} from './partyRewardStorage';
import {getAutomaticCheckReward, GREY_WIESE_PERFUME_ID} from '../../../entities/campaign-session/model/partyRewards';
import {getCampaignItemSkin} from '../../../entities/campaign-session/model/itemSkins';
import {getStoryActionAvailability, getStoryCheckSettings} from './storyActionRules';
import {createBossSequenceEvents, type BossSequenceCommand} from './bossSequenceCommands';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {
  GalleryGameplayDefinition,
  GalleryHeroSource,
  GalleryView,
  HeroStat,
} from '../../../entities/campaign-session/model/galleryGameplay';
import {isGalleryStoryConditionMet} from '../../../entities/campaign-session/model/galleryGameplay';
import type {
  DialoguePresetDefinition,
  DialoguePresetEffect,
} from '../../../entities/campaign-session/model/dialoguePresets';
import {
  createSafeLocationRestCommand,
  getLastUndoableCommandId,
  getLastUndoableCommandIdForScene,
  replayGalleryEvents,
  resolveCheck,
  resolveAttackAgainstArmor,
  rollDamage,
  rollDie,
} from '../../../entities/campaign-session/model/gallerySession';
import {
  createGallerySessionStartedEvent,
  parseGalleryEventLog,
  type GallerySessionJournalExpectation,
} from '../../../entities/campaign-session/model/gallerySessionJournal';
import {
  getParticipantConditionRule,
  resolveNextFormalActionConditions,
} from '../../../entities/campaign-session/model/conditionRules';
import {
  canAttemptPropRoomScepterCheck,
  isPropRoomScepterCheckId,
  resolvePropRoomScepterCheck,
} from '../../../entities/campaign-session/model/propRoomScepterRules';
import {
  canAttemptPussyAudienceCheck,
  isPussyHostileRoute,
  PUSSY_BAR_PASSES_ITEM_ID,
  PUSSY_BAR_PASSES_QUANTITY,
} from '../../../entities/campaign-session/model/pussyAudienceRules';
import {
  canStartDanceGuardCombat,
  resolveDanceTrackSelection,
} from '../../../entities/campaign-session/model/dancePuzzleRules';
import {penisuelaFinalBoss} from '../../../entities/final-boss/model/data';
import {
  areAllHeroesDown,
  getFinalBossEndingOutcome,
  getFinalBossEffectiveAttackBonus,
  getFinalBossEffectiveHeroAttackBonus,
  getFinalBossPhase,
  getFinalBossPhaseFloor,
  getFinalBossRuntimeAttackBonus,
  isFinalBossPlanAvailable,
  isFinalBossD20,
  resolveFinalBossAttackRoll,
  resolveFinalBossDamageRoll,
  resolveFinalBossInitiative,
  resolveFinalBossPlanCheck,
  resolveFinalBossSavingThrow,
} from '../../../entities/final-boss/model/finalBossRules';
import type {
  FinalBossEnemyTurnRollInput,
  FinalBossPlanReactionInput,
} from '../../../entities/final-boss/model/finalBossRules';
import type {FinalBossPlanDefinition} from '../../../entities/final-boss/model/types';
import type {CombatEventInput, CombatStatusState} from '../../../entities/combat/model/types';
import type {
  GalleryCounter,
  GalleryEvent,
  GalleryManualAdjustment,
  GalleryNumericChange,
  GallerySessionSnapshot,
  GalleryStoryOutcome,
} from '../../../entities/campaign-session/model/gallerySession';
import {
  createApplyCombatDamageCommand,
  createClearCombatCommand,
  createCombatActionUsageEvent,
  createEnemyAttackCommand,
  createEquipCombatItemCommand,
  createHeroAttackCommand,
  createResolveCombatSavingThrowCommand,
  createSelectCombatActionCommand,
  createStartCombatCommand,
  createSummonedAllyAttackCommand,
  createUseCombatActionCommand,
  isCombatActionSourceAvailable,
  resolveAlliedCombatSavingThrowReactions,
  resolveCombatWeaknessManeuver,
} from '../../run-combat/model/combatCommands';
import {clearGallerySessionEvents, readGallerySessionEvents, writeGallerySessionEvents} from './gallerySessionStorage';
import {
  clearCampaignSceneAndInventoryState,
  readCampaignInventoryState,
  writeCampaignInventoryState,
} from './sessionStorage';
import {
  createNpcDecisionActors,
  createNpcDecisionView,
  getNpcBehaviorAction,
} from './npcDecision';

const scepterItemId = 'pussy-sultan-golden-scepter-microphone';
const archiveKeyItemId = 'pussy-sultan-archive-key';
const womanizerItemId = 'pussy-sultan-womanizer';
const dressingRoomKeyItemId = 'alexis-dressing-room-key';
const guestBungalowPassItemId = 'guest-bungalow-pass';

const knownGalleryManagedInspectableIds: string[] = [
  scepterItemId,
  archiveKeyItemId,
  womanizerItemId,
  dressingRoomKeyItemId,
  guestBungalowPassItemId,
  PUSSY_BAR_PASSES_ITEM_ID,
  'alexis-fashion-expert-certificate',
  'closed-bar-token',
  'troupe-bungalow-passes',
  'red-button-18-plus',
  'clear-choice-confirmation',
  'egorik-recording',
  'recording-for-egorik',
];
const galleryCounters = new Set<GalleryCounter>([
  'doom',
  'kreed-evidence-count',
  'show18-contradictions-broken',
  'timePressure',
  'preFinalCombats',
  'show18LiveSuccesses',
  'show18TeleprompterSuccesses',
  'show18Failures',
  'groomTunnelSuccesses',
  'groomTunnelFailures',
  'restoreLogSuccesses',
  'restoreLogFailures',
]);

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

function isSafeSessionId(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/u.test(value);
}

function isFiniteIntegerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function eventFactory(commandId: string) {
  return <T extends Omit<GalleryEvent, 'id' | 'commandId'>>(event: T): GalleryEvent => ({
    ...event,
    id: createId('event'),
    commandId,
  } as GalleryEvent);
}

function createCombatItemChargeEvents(
  actionEvents: CombatEventInput[],
  definition: GalleryGameplayDefinition,
  inventoryState: GallerySessionSnapshot['inventoryState'],
  makeEvent: ReturnType<typeof eventFactory>,
) {
  const consumedSourceIds = new Set<string>();
  return actionEvents.flatMap((event): GalleryEvent[] => {
    if (event.type !== 'combat-action-used' || consumedSourceIds.has(event.sourceId)) return [];
    const action = definition.combatActions.find((candidate) => candidate.id === event.actionId);
    const item = inventoryState[event.sourceId];
    if (action?.source !== 'item' || !item || item.maxCharges === null) return [];
    consumedSourceIds.add(event.sourceId);
    return [makeEvent({
      type: 'item-charge-changed',
      itemId: event.sourceId,
      change: {mode: 'delta', value: -1},
    })];
  });
}

function getEffectiveParticipantConditions(
  state: GallerySessionSnapshot,
  participantId: string,
) {
  const conditions = new Set(state.participantConditions[participantId] ?? []);
  if (state.flags[`show18-shamed-${participantId}`]) conditions.add('shamed');
  if (state.flags[`show18-assigned-role-${participantId}`]) conditions.add('assigned-role');
  return [...conditions];
}

function createConsumedConditionEvents(
  state: GallerySessionSnapshot,
  participantId: string,
  conditionId: 'shamed' | 'assigned-role',
  makeEvent: ReturnType<typeof eventFactory>,
) {
  const nextEvents: GalleryEvent[] = [];
  const flag = `show18-${conditionId}-${participantId}`;
  if (state.flags[flag]) nextEvents.push(makeEvent({type: 'flag-changed', flag, value: false}));
  if (state.participantConditions[participantId]?.includes(conditionId)) {
    nextEvents.push(makeEvent({
      type: 'manual-adjustment',
      label: `${participantId}: состояние ${conditionId} автоматически снято`,
      reason: `Формальный эффект состояния ${conditionId} израсходован следующим действием.`,
      adjustment: {kind: 'condition', participantId, conditionId, active: false},
    }));
  }
  return nextEvents;
}

function createFinalBossNarrativeConditionLogEvents(
  state: GallerySessionSnapshot,
  participantId: string,
  participantName: string,
  makeEvent: ReturnType<typeof eventFactory>,
) {
  const narrativeConditions = getEffectiveParticipantConditions(state, participantId).filter(
    (conditionId) => getParticipantConditionRule(conditionId).effect === 'no-mechanical-effect',
  );
  return narrativeConditions.length === 0 ? [] : [makeEvent({
    type: 'combat-log-added' as const,
    text: `${participantName}: состояния ${narrativeConditions.join(', ')} учтены как повествовательные и не меняют числа Последнего дубля.`,
  })];
}

function getActiveManualParticipantStatValue(
  events: GalleryEvent[],
  participantId: string,
  field: Extract<GalleryManualAdjustment, {kind: 'participant-stat'}>['field'],
) {
  const correctedCommandIds = new Set(events.flatMap((event) => (
    event.type === 'action-corrected' ? [event.correctedCommandId] : []
  )));
  const event = [...events].reverse().find((candidate) => (
    candidate.type === 'manual-adjustment'
    && !correctedCommandIds.has(candidate.commandId)
    && candidate.adjustment.kind === 'participant-stat'
    && candidate.adjustment.participantId === participantId
    && candidate.adjustment.field === field
  ));
  return event?.type === 'manual-adjustment'
    && event.adjustment.kind === 'participant-stat'
    ? event.adjustment.value
    : undefined;
}

function createNpcSelectionEvents(
  makeEvent: ReturnType<typeof eventFactory>,
  input: {
    actorId: string;
    actorName: string;
    actionId: string;
    actionName: string;
    targetIds: string[];
    targetNames: string[];
    explanation: string;
    skipped?: boolean;
  },
): GalleryEvent[] {
  const skipped = input.skipped ?? input.actionId === 'skip';
  const targetId = input.targetIds[0] ?? '';
  const targetLabel = input.targetNames.length ? ` → ${input.targetNames.join(', ')}` : '';
  const label = `${input.actorName}: ${skipped ? 'пропуск хода' : input.actionName}${targetLabel} (подтверждено)`
    .slice(0, 140);
  const adjustment: Extract<GalleryManualAdjustment, {kind: 'npc-override'}> = {
    kind: 'npc-override',
    enemyId: input.actorId,
    actionId: input.actionId,
    targetId,
    targetIds: input.targetIds,
    confirmed: true,
    skipped,
    explanation: input.explanation,
  };
  return [
    makeEvent({
      type: 'manual-adjustment',
      label,
      reason: `Мастер подтвердил решение NPC. ${input.explanation}`.slice(0, 500),
      adjustment,
    }),
    makeEvent({
      type: 'npc-action-selected',
      enemyId: input.actorId,
      actionId: input.actionId,
      targetId,
      targetIds: input.targetIds,
      confirmed: true,
      skipped,
      explanation: input.explanation,
    }),
  ];
}

type ManualSemanticEventInput =
  | Omit<Extract<GalleryEvent, {type: 'npc-action-selected'}>, 'id' | 'commandId'>
  | Omit<Extract<GalleryEvent, {type: 'dialogue-preset-chosen'}>, 'id' | 'commandId'>;

function getAppliedDialoguePresetIds(events: GalleryEvent[]) {
  const correctedCommandIds = new Set(
    events
      .filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  );
  return new Set(events.flatMap((event) => (
    event.type === 'dialogue-preset-chosen' && !correctedCommandIds.has(event.commandId)
      ? [event.presetId]
      : []
  )));
}

function isValidDialogueEffect(effect: DialoguePresetEffect) {
  if (effect.type === 'set-flag') return isSafeSessionId(effect.flag) && typeof effect.value === 'boolean';
  if (effect.type === 'consume-flag') return isSafeSessionId(effect.flag);
  if (effect.type === 'grant-item' || effect.type === 'remove-item') {
    return isSafeSessionId(effect.itemId) && isFiniteIntegerInRange(effect.count, 1, 99);
  }
  if (effect.type === 'modify-relationship') {
    return isSafeSessionId(effect.target) && isFiniteIntegerInRange(effect.value, -20, 20);
  }
  if (effect.type === 'consume-assist') return isSafeSessionId(effect.assistId);
  if (effect.type === 'consume-use') return isSafeSessionId(effect.useId);
  return isSafeSessionId(effect.encounterId);
}

function getDialogueAssistConsumedFlag(assistId: string) {
  return assistId === 'egorik-nastya-reroll'
    ? 'egorik-nastya-final-reroll-used'
    : `${assistId}-used`;
}

function isValidNumericChange(change: unknown): change is GalleryNumericChange {
  if (!change || typeof change !== 'object') return false;
  const candidate = change as Partial<GalleryNumericChange>;
  return (candidate.mode === 'delta' || candidate.mode === 'set')
    && Number.isFinite(candidate.value);
}

function isValidStoryOutcome(outcome: GalleryStoryOutcome) {
  const counterDeltas = Object.entries(outcome.counterDeltas ?? {});
  const relationshipChanges = Object.values(outcome.relationships ?? {});
  const itemChargeChanges = Object.values(outcome.itemCharges ?? {});
  const inventoryQuantities = Object.entries(outcome.inventory?.quantities ?? {});
  const acquiredItems = new Set(outcome.inventory?.acquire ?? []);
  const removedItems = new Set(outcome.inventory?.remove ?? []);
  const hasInventoryConflict = [...acquiredItems].some((itemId) => removedItems.has(itemId));

  return counterDeltas.every(([counter, delta]) => (
    galleryCounters.has(counter as GalleryCounter) && Number.isFinite(delta)
  ))
    && relationshipChanges.every(isValidNumericChange)
    && itemChargeChanges.every(isValidNumericChange)
    && inventoryQuantities.every(([itemId, quantity]) => (
      acquiredItems.has(itemId)
      && Number.isInteger(quantity)
      && quantity >= 1
      && quantity <= 99
    ))
    && !hasInventoryConflict;
}

function createStoryOutcomeEvents(
  outcome: GalleryStoryOutcome,
  makeEvent: ReturnType<typeof eventFactory>,
) {
  const nextEvents: GalleryEvent[] = [];
  Object.entries(outcome.flags ?? {}).forEach(([flag, value]) => {
    nextEvents.push(makeEvent({type: 'flag-changed', flag, value}));
  });
  Object.entries(outcome.counterDeltas ?? {}).forEach(([counter, delta]) => {
    if (delta === undefined) return;
    nextEvents.push(makeEvent({
      type: 'counter-changed',
      counter: counter as GalleryCounter,
      delta,
    }));
  });
  Object.entries(outcome.relationships ?? {}).forEach(([relationshipId, change]) => {
    nextEvents.push(makeEvent({type: 'relationship-changed', relationshipId, change}));
  });
  [...new Set(outcome.inventory?.remove ?? [])].forEach((itemId) => {
    nextEvents.push(makeEvent({type: 'item-changed', itemId, acquired: false}));
  });
  [...new Set(outcome.inventory?.acquire ?? [])].forEach((itemId) => {
    nextEvents.push(makeEvent({
      type: 'item-changed',
      itemId,
      acquired: true,
      quantity: outcome.inventory?.quantities?.[itemId],
    }));
  });
  Object.entries(outcome.itemCharges ?? {}).forEach(([itemId, change]) => {
    nextEvents.push(makeEvent({type: 'item-charge-changed', itemId, change}));
  });
  [...new Set(outcome.clues ?? [])].forEach((clueId) => {
    nextEvents.push(makeEvent({type: 'clue-revealed', clueId}));
  });
  if (outcome.selectedEnding !== undefined) {
    nextEvents.push(makeEvent({type: 'ending-selected', endingId: outcome.selectedEnding}));
  }
  if (outcome.nextView !== undefined) {
    nextEvents.push(makeEvent({type: 'view-changed', view: outcome.nextView}));
  }
  return nextEvents;
}

const storyConditionsMet = isGalleryStoryConditionMet;

function storyActionAlreadyResolved(events: GalleryEvent[], sceneId: string, actionId: string) {
  const correctedCommandIds = new Set(
    events
      .filter((event): event is Extract<GalleryEvent, {type: 'action-corrected'}> => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  );
  return events.some((event) => (
    event.type === 'story-action-resolved'
    && event.sceneId === sceneId
    && event.actionId === actionId
    && !correctedCommandIds.has(event.commandId)
  ));
}

function getFinalBossPhaseAc(phaseNumber: number, flags: Record<string, boolean>) {
  return phaseNumber === 2 && flags['stage-module-active'] === false
    ? penisuelaFinalBoss.encounter.weakness.reducedAc
    : penisuelaFinalBoss.encounter.ac;
}

function getFinalBossPlanEndingEvents(
  plan: FinalBossPlanDefinition,
  makeEvent: ReturnType<typeof eventFactory>,
) {
  const outcome = getFinalBossEndingOutcome(plan);
  return [
    makeEvent({type: 'flag-changed', flag: outcome.endingFlag, value: true}),
    makeEvent({type: 'ending-selected', endingId: outcome.endingId}),
  ];
}

function getStandardCombatVictoryEvents(
  encounterId: string,
  makeEvent: ReturnType<typeof eventFactory>,
): GalleryEvent[] {
  if (encounterId === 'rail-prop-kraken') return [
    makeEvent({type: 'flag-changed', flag: 'rail-kraken-resolved', value: true}),
    makeEvent({type: 'flag-changed', flag: 'rail-kraken-defeated-in-combat', value: true}),
  ];
  if (encounterId === 'hotel-vip-guards') return [
    makeEvent({type: 'flag-changed', flag: 'pussy-guards-defeated', value: true}),
    makeEvent({type: 'flag-changed', flag: 'pussy-path-resolved', value: true}),
    makeEvent({type: 'flag-changed', flag: 'pussy-hostile-route', value: true}),
    makeEvent({type: 'flag-changed', flag: 'pussy-quest-blocked', value: true}),
    makeEvent({type: 'flag-changed', flag: 'pussy-bar-passes-issued', value: true}),
    makeEvent({
      type: 'item-changed',
      itemId: PUSSY_BAR_PASSES_ITEM_ID,
      acquired: true,
      quantity: PUSSY_BAR_PASSES_QUANTITY,
    }),
  ];
  if (encounterId === 'prop-room-winding-carriers') return [
    makeEvent({type: 'flag-changed', flag: 'prop-room-carriers-defeated', value: true}),
  ];
  return [];
}

function getFinalBossStageCueEvents(
  flags: Record<string, boolean>,
  makeEvent: ReturnType<typeof eventFactory>,
): GalleryEvent[] {
  if (
    !flags['stage-rehearsal-cue']
    || flags['stage-reaction-absorbed']
    || flags['stage-rehearsal-cue-used']
    || flags['final-boss-stage-cue-used']
  ) return [];
  return [
    makeEvent({type: 'flag-changed', flag: 'final-boss-stage-cue-used', value: true}),
    makeEvent({
      type: 'combat-weakness-exposed',
      text: 'Satyr воспроизводит репетиционную команду: первая реакция нового контура отменяется.',
    }),
  ];
}

export function useGallerySession(
  canonicalDefinition: GalleryGameplayDefinition,
  heroes: GalleryHeroSource[],
  legacySceneIds: string[],
  options: {sceneScopeId?: string} = {},
) {
  const {sceneScopeId} = options;
  const journalExpectation = useMemo<GallerySessionJournalExpectation>(() => ({
    campaignId: canonicalDefinition.campaignId,
    definitionId: canonicalDefinition.id,
    definitionVersion: canonicalDefinition.version,
  }), [canonicalDefinition.campaignId, canonicalDefinition.id, canonicalDefinition.version]);
  const createFreshEventLog = () => {
    const existingInventory = readCampaignInventoryState(
      canonicalDefinition.campaignId,
      legacySceneIds,
    )?.revealedInspectableIds ?? [];
    return [createGallerySessionStartedEvent({
      definition: canonicalDefinition,
      heroes,
      existingInventory: [...new Set([...existingInventory, ...readCarriedPartyRewards(canonicalDefinition.campaignId)])],
      eventId: createId('event'),
      commandId: createId('session-start'),
    })];
  };
  const [journalEvents, setEvents] = useState<GalleryEvent[]>(() => {
    const stored = readGallerySessionEvents(journalExpectation);
    return stored.length ? stored : createFreshEventLog();
  });
  const events = useMemo(() => getEffectiveGalleryEvents(journalEvents), [journalEvents]);
  const runtimeDefinition = useMemo<GalleryGameplayDefinition>(() => ({
    ...canonicalDefinition,
    npcBehaviors: canonicalDefinition.npcBehaviors.some((profile) => (
      profile.id === penisuelaFinalBoss.npcBehavior.id
    ))
      ? canonicalDefinition.npcBehaviors
      : [...canonicalDefinition.npcBehaviors, penisuelaFinalBoss.npcBehavior],
    encounters: canonicalDefinition.encounters.some((encounter) => (
      encounter.id === penisuelaFinalBoss.encounter.id
    ))
      ? canonicalDefinition.encounters
      : [...canonicalDefinition.encounters, penisuelaFinalBoss.encounter],
  }), [canonicalDefinition]);
  const managedInspectableIds = useMemo(
    () => getManagedInventoryIds(journalEvents, knownGalleryManagedInspectableIds),
    [journalEvents],
  );
  const managedInspectableIdSet = useMemo(
    () => new Set(managedInspectableIds.flatMap((id) => [id, toCampaignInspectableId(id)])),
    [managedInspectableIds],
  );
  const state = useMemo(
    () => replayGalleryEvents(events, runtimeDefinition),
    [events, runtimeDefinition],
  );
  const definition = runtimeDefinition;
  const sessionHeroes = useMemo(() => state.heroSources.map((hero) => ({
    ...hero,
    hp: state.heroHp[hero.id] ?? hero.hp,
    maxHp: state.heroMaxHp[hero.id] ?? hero.maxHp,
    ac: state.heroAc[hero.id] ?? hero.ac,
  })), [state.heroAc, state.heroHp, state.heroMaxHp, state.heroSources]);
  const npcPhaseId = useMemo(() => {
    const combat = state.combat;
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    return combat?.encounterId === penisuelaFinalBoss.encounter.id && boss
      ? getFinalBossPhase(penisuelaFinalBoss, boss.hp).id
      : undefined;
  }, [state.combat]);
  const npcDecisionActors = useMemo(
    () => createNpcDecisionActors(definition, state, sessionHeroes, npcPhaseId),
    [definition, npcPhaseId, sessionHeroes, state],
  );
  const getNpcDecision = useCallback(
    (actorId: string) => createNpcDecisionView({
      actorId,
      definition,
      heroes: sessionHeroes,
      phaseId: npcPhaseId,
      state,
    }),
    [definition, npcPhaseId, sessionHeroes, state],
  );
  const canUndoOlvaRest = useMemo(() => {
    const last = getLastUndoableCommandId(events);
    return events.some(event => event.commandId === last && event.sceneScopeId === sceneScopeId
      && event.type === 'flag-changed' && event.flag === 'olva-rest-used' && event.value);
  }, [events, sceneScopeId]);
  const canUndo = useMemo(() => Boolean(getLastUndoableCommandId(events)), [events]);
  const canUndoLastAction = useMemo(
    () => Boolean(sceneScopeId && getLastUndoableCommandIdForScene(events, sceneScopeId)),
    [events, sceneScopeId],
  );
  const canUndoLastActionInScope = useCallback(
    (scopeId: string) => Boolean(getLastUndoableCommandIdForScene(events, scopeId)),
    [events],
  );
  const appliedDialoguePresetIds = useMemo(() => getAppliedDialoguePresetIds(events), [events]);

  useEffect(() => {
    writeGallerySessionEvents(journalExpectation, journalEvents);
    writePartyRewards(definition.campaignId, state.inventory);
    const existing = readCampaignInventoryState(definition.campaignId, legacySceneIds);
    const visibleInventory = state.inventory.map(toCampaignInspectableId);
    const retainedRevealed = (existing?.revealedInspectableIds ?? [])
      .filter((itemId) => !managedInspectableIdSet.has(itemId));
    const retainedViewed = (existing?.viewedInspectableIds ?? [])
      .filter((itemId) => !managedInspectableIdSet.has(itemId) || visibleInventory.includes(toCampaignInspectableId(itemId)));
    writeCampaignInventoryState({
      campaignId: definition.campaignId,
      revealedInspectableIds: [...new Set([...retainedRevealed, ...visibleInventory])],
      viewedInspectableIds: retainedViewed,
      slots: existing?.slots,
    });
  }, [definition.campaignId, journalEvents, journalExpectation, legacySceneIds, managedInspectableIdSet, state.inventory]);

  const appendEvents = useCallback((nextEvents: GalleryEvent[]) => {
    setEvents((current) => {
      if (current !== journalEvents && nextEvents.some((event) => event.type === 'item-charge-changed' && event.itemId === GREY_WIESE_PERFUME_ID && event.change.mode === 'delta' && event.change.value < 0)) return current;
      const scopedEvents = sceneScopeId
        ? nextEvents.map((event) => ({...event, sceneScopeId}))
        : nextEvents;
      const updated = [...current, ...scopedEvents];
      if (!parseGalleryEventLog(updated, journalExpectation).ok) return current;
      writeGallerySessionEvents(journalExpectation, updated);
      return updated;
    });
  }, [journalEvents, journalExpectation, sceneScopeId]);

  const advanceBossSequence = useCallback((command: BossSequenceCommand) => {
    setEvents((current) => {
      const snapshot = replayGalleryEvents(current, definition);
      const additions = createBossSequenceEvents(definition, snapshot, snapshot.heroSources, command);
      if (!additions.length) return current;
      // Video completion belongs to its trigger; an explicit intermission step stays separate.
      const previous = current.at(-1);
      const joinPreviousCommand = (command === 'first-victory' && !definition.bossSequence?.intermission) || command === 'video-ended' || command === 'death-video-ended' || command === 'defeat'
        || (command === 'start' && snapshot.flags['andrey-arena-entered'] && previous?.sceneScopeId === 'andrey-villa-breach');
      const commandId = joinPreviousCommand && previous && previous.type !== 'session-started' && previous.type !== 'action-corrected'
        ? previous.commandId : createId(`boss-${command}`);
      const makeEvent = eventFactory(commandId);
      const commandScopeId = previous?.commandId === commandId
        ? previous.sceneScopeId : definition.bossSequence!.sceneId;
      const updated = [...current, ...additions.map((event) => ({
        ...makeEvent(event), sceneScopeId: commandScopeId,
      }))];
      if (!parseGalleryEventLog(updated, journalExpectation).ok) return current;
      writeGallerySessionEvents(journalExpectation, updated);
      return updated;
    });
  }, [definition, journalExpectation]);

  const commitStoryOutcome = useCallback((outcome: GalleryStoryOutcome) => {
    if (!isValidStoryOutcome(outcome)) return false;

    const commandId = createId('story-outcome');
    const makeEvent = eventFactory(commandId);
    const nextEvents = createStoryOutcomeEvents(outcome, makeEvent);
    if (!nextEvents.length) return false;

    appendEvents(nextEvents);
    return true;
  }, [appendEvents]);

  const commitStoryAction = useCallback((sceneId: string, actionId: string) => {
    if (sceneId === olvaQuest.sceneId && actionId.startsWith('table-finish-') && !canResolveOlvaVerdict(state, actionId)) return false;
    const storyScene = definition.storyScenes.find((scene) => scene.id === sceneId);
    const action = storyScene?.actions.find((candidate) => candidate.id === actionId);
    const challengeTrack = storyScene?.challenge?.tracks.find((track) => track.actionId === actionId);
    const challengeComplete = Boolean(challengeTrack)
      && state.counters[challengeTrack!.successCounter] >= challengeTrack!.successesRequired;
    const challengeLocked = Boolean(storyScene?.challenge)
      && state.counters[storyScene!.challenge!.failureCounter] >= storyScene!.challenge!.failureLimit;
    if (
      !action
      || action.kind !== 'automatic'
      || !getStoryActionAvailability(action, state, definition)
      || (!action.repeatable && (!challengeTrack || !challengeTrack.repeatable) && storyActionAlreadyResolved(events, sceneId, actionId))
      || challengeComplete
      || challengeLocked
      || !isValidStoryOutcome(action.outcome)
      || (action.challengeProgressOutcome && !isValidStoryOutcome(action.challengeProgressOutcome))
    ) return false;

    const commandId = createId(action.id);
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [
      makeEvent({type: 'story-action-resolved', sceneId, actionId, result: 'automatic'}),
      ...(action.requirements?.resourceActionId ? [makeEvent(createCombatActionUsageEvent(definition.combatActions.find((resource) => resource.id === action.requirements!.resourceActionId)!))] : []),
    ];
    if (challengeTrack) {
      const currentProgress = state.counters[challengeTrack.successCounter];
      nextEvents.push(makeEvent({
        type: 'counter-changed',
        counter: challengeTrack.successCounter,
        delta: 1,
      }));
      if (action.challengeProgressOutcome) {
        nextEvents.push(...createStoryOutcomeEvents(action.challengeProgressOutcome, makeEvent));
      }
      if (currentProgress + 1 >= challengeTrack.successesRequired) {
        nextEvents.push(...createStoryOutcomeEvents(action.outcome, makeEvent));
      }
    } else {
      nextEvents.push(...createStoryOutcomeEvents(
        sceneId === olvaQuest.sceneId && actionId === 'table-claim-reward' ? getOlvaRewardOutcome(action.outcome, state) : action.outcome,
        makeEvent,
      ));
    }
    appendEvents(nextEvents);
    return true;
  }, [appendEvents, definition, events, state]);

  const resolveStoryActionCheck = useCallback((
    sceneId: string,
    actionId: string,
    heroId: string,
    stat: HeroStat,
    providedRolls?: number[],
    useClearChoiceConfirmation = false,
    automaticItemId?: string,
  ) => {
    const automaticReward = automaticItemId ? getAutomaticCheckReward(state, heroId, stat, automaticItemId) : undefined;
    if (automaticItemId && (!automaticReward || automaticReward.charges < 1 || useClearChoiceConfirmation)) return;
    const automatic = Boolean(automaticReward);
    const storyScene = definition.storyScenes.find((scene) => scene.id === sceneId);
    const action = storyScene?.actions.find((candidate) => candidate.id === actionId);
    const challengeTrack = storyScene?.challenge?.tracks.find((track) => track.actionId === actionId);
    const challengeFailureCount = storyScene?.challenge
      ? state.counters[storyScene.challenge.failureCounter]
      : 0;
    const challengeComplete = Boolean(challengeTrack)
      && state.counters[challengeTrack!.successCounter] >= challengeTrack!.successesRequired;
    const npcActor = action?.kind === 'check' ? action.check.npcActor : undefined;
    const sessionHero = sessionHeroes.find((candidate) => candidate.id === heroId);
    const hero = npcActor
      ? (npcActor.id === heroId ? npcActor : undefined)
      : sessionHero;
    const clearChoiceAvailable = state.inventory.includes('clear-choice-confirmation')
      && (state.itemCharges['clear-choice-confirmation'] ?? 0) > 0;
    const conditionResolution = resolveNextFormalActionConditions(
      npcActor ? [] : getEffectiveParticipantConditions(state, heroId),
    );
    const shamed = conditionResolution.rollModifier !== 0;
    const assignedRole = conditionResolution.blocked;
    if (
      !action
      || action.kind !== 'check'
      || !hero
      || (!npcActor && (state.heroHp[heroId] ?? sessionHero?.hp ?? 0) <= 0)
      || !action.check.stats.includes(stat)
      || (action.check.eligibleHeroIds && !action.check.eligibleHeroIds.includes(heroId))
      || !getStoryActionAvailability(action, state, definition)
      || ((!challengeTrack || !challengeTrack.repeatable) && storyActionAlreadyResolved(events, sceneId, actionId))
      || challengeComplete
      || (storyScene?.challenge && challengeFailureCount >= storyScene.challenge.failureLimit)
      || !isValidStoryOutcome(action.outcome)
      || !isValidStoryOutcome(action.failureOutcome)
      || (useClearChoiceConfirmation && !clearChoiceAvailable)
      || (npcActor && (useClearChoiceConfirmation || automatic))
    ) return;

    if (assignedRole) {
      const commandId = createId(`${action.id}-blocked`);
      const makeEvent = eventFactory(commandId);
      appendEvents(createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent));
      return;
    }

    const settings = getStoryCheckSettings(action.check, state, heroId, stat);
    const advantage = settings.advantage;
    if (!automatic && providedRolls && (providedRolls.length !== (advantage ? 2 : 1)
      || providedRolls.some((roll) => !Number.isInteger(roll) || roll < 1 || roll > 20))) return;
    const rolls = automatic ? [] : providedRolls ?? Array.from({length: advantage ? 2 : 1}, () => rollDie(20));
    let result = resolveCheck({
      id: action.id,
      dc: settings.dc,
      successText: action.resolution,
      failureText: action.failureResolution,
    }, hero, stat, rolls, automatic);
    const temporaryModifier = npcActor ? 0 : state.participantTemporaryModifiers[heroId] ?? 0;
    if (!automatic && (useClearChoiceConfirmation || shamed || temporaryModifier !== 0 || action.check.modifierBonus)) {
      const natural = Math.max(...rolls);
      const modifier = result.modifier
        + (action.check.modifierBonus ?? 0)
        + (useClearChoiceConfirmation ? 2 : 0)
        + (shamed ? -2 : 0)
        + temporaryModifier;
      const total = natural + modifier;
      const success = natural === 20 || (natural !== 1 && total >= result.dc);
      result = {
        ...result,
        modifier,
        total,
        success,
        text: success ? action.resolution : action.failureResolution,
      };
    }
    const commandId = createId(action.id);
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [
      ...(automaticReward ? [makeEvent({type: 'item-charge-changed' as const, itemId: automaticReward.itemId, change: {mode: 'delta' as const, value: -1}})] : []),
      ...(useClearChoiceConfirmation ? [
        makeEvent({
          type: 'item-charge-changed' as const,
          itemId: 'clear-choice-confirmation',
          change: {mode: 'delta' as const, value: -1},
        }),
        makeEvent({
          type: 'flag-changed' as const,
          flag: 'clear-choice-confirmation-used',
          value: true,
        }),
      ] : []),
      ...(!automatic && shamed ? createConsumedConditionEvents(state, heroId, 'shamed', makeEvent) : []),
      ...(action.requirements?.resourceActionId ? [makeEvent(createCombatActionUsageEvent(definition.combatActions.find((resource) => resource.id === action.requirements!.resourceActionId)!))] : []),
      makeEvent({type: 'roll-entered', result}),
      makeEvent({
        type: 'story-action-resolved',
        sceneId,
        actionId,
        result: result.success ? 'success' : 'failure',
      }),
    ];
    if (challengeTrack && storyScene?.challenge) {
      const progressCounter = result.success
        ? challengeTrack.successCounter
        : storyScene.challenge.failureCounter;
      const currentProgress = state.counters[progressCounter];
      nextEvents.push(makeEvent({type: 'counter-changed', counter: progressCounter, delta: 1}));
      const completesTrack = result.success
        && currentProgress + 1 >= challengeTrack.successesRequired;
      if (completesTrack) nextEvents.push(...createStoryOutcomeEvents(action.outcome, makeEvent));
      else if (!result.success) nextEvents.push(...createStoryOutcomeEvents(action.failureOutcome, makeEvent));
    } else {
      nextEvents.push(...createStoryOutcomeEvents(
        result.success ? action.outcome : action.failureOutcome,
        makeEvent,
      ));
    }
    appendEvents(nextEvents);
    return result;
  }, [appendEvents, definition, events, sessionHeroes, state]);

  const startStoryCombat = useCallback((sceneId: string, actionId: string) => {
    const action = definition.storyScenes.find((scene) => scene.id === sceneId)
      ?.actions.find((candidate) => candidate.id === actionId);
    if (
      !action
      || action.kind !== 'combat-start'
      || state.combat
      || !storyConditionsMet(action.conditions, state)
      || storyActionAlreadyResolved(events, sceneId, actionId)
      || !isValidStoryOutcome(action.outcome)
    ) return false;
    const encounter = definition.encounters.find((candidate) => candidate.id === action.encounterId);
    if (!encounter) return false;

    const commandId = createId(action.id);
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'story-action-resolved', sceneId, actionId, result: 'automatic'}),
      makeEvent({type: 'counter-changed', counter: 'preFinalCombats', delta: 1}),
      ...createStoryOutcomeEvents(action.outcome, makeEvent),
      makeEvent(createStartCombatCommand(encounter, sessionHeroes)),
    ]);
    return true;
  }, [appendEvents, definition.encounters, definition.storyScenes, events, sessionHeroes, state]);

  const completeStoryCombat = useCallback((sceneId: string, actionId: string) => {
    const action = definition.storyScenes.find((scene) => scene.id === sceneId)
      ?.actions.find((candidate) => candidate.id === actionId);
    const combat = state.combat;
    if (
      !action
      || action.kind !== 'combat-complete'
      || !combat
      || combat.encounterId !== action.encounterId
      || !storyConditionsMet(action.conditions, state)
      || storyActionAlreadyResolved(events, sceneId, actionId)
      || !isValidStoryOutcome(action.outcome)
    ) return false;
    const clearEvent = createClearCombatCommand(combat);
    if (!clearEvent) return false;

    const commandId = createId(action.id);
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent(clearEvent),
      makeEvent({type: 'story-action-resolved', sceneId, actionId, result: 'automatic'}),
      ...createStoryOutcomeEvents(action.outcome, makeEvent),
      makeEvent({type: 'view-changed', view: 'gallery'}),
    ]);
    return true;
  }, [appendEvents, definition.storyScenes, events, state]);

  const completeCombatDefeatFallback = useCallback((sceneId: string) => {
    const combat = state.combat;
    const encounter = definition.encounters.find((candidate) => candidate.id === combat?.encounterId);
    const completionActionId = encounter?.defeatFallback?.completionActionId;
    const action = definition.storyScenes.find((scene) => scene.id === sceneId)
      ?.actions.find((candidate) => candidate.id === completionActionId);
    if (
      !combat
      || !completionActionId
      || !state.flags[`combat-defeat-fallback-${combat.encounterId}`]
      || !action
      || action.kind !== 'automatic'
      || storyActionAlreadyResolved(events, sceneId, action.id)
      || !isValidStoryOutcome(action.outcome)
    ) return false;
    const clearEvent = createClearCombatCommand(combat);
    if (!clearEvent) return false;
    const commandId = createId(completionActionId);
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent(clearEvent),
      makeEvent({type: 'story-action-resolved', sceneId, actionId: action.id, result: 'automatic'}),
      ...createStoryOutcomeEvents(action.outcome, makeEvent),
      makeEvent({type: 'view-changed', view: 'gallery'}),
    ]);
    return true;
  }, [appendEvents, definition.encounters, definition.storyScenes, events, state]);

  const resolveStoryCombatDefeatFallback = useCallback((sceneId: string, actionId: string) => {
    const action = definition.storyScenes.find((scene) => scene.id === sceneId)
      ?.actions.find((candidate) => candidate.id === actionId);
    const combat = state.combat;
    if (
      !action
      || action.kind !== 'combat-complete'
      || !combat
      || combat.encounterId !== 'confidentiality-corp-de-ballet'
      || combat.encounterId !== action.encounterId
      || combat.pendingAttack
      || !areAllHeroesDown(state.heroHp, sessionHeroes.map((hero) => hero.id))
      || Object.values(combat.enemies).every((enemy) => enemy.hp <= 0)
      || !storyConditionsMet(action.conditions, state)
      || storyActionAlreadyResolved(events, sceneId, actionId)
      || !isValidStoryOutcome(action.outcome)
    ) return false;

    const commandId = createId('corp-de-ballet-defeat-fallback');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      ...sessionHeroes.map((hero) => makeEvent({
        type: 'healing-applied',
        targetId: hero.id,
        amount: 1,
        maxHp: hero.maxHp,
        text: `${hero.name} приходит в себя за раскрытыми кулисами с 1 HP.`,
      })),
      ...Object.values(combat.enemies)
        .filter((enemy) => enemy.hp > 0)
        .map((enemy) => makeEvent({
          type: 'combat-damage-resolved' as const,
          targetId: enemy.id,
          amount: enemy.hp,
          text: `${enemy.name} перегружает аварийный противовес и раскрывает проход.`,
        })),
      makeEvent({
        type: 'combat-ended',
        text: 'Кулисы выбрасывают героев за линию допуска и аварийно раскрываются. Никто не погиб, но прорыв отнял время.',
      }),
      makeEvent({type: 'combat-cleared', encounterId: combat.encounterId}),
      makeEvent({type: 'story-action-resolved', sceneId, actionId, result: 'automatic'}),
      ...createStoryOutcomeEvents(action.outcome, makeEvent),
      makeEvent({type: 'view-changed', view: 'gallery'}),
    ]);
    return true;
  }, [appendEvents, definition.storyScenes, events, sessionHeroes, state]);

  const resolveCombatDefeatFallback = useCallback(() => {
    const combat = state.combat;
    if (definition.bossSequence?.defeat && combat
      && [definition.bossSequence.firstEncounterId, definition.bossSequence.secondEncounterId].includes(combat.encounterId)) {
      if (!createBossSequenceEvents(definition, state, sessionHeroes, 'defeat').length) return false;
      advanceBossSequence('defeat');
      return true;
    }
    const encounter = definition.encounters.find((candidate) => candidate.id === combat?.encounterId);
    const fallback = encounter?.defeatFallback;
    if (
      !combat
      || !fallback
      || combat.pendingAttack
      || combat.encounterId === penisuelaFinalBoss.encounter.id
      || combat.encounterId === 'confidentiality-corp-de-ballet'
      || !areAllHeroesDown(state.heroHp, sessionHeroes.map((hero) => hero.id))
      || Object.values(combat.enemies).every((enemy) => enemy.hp <= 0)
    ) return false;

    const commandId = createId(`combat-defeat-fallback-${combat.encounterId}`);
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [
      ...sessionHeroes.map((hero) => makeEvent({
        type: 'healing-applied',
        targetId: hero.id,
        amount: 1,
        maxHp: hero.maxHp,
        text: `${hero.name} приходит в себя с 1 HP.`,
      })),
      ...Object.values(combat.enemies)
        .filter((enemy) => enemy.hp > 0)
        .map((enemy) => makeEvent({
          type: 'combat-damage-resolved' as const,
          targetId: enemy.id,
          amount: enemy.hp,
          text: `${enemy.name}: аварийный протокол завершает столкновение.`,
        })),
      makeEvent({type: 'combat-ended', text: fallback.resolution}),
      makeEvent({
        type: 'flag-changed',
        flag: `combat-defeat-fallback-${combat.encounterId}`,
        value: true,
      }),
      ...createStoryOutcomeEvents({
        flags: fallback.outcome?.flags,
        counterDeltas: fallback.outcome?.timePressureDelta === undefined
          ? undefined
          : {timePressure: fallback.outcome.timePressureDelta},
        inventory: fallback.outcome?.inventoryAcquire
          ? {acquire: fallback.outcome.inventoryAcquire}
          : undefined,
        clues: fallback.outcome?.clues,
      }, makeEvent),
    ];
    appendEvents(nextEvents);
    return true;
  }, [advanceBossSequence, appendEvents, definition, sessionHeroes, state]);

  const changeView = useCallback((view: GalleryView) => {
    const commandId = createId('view');
    const makeEvent = eventFactory(commandId);
    const wakesKraken = view === 'gallery'
      && state.inventory.includes(scepterItemId)
      && !state.flags['rail-kraken-resolved'];
    const nextEvents: GalleryEvent[] = [];
    if (wakesKraken) {
      nextEvents.push(makeEvent({
        type: 'flag-changed',
        flag: 'rail-kraken-awakened-by-scepter',
        value: true,
      }));
    }
    if (view === 'archive' && state.inventory.includes(archiveKeyItemId)) {
      nextEvents.push(
        makeEvent({type: 'item-changed', itemId: archiveKeyItemId, acquired: false}),
        makeEvent({type: 'flag-changed', flag: 'archive-key-used', value: true}),
      );
    }
    nextEvents.push(makeEvent({type: 'view-changed', view: wakesKraken ? 'kraken' : view}));
    appendEvents(nextEvents);
  }, [appendEvents, state.flags, state.inventory]);

  const acceptPussyTask = useCallback(() => {
    if (
      !state.flags['pussy-trust-max']
      || state.flags['pussy-quest-blocked']
      || isPussyHostileRoute(state.flags)
    ) return;
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
    automaticItemId?: string,
  ) => {
    const automaticReward = automaticItemId ? getAutomaticCheckReward(state, heroId, stat, automaticItemId) : undefined;
    if (automaticItemId && (!automaticReward || automaticReward.charges < 1 || abilityId)) return;
    const check = definition.checks.find((item) => item.id === checkId);
    const hero = sessionHeroes.find((item) => item.id === heroId);
    if (!check || !hero || !check.stats.includes(stat)) return;
    if (check.eligibleHeroIds && !check.eligibleHeroIds.includes(heroId)) return;
    if (checkId === 'earn-pussy-acquaintance' && (state.flags['pussy-acquainted'] || state.flags['pussy-acquaintance-failed'])) return;
    if (
      (checkId === 'earn-pussy-trust' || checkId === 'intimidate-pussy')
      && !canAttemptPussyAudienceCheck(state.flags, checkId)
    ) return;
    if (checkId === 'steal-pussy-key') return;
    const isPropRoomScepterCheck = isPropRoomScepterCheckId(checkId);
    if (isPropRoomScepterCheck && !canAttemptPropRoomScepterCheck(state.flags, checkId)) return;
    if (
      (checkId === 'disable-rail-kraken-with-linda' || checkId === 'stop-rail-kraken')
      && (
        state.activeView !== 'kraken'
        || !state.inventory.includes(scepterItemId)
        || state.flags['rail-kraken-resolved']
      )
    ) return;
    if (
      checkId === 'calm-alexis'
      && (
        state.activeView !== 'archive'
        || state.flags['archive-resolved']
        || state.flags['alexis-smile-attempted']
      )
    ) return;
    if (
      checkId === 'search-hotel-archive'
      && (
        state.activeView !== 'archive'
        || state.flags['archive-resolved']
        || !state.flags['alexis-smile-failed']
        || abilityId !== 'video-surveillance'
      )
    ) return;
    if (
      (checkId === 'trace-prokhor-payment' || checkId === 'pressure-prokhor-with-work')
      && (
        !state.flags['prokhor-payment-audit-started']
        || state.flags['prokhor-payer-identified']
      )
    ) return;
    if (checkId === 'identify-secret-artist') {
      const inspectedArtistClues = definition.dressingRoom.objects
        .filter((item) => item.group === 'artist')
        .filter((item) => state.flags[`dressing-object-${item.id}-inspected`]);
      if (inspectedArtistClues.length < 2 || state.flags['celebrity-kreed-identified']) return;
    }
    if (
      checkId === 'read-mask-route'
      && (
        !state.flags['dressing-object-transfer-log-inspected']
        || !state.flags['dressing-object-route-mirror-inspected']
        || state.flags['dressing-room-route-confirmed']
      )
    ) return;
    if (
      checkId === 'free-satyr-window'
      && (
        !state.flags['dressing-object-satyr-window-inspected']
        || state.flags['satyr-window-attempted']
        || state.flags['satyr-freed']
      )
    ) return;
    if (checkId === 'finish-dressing-rehearsal' && state.flags['dressing-doubles-disabled']) return;
    if (checkId === 'align-stage-power' && state.flags['stage-power-order-complete']) return;
    if (checkId === 'hold-stage-lever' && state.flags['stage-lever-held']) return;
    if (checkId === 'trace-prokhor-payment' && state.flags['prokhor-payment-intelligence-failed']) return;
    if (checkId === 'pressure-prokhor-with-work' && state.flags['prokhor-work-threat-failed']) return;
    const resourceAction = abilityId ? definition.combatActions.find((action) => (
      action.characterId === heroId && action.sourceId === abilityId
    )) : undefined;
    if (
      abilityId
      && (resourceAction
        ? !isCombatActionSourceAvailable(resourceAction, {
            inventoryState: state.inventoryState,
            resourceUses: state.resourceUses,
          })
        : state.usedAbilities.includes(abilityId))
    ) return;
    const conditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, heroId),
    );
    if (conditionResolution.blocked) {
      const commandId = createId(`${checkId}-blocked`);
      const makeEvent = eventFactory(commandId);
      appendEvents(createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent));
      return;
    }

    const automatic = Boolean(automaticReward || (abilityId && abilityId === check.automaticSuccessAbilityId));
    const advantage = Boolean(abilityId && abilityId === check.advantageAbilityId);
    const rolls = automatic ? [] : providedRolls?.length
      ? providedRolls
      : Array.from({length: advantage ? 2 : 1}, () => rollDie(20));
    const heroDcOverride = check.dcOverrides?.find((override) => override.heroIds.includes(heroId));
    const effectiveDc = (heroDcOverride?.dc ?? check.dc) + (check.dcModifiers ?? [])
      .filter((modifier) => state.flags[modifier.flag])
      .reduce((sum, modifier) => sum + modifier.delta, 0);
    let result = resolveCheck({...check, dc: effectiveDc}, hero, stat, rolls, automatic);
    const temporaryModifier = state.participantTemporaryModifiers[heroId] ?? 0;
    if (!automatic && (temporaryModifier !== 0 || conditionResolution.rollModifier !== 0)) {
      const natural = Math.max(...rolls);
      const modifier = result.modifier + temporaryModifier + conditionResolution.rollModifier;
      const total = natural + modifier;
      const success = natural === 20 || (natural !== 1 && total >= result.dc);
      result = {
        ...result,
        modifier,
        total,
        success,
        text: success ? check.successText : check.failureText,
      };
    }
    const commandId = createId(checkId);
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [
      ...(automaticReward ? [makeEvent({type: 'item-charge-changed' as const, itemId: automaticReward.itemId, change: {mode: 'delta' as const, value: -1}})] : []),
      ...(!automatic && conditionResolution.rollModifier !== 0
        ? createConsumedConditionEvents(state, heroId, 'shamed', makeEvent)
        : []),
      makeEvent({type: 'roll-entered', result}),
    ];
    if (resourceAction) nextEvents.push(makeEvent(createCombatActionUsageEvent(resourceAction)));
    else if (abilityId) nextEvents.push(makeEvent({type: 'ability-used', abilityId}));

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
          makeEvent({type: 'flag-changed', flag: 'pussy-room-seen', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-acquainted', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-audience-complete', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-audience-earned', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-trust-max', value: true}),
          makeEvent({
            type: 'flag-changed',
            flag: 'bridge-pussy-audience-pussy-audience-result-resolved',
            value: true,
          }),
        );
      } else {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-room-seen', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-audience-complete', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-trust-refused', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-quest-blocked', value: true}),
          makeEvent({
            type: 'flag-changed',
            flag: 'bridge-pussy-audience-pussy-audience-result-resolved',
            value: true,
          }),
        );
      }
    }

    if (checkId === 'intimidate-pussy') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-path-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-intimidated', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-hostile-route', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-quest-blocked', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-bar-passes-issued', value: true}),
          makeEvent({
            type: 'item-changed',
            itemId: PUSSY_BAR_PASSES_ITEM_ID,
            acquired: true,
            quantity: PUSSY_BAR_PASSES_QUANTITY,
          }),
        );
      } else {
        const encounter = definition.encounters.find((item) => item.id === 'hotel-vip-guards');
        if (!encounter) return;
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-hostile-route', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-quest-blocked', value: true}),
          makeEvent({type: 'flag-changed', flag: 'pussy-guards-summoned', value: true}),
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
          makeEvent({type: 'item-changed', itemId: archiveKeyItemId, acquired: true}),
        );
      } else {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'pussy-guards-summoned', value: true}),
          makeEvent({type: 'view-changed', view: 'guards'}),
        );
      }
    }

    if (isPropRoomScepterCheck) {
      const propRoomResolution = resolvePropRoomScepterCheck(state.flags, checkId, result.success);
      if (propRoomResolution.kind === 'recovered') {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'scepter-recovered', value: true}),
          makeEvent({type: 'flag-changed', flag: propRoomResolution.methodFlag, value: true}),
          makeEvent({
            type: 'flag-changed',
            flag: 'bridge-pussy-prop-room-pussy-scepter-recovery-resolved',
            value: true,
          }),
          makeEvent({type: 'item-changed', itemId: scepterItemId, acquired: true}),
        );
      } else if (propRoomResolution.kind === 'combat') {
        const encounter = definition.encounters.find((item) => item.id === 'prop-room-winding-carriers');
        if (!encounter) return;
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: propRoomResolution.failedFlag, value: true}),
          makeEvent({type: 'flag-changed', flag: 'prop-room-carriers-awakened', value: true}),
          makeEvent({type: 'counter-changed', counter: 'preFinalCombats', delta: 1}),
          makeEvent(createStartCombatCommand(encounter, sessionHeroes)),
        );
      } else if (propRoomResolution.kind === 'force-only') {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: propRoomResolution.failedFlag, value: true}),
          makeEvent({type: 'flag-changed', flag: 'prop-room-force-only', value: true}),
        );
      }
    }

    if (checkId === 'calm-alexis') {
      nextEvents.push(makeEvent({
        type: 'flag-changed',
        flag: 'alexis-smile-attempted',
        value: true,
      }));
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'alexis-calmed', value: true}),
          makeEvent({type: 'flag-changed', flag: 'archive-resolved', value: true}),
          makeEvent({type: 'flag-changed', flag: 'bar-route-known', value: true}),
          makeEvent({type: 'flag-changed', flag: 'alexis-prokhor-task-active', value: true}),
          makeEvent({type: 'flag-changed', flag: 'closed-bar-token', value: true}),
          makeEvent({type: 'item-changed', itemId: 'closed-bar-token', acquired: true}),
          makeEvent({type: 'clue-revealed', clueId: 'egorik-lead'}),
          makeEvent({type: 'clue-revealed', clueId: 'prokhor-funding-lead'}),
        );
      } else {
        nextEvents.push(makeEvent({
          type: 'flag-changed',
          flag: 'alexis-smile-failed',
          value: true,
        }));
      }
    }

    if (checkId === 'search-hotel-archive') {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'archive-resolved', value: true}),
        makeEvent({type: 'flag-changed', flag: 'bar-route-known', value: true}),
        makeEvent({type: 'flag-changed', flag: 'alexis-surveillance-noticed', value: true}),
        makeEvent({type: 'flag-changed', flag: 'alexis-prokhor-task-active', value: true}),
        makeEvent({type: 'clue-revealed', clueId: 'egorik-lead'}),
        makeEvent({type: 'clue-revealed', clueId: 'prokhor-funding-lead'}),
      );
      if (!result.success) nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
    }

    if (checkId === 'trace-prokhor-payment' || checkId === 'pressure-prokhor-with-work') {
      const failedFlag = checkId === 'trace-prokhor-payment'
        ? 'prokhor-payment-intelligence-failed'
        : 'prokhor-work-threat-failed';
      const otherFailedFlag = checkId === 'trace-prokhor-payment'
        ? 'prokhor-work-threat-failed'
        : 'prokhor-payment-intelligence-failed';
      const identifiesPayer = result.success || Boolean(state.flags[otherFailedFlag]);

      if (!result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: failedFlag, value: true}),
          makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}),
        );
        if (state.flags[otherFailedFlag]) {
          nextEvents.push(makeEvent({
            type: 'flag-changed',
            flag: 'prokhor-work-schedule-issued',
            value: true,
          }));
        }
      }
      if (identifiesPayer) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'prokhor-payer-identified', value: true}),
          makeEvent({type: 'clue-revealed', clueId: 'prokhor-funded-by-lyubov-uspenskaya'}),
        );
      }
    }

    if (checkId === 'disable-rail-kraken-with-linda' || checkId === 'stop-rail-kraken') {
      if (checkId === 'disable-rail-kraken-with-linda') {
        nextEvents.push(makeEvent({type: 'ability-used', abilityId: 'tiny-size'}));
      }
      if (result.success) {
        nextEvents.push(
          ...(checkId === 'disable-rail-kraken-with-linda'
            ? [
                makeEvent({type: 'flag-changed', flag: 'rail-kraken-disabled-by-linda', value: true}),
              ]
            : [
                makeEvent({type: 'flag-changed', flag: 'rail-kraken-stopped-by-force', value: true}),
              ]),
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

    if (checkId === 'identify-secret-artist') {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'celebrity-kreed-identified', value: true}),
        makeEvent({type: 'clue-revealed', clueId: 'celebrity-kreed'}),
      );
      if (!result.success) nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
    }

    if (checkId === 'read-mask-route') {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'dressing-room-route-confirmed', value: true}),
        makeEvent({type: 'clue-revealed', clueId: 'egorik-lead'}),
      );
      if (!result.success) nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
    }

    if (checkId === 'free-satyr-window') {
      nextEvents.push(makeEvent({type: 'flag-changed', flag: 'satyr-window-attempted', value: true}));
      if (result.success) nextEvents.push(makeEvent({type: 'flag-changed', flag: 'satyr-freed', value: true}));
    }

    if (checkId === 'finish-dressing-rehearsal') {
      if (result.success) {
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'dressing-doubles-disabled', value: true}),
          makeEvent({type: 'flag-changed', flag: 'stage-rehearsal-cue', value: true}),
          makeEvent({type: 'flag-changed', flag: 'stage-module-active', value: true}),
        );
      } else {
        nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
      }
    }

    if (checkId === 'align-stage-power' || checkId === 'hold-stage-lever') {
      const completedFlag = checkId === 'align-stage-power'
        ? 'stage-power-order-complete'
        : 'stage-lever-held';
      const otherCompletedFlag = checkId === 'align-stage-power'
        ? 'stage-lever-held'
        : 'stage-power-order-complete';
      if (result.success) {
        nextEvents.push(makeEvent({type: 'flag-changed', flag: completedFlag, value: true}));
        if (state.flags[otherCompletedFlag]) {
          nextEvents.push(
            makeEvent({type: 'flag-changed', flag: 'stage-power-key', value: true}),
            makeEvent({type: 'flag-changed', flag: 'stage-module-active', value: false}),
            makeEvent({type: 'flag-changed', flag: 'stage-module-disabled', value: true}),
          );
        }
      } else if (state.flags['stage-rehearsal-cue'] && !state.flags['stage-reaction-absorbed']) {
        nextEvents.push(makeEvent({type: 'flag-changed', flag: 'stage-reaction-absorbed', value: true}));
      } else {
        nextEvents.push(makeEvent({type: 'counter-changed', counter: 'timePressure', delta: 1}));
      }
    }

    appendEvents(nextEvents);
    return result;
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.activeView,
    state.flags,
    state.inventory,
    state.inventoryState,
    state.participantTemporaryModifiers,
    state.participantConditions,
    state.resourceUses,
    state.usedAbilities,
  ]);

  const returnScepter = useCallback(() => {
    if (
      !state.flags['pussy-trust-max']
      || !state.flags['pussy-quest-accepted']
      || state.flags['pussy-quest-blocked']
      || isPussyHostileRoute(state.flags)
      || !state.inventory.includes(scepterItemId)
      || state.flags['scepter-returned']
    ) return;
    const commandId = createId('return-scepter');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'scepter-returned', value: true}),
      makeEvent({type: 'item-changed', itemId: scepterItemId, acquired: false}),
    ]);
  }, [appendEvents, state.flags, state.inventory]);

  const grantPussyReward = useCallback(() => {
    if (
      !state.flags['scepter-returned']
      || state.flags['pussy-reward-received']
      || state.inventory.includes(scepterItemId)
      || state.flags['pussy-quest-blocked']
      || isPussyHostileRoute(state.flags)
    ) return;
    const commandId = createId('pussy-reward');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'pussy-reward-received', value: true}),
      makeEvent({type: 'flag-changed', flag: 'womanizer-obtained', value: true}),
      makeEvent({type: 'flag-changed', flag: 'pussy-bar-passes-issued', value: true}),
      makeEvent({
        type: 'flag-changed',
        flag: 'bridge-pussy-scepter-return-pussy-womanizer-reward-resolved',
        value: true,
      }),
      makeEvent({
        type: 'item-changed',
        itemId: PUSSY_BAR_PASSES_ITEM_ID,
        acquired: true,
        quantity: PUSSY_BAR_PASSES_QUANTITY,
      }),
      makeEvent({type: 'item-changed', itemId: womanizerItemId, acquired: true}),
    ]);
  }, [appendEvents, state.flags, state.inventory]);

  const collectScepter = useCallback(() => {
    if (!state.flags['prop-room-carriers-defeated'] || state.flags['scepter-recovered']) return;
    const commandId = createId('collect-scepter');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'scepter-recovered', value: true}),
      makeEvent({
        type: 'flag-changed',
        flag: 'prop-room-scepter-recovered-after-carriers',
        value: true,
      }),
      makeEvent({
        type: 'flag-changed',
        flag: 'bridge-pussy-prop-room-pussy-scepter-recovery-resolved',
        value: true,
      }),
      makeEvent({
        type: 'item-changed',
        itemId: scepterItemId,
        acquired: true,
      }),
    ]);
  }, [appendEvents, state.flags]);

  const startProkhorConversation = useCallback(() => {
    if (
      state.flags['prokhor-conversation-started']
      || state.flags['prokhor-funding-revealed']
    ) return;
    const commandId = createId('prokhor-conversation');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'prokhor-conversation-started', value: true}),
    ]);
  }, [appendEvents, state.flags]);

  const selectDanceTrack = useCallback((trackId: string) => {
    if (state.combat) return;
    const resolution = resolveDanceTrackSelection(definition.dancePuzzle, state.flags, trackId);
    if (resolution.kind === 'blocked') return;
    const {track} = resolution;
    const commandId = createId('dance-track');
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = definition.dancePuzzle.tracks.map((item) => makeEvent({
      type: 'flag-changed',
      flag: `dance-last-track-${item.id}`,
      value: item.id === track.id,
    }));

    if (resolution.kind === 'correct') {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'dance-correct-track-selected', value: true}),
        makeEvent({type: 'flag-changed', flag: 'dance-troupe-freed', value: true}),
        makeEvent({type: 'flag-changed', flag: 'dance-troupe-allies', value: true}),
        makeEvent({type: 'flag-changed', flag: 'troupe-passes-claimed', value: true}),
        makeEvent({type: 'clue-revealed', clueId: 'dressing-room-route'}),
        ...(definition.dancePuzzle.rewardItemId ? [makeEvent({type: 'item-changed' as const, itemId: definition.dancePuzzle.rewardItemId, acquired: true, quantity: definition.dancePuzzle.rewardQuantity ?? 4})] : []),
      );
    } else {
      nextEvents.push(
        makeEvent({
          type: 'flag-changed',
          flag: `dance-track-${track.id}-rejected`,
          value: true,
        }),
      );
    }

    if (resolution.summonGuards) {
      nextEvents.push(makeEvent({
        type: 'flag-changed',
        flag: 'dance-guard-wave-pending',
        value: true,
      }));
    }

    appendEvents(nextEvents);
  }, [appendEvents, definition.dancePuzzle, state.combat, state.flags]);

  const startDanceGuardCombat = useCallback(() => {
    if (
      !canStartDanceGuardCombat(state.flags, Boolean(state.combat))
    ) return false;
    const encounter = definition.encounters.find(
      (item) => item.id === definition.dancePuzzle.wrongTrackPenalty.encounterId,
    );
    if (!encounter) return false;
    const commandId = createId('dance-guard-wave');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({
        type: 'flag-changed',
        flag: 'dance-guard-wave-pending',
        value: false,
      }),
      makeEvent(createStartCombatCommand(encounter, sessionHeroes)),
    ]);
    return true;
  }, [
    appendEvents,
    definition.dancePuzzle.wrongTrackPenalty.encounterId,
    definition.encounters,
    sessionHeroes,
    state.combat,
    state.flags,
  ]);

  const inspectDressingRoomObject = useCallback((objectId: string) => {
    const object = definition.dressingRoom.objects.find((item) => item.id === objectId);
    if (!object || state.flags[`dressing-object-${object.id}-inspected`]) return;
    const commandId = createId('dressing-object');
    const makeEvent = eventFactory(commandId);
    appendEvents([makeEvent({
      type: 'flag-changed',
      flag: `dressing-object-${object.id}-inspected`,
      value: true,
    })]);
  }, [appendEvents, definition.dressingRoom.objects, state.flags]);

  const completeDressingRehearsal = useCallback(() => {
    if (!state.flags['satyr-freed'] || state.flags['dressing-doubles-disabled']) return;
    const check = definition.checks.find((item) => item.id === 'finish-dressing-rehearsal');
    const hero = heroes.find((item) => item.id === 'bubsilda') ?? heroes[0];
    if (!check || !hero) return;
    const commandId = createId('finish-dressing-rehearsal');
    const makeEvent = eventFactory(commandId);
    const result = resolveCheck(check, hero, 'charisma', [], true);
    appendEvents([
      makeEvent({type: 'roll-entered', result}),
      makeEvent({type: 'flag-changed', flag: 'dressing-doubles-disabled', value: true}),
      makeEvent({type: 'flag-changed', flag: 'stage-rehearsal-cue', value: true}),
      makeEvent({type: 'flag-changed', flag: 'stage-module-active', value: true}),
    ]);
  }, [appendEvents, definition.checks, heroes, state.flags]);

  const assistStageModule = useCallback((assistanceId: string) => {
    const assistance = definition.dressingRoom.stageModule.assistance
      .find((item) => item.id === assistanceId);
    if (
      !assistance
      || state.flags['stage-module-disabled']
      || state.flags['stage-assistance-used']
      || state.flags[`stage-assistance-${assistance.id}-used`]
    ) return;
    const completedFlag = !state.flags['stage-power-order-complete']
      ? 'stage-power-order-complete'
      : !state.flags['stage-lever-held']
        ? 'stage-lever-held'
        : null;
    if (!completedFlag) return;
    const otherCompletedFlag = completedFlag === 'stage-power-order-complete'
      ? 'stage-lever-held'
      : 'stage-power-order-complete';
    const commandId = createId('stage-assistance');
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [
      makeEvent({type: 'flag-changed', flag: 'stage-assistance-used', value: true}),
      makeEvent({type: 'flag-changed', flag: `stage-assistance-${assistance.id}-used`, value: true}),
      makeEvent({type: 'flag-changed', flag: completedFlag, value: true}),
    ];
    if (state.flags[otherCompletedFlag]) {
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'stage-power-key', value: true}),
        makeEvent({type: 'flag-changed', flag: 'stage-module-active', value: false}),
        makeEvent({type: 'flag-changed', flag: 'stage-module-disabled', value: true}),
      );
    }
    appendEvents(nextEvents);
  }, [appendEvents, definition.dressingRoom.stageModule.assistance, state.flags]);

  const inspectProkhorBill = useCallback(() => {
    if (
      !state.flags['prokhor-conversation-started']
      || state.flags['prokhor-bill-inspected']
      || state.flags['prokhor-funding-revealed']
    ) return;
    const commandId = createId('prokhor-bill');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'prokhor-bill-inspected', value: true}),
      makeEvent({type: 'clue-revealed', clueId: 'prokhor-bill-initials'}),
    ]);
  }, [appendEvents, state.flags]);

  const inspectProkhorTerminal = useCallback(() => {
    if (
      !state.flags['prokhor-bill-inspected']
      || state.flags['prokhor-terminal-inspected']
      || state.flags['prokhor-payment-audit-started']
      || state.flags['prokhor-funding-revealed']
    ) return;
    const commandId = createId('prokhor-terminal');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'prokhor-terminal-inspected', value: true}),
    ]);
  }, [appendEvents, state.flags]);

  const launchProkhorPaymentAudit = useCallback(() => {
    if (
      !state.flags['prokhor-terminal-inspected']
      || state.flags['prokhor-payment-audit-started']
      || state.flags['prokhor-funding-revealed']
    ) return;
    const commandId = createId('prokhor-payment-audit');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'prokhor-payment-audit-started', value: true}),
    ]);
  }, [appendEvents, state.flags]);

  const confirmProkhorPaymentByPhone = useCallback(() => {
    if (
      !state.flags['prokhor-payer-identified']
      || state.flags['prokhor-payment-confirmed']
    ) return;
    const commandId = createId('prokhor-payment-confirmation');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'prokhor-payment-confirmed', value: true}),
      makeEvent({type: 'flag-changed', flag: 'prokhor-funding-revealed', value: true}),
      makeEvent({type: 'flag-changed', flag: 'alexis-prokhor-task-completed', value: true}),
    ]);
  }, [appendEvents, state.flags]);

  const completeAlexisProkhorTask = useCallback(() => {
    if (
      state.activeView !== 'archive'
      || !state.flags['alexis-prokhor-task-completed']
      || state.flags['dressing-room-key-received']
    ) return;
    const commandId = createId('alexis-prokhor-reward');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'dressing-room-key-received', value: true}),
      makeEvent({type: 'item-changed', itemId: dressingRoomKeyItemId, acquired: true}),
    ]);
  }, [appendEvents, state.activeView, state.flags]);

  const startCombat = useCallback((encounterId = 'rail-prop-kraken') => {
    if (state.combat) return;
    if (
      encounterId === 'rail-prop-kraken'
      && (
        state.activeView !== 'kraken'
        || !state.inventory.includes(scepterItemId)
        || state.flags['rail-kraken-resolved']
      )
    ) return;
    const encounter = definition.encounters.find((item) => item.id === encounterId);
    if (!encounter) return;
    const commandId = createId('combat');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      ...(encounterId === 'hotel-bar-arcane-guards'
        ? []
        : [makeEvent({type: 'counter-changed', counter: 'preFinalCombats', delta: 1})]),
      makeEvent(createStartCombatCommand(encounter, sessionHeroes)),
    ]);
  }, [appendEvents, definition.encounters, sessionHeroes, state.activeView, state.combat, state.flags, state.inventory]);

  const startFinalBoss = useCallback((initiativeRolls: Record<string, number>) => {
    if (state.combat || state.selectedEnding) return false;
    const encounter = penisuelaFinalBoss.encounter;
    const initiative = resolveFinalBossInitiative([
      ...sessionHeroes.map((hero) => ({
        id: hero.id,
        name: hero.name,
        modifier: (hero.stats.dexterity ?? 0) + (state.participantTemporaryModifiers[hero.id] ?? 0),
      })),
      {
        id: encounter.id,
        name: encounter.name,
        modifier: encounter.initiative,
      },
    ], initiativeRolls);
    if (!initiative) return false;
    const commandId = createId('final-boss-start');
    const makeEvent = eventFactory(commandId);
    const participantNames = Object.fromEntries(initiative.entries.map((entry) => [entry.id, entry.name]));
    const initiativeText = initiative.entries.map((entry) => (
      `${entry.name}: d20 ${entry.natural} ${entry.modifier >= 0 ? '+' : '−'} ${Math.abs(entry.modifier)} = ${entry.total}`
    )).join('; ');
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'final-boss-started', value: true}),
      makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
      makeEvent({type: 'ending-selected', endingId: null}),
      makeEvent({type: 'combat-started', encounterId: encounter.id, initiativeOrder: initiative.order}),
      makeEvent({
        type: 'combat-log-added',
        text: `Инициатива зафиксирована: ${initiativeText}. Порядок: ${initiative.order.map((id) => participantNames[id]).join(' → ')}.`,
      }),
    ]);
    return true;
  }, [
    appendEvents,
    sessionHeroes,
    state.combat,
    state.participantTemporaryModifiers,
    state.selectedEnding,
  ]);

  const clearCombat = useCallback((nextView: GalleryView) => {
    const combat = state.combat;
    if (!combat) return false;
    const clearEvent = createClearCombatCommand(combat);
    if (!clearEvent) return false;
    const commandId = createId('clear-combat');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      // HP edits and non-attack abilities may win without the attack handler.
      // Apply the same story consequences before dismissing the encounter.
      ...(!state.flags[`combat-defeat-fallback-${combat.encounterId}`]
        && !(combat.encounterId === 'hotel-vip-guards' && state.flags['pussy-guards-defeated'])
        && !(combat.encounterId === 'prop-room-winding-carriers' && state.flags['prop-room-carriers-defeated'])
        ? getStandardCombatVictoryEvents(combat.encounterId, makeEvent)
        : []),
      makeEvent(clearEvent),
      makeEvent({type: 'view-changed', view: nextView}),
    ]);
    return true;
  }, [appendEvents, state.combat, state.flags]);

  const heroAttack = useCallback((
    heroId: string,
    targetEnemyId: string,
    providedRoll?: number,
    rerolledFrom?: number,
  ) => {
    const combat = state.combat;
    if (!combat) return false;
    if (
      combat.encounterId === penisuelaFinalBoss.encounter.id
      && !isFinalBossD20(providedRoll ?? Number.NaN)
    ) return false;
    const conditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, heroId),
    );
    const shamed = conditionResolution.rollModifier !== 0;
    const assignedRole = conditionResolution.blocked;
    const encounterAttack = definition.encounters.find((encounter) => encounter.id === combat.encounterId)
      ?.heroAttacks.find((attack) => attack.characterId === heroId);
    const attackOverride = state.heroAttackBonuses[heroId];
    const temporaryModifier = state.participantTemporaryModifiers[heroId] ?? 0;
    const conditionModifier = shamed ? -2 : 0;
    const situationalBonus = combat.encounterId === penisuelaFinalBoss.encounter.id && encounterAttack
      ? getFinalBossEffectiveHeroAttackBonus(
          encounterAttack.bonus,
          attackOverride,
          temporaryModifier,
          conditionModifier,
        ) - encounterAttack.bonus
      : (attackOverride === undefined || !encounterAttack ? 0 : attackOverride - encounterAttack.bonus)
        + temporaryModifier
        + conditionModifier;
    const events = createHeroAttackCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      heroId,
      targetEnemyId,
      providedRoll,
      situationalBonus,
      rerolledFrom,
    );
    if (!events) return false;
    const commandId = createId('hero-attack');
    const makeEvent = eventFactory(commandId);
    if (assignedRole) {
      const heroName = sessionHeroes.find((hero) => hero.id === heroId)?.name ?? heroId;
      appendEvents([
        ...createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent),
        ...(combat.encounterId === penisuelaFinalBoss.encounter.id
          ? createFinalBossNarrativeConditionLogEvents(state, heroId, heroName, makeEvent)
          : []),
        makeEvent({
          type: 'combat-log-added',
          text: 'Навязанная роль забирает формальное действие; атака не выполняется.',
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return false;
    }
    appendEvents([
      ...(shamed ? [
        ...createConsumedConditionEvents(state, heroId, 'shamed', makeEvent),
        makeEvent({type: 'combat-log-added' as const, text: 'Состояние «стыд» применило −2 и снято после броска.'}),
      ] : []),
      ...(combat.encounterId === penisuelaFinalBoss.encounter.id
        ? createFinalBossNarrativeConditionLogEvents(
            state,
            heroId,
            sessionHeroes.find((hero) => hero.id === heroId)?.name ?? heroId,
            makeEvent,
          )
        : []),
      ...events.map(makeEvent),
      ...createCombatItemChargeEvents(events, definition, state.inventoryState, makeEvent),
    ]);
    return events.some((event) => event.type === 'combat-attack-resolved' && event.hit);
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.combat,
    state.flags,
    state.heroAttackBonuses,
    state.heroHp,
    state.inventoryState,
    state.participantConditions,
    state.participantTemporaryModifiers,
    state.resourceUses,
  ]);

  const summonedAllyAttack = useCallback((allyId: string, targetEnemyId: string, providedRoll?: number) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createSummonedAllyAttackCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      allyId,
      targetEnemyId,
      providedRoll,
    );
    if (!events) return;
    const commandId = createId('summoned-ally-attack');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.combat,
    state.heroHp,
    state.inventoryState,
    state.participantConditions,
    state.resourceUses,
  ]);

  const resolveCombatSavingThrow = useCallback((providedRoll?: number, rerolledFrom?: number, useHelpingReaction = false) => {
    const combat = state.combat;
    if (!combat) return false;
    const events = createResolveCombatSavingThrowCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      providedRoll,
      rerolledFrom,
      useHelpingReaction,
    );
    if (!events) return false;
    const commandId = createId('combat-saving-throw');
    const makeEvent = eventFactory(commandId);
    const victory = events.some((event) => event.type === 'combat-ended');
    appendEvents([
      ...events.map(makeEvent),
      ...(victory ? getStandardCombatVictoryEvents(combat.encounterId, makeEvent) : []),
    ]);
    return true;
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.combat,
    state.heroHp,
    state.inventoryState,
    state.participantConditions,
    state.resourceUses,
  ]);

  const exposeCombatWeakness = useCallback((
    heroId: string,
    stat: HeroStat,
    providedRoll?: number,
    useClearChoiceConfirmation = false,
  ) => {
    const combat = state.combat;
    if (combat?.encounterId === penisuelaFinalBoss.encounter.id) return;
    const clearChoiceAvailable = state.inventory.includes('clear-choice-confirmation')
      && (state.itemCharges['clear-choice-confirmation'] ?? 0) > 0;
    const shamedFlag = `show18-shamed-${heroId}`;
    const assignedRoleFlag = `show18-assigned-role-${heroId}`;
    const shamed = Boolean(state.flags[shamedFlag]);
    const assignedRole = Boolean(state.flags[assignedRoleFlag]);
    const situationalBonus = (useClearChoiceConfirmation ? 2 : 0)
      + (shamed ? -2 : 0)
      + (state.participantTemporaryModifiers[heroId] ?? 0);
    if (!combat || (useClearChoiceConfirmation && !clearChoiceAvailable)) return;
    const resolution = resolveCombatWeaknessManeuver(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      heroId,
      stat,
      providedRoll,
      situationalBonus,
    );
    if (!resolution) return;
    if (assignedRole) {
      const commandId = createId('combat-weakness-blocked');
      const makeEvent = eventFactory(commandId);
      appendEvents([
        ...createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent),
        makeEvent({
          type: 'combat-log-added',
          text: 'Навязанная роль забирает формальное действие; манёвр не выполняется.',
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return;
    }
    const rolls = [resolution.natural];
    const commandId = createId('combat-weakness');
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [
      ...(useClearChoiceConfirmation ? [
        makeEvent({
          type: 'item-charge-changed' as const,
          itemId: 'clear-choice-confirmation',
          change: {mode: 'delta' as const, value: -1},
        }),
        makeEvent({type: 'flag-changed' as const, flag: 'clear-choice-confirmation-used', value: true}),
      ] : []),
      ...(shamed ? [
        ...createConsumedConditionEvents(state, heroId, 'shamed', makeEvent),
        makeEvent({type: 'combat-log-added' as const, text: 'Состояние «стыд» применило −2 и снято после проверки канала.'}),
      ] : []),
      makeEvent({
      type: 'roll-entered',
      result: {
        checkId: `${combat.encounterId}-weakness`,
        heroId,
        stat,
        rolls,
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
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.combat,
    state.flags,
    state.heroHp,
    state.inventory,
    state.inventoryState,
    state.itemCharges,
    state.participantConditions,
    state.participantTemporaryModifiers,
    state.resourceUses,
  ]);

  const selectCombatAction = useCallback((actionId: string) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createSelectCombatActionCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      actionId,
    );
    if (!events) return;
    const commandId = createId('select-combat-action');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.combat,
    state.heroHp,
    state.inventoryState,
    state.resourceUses,
  ]);

  const useCombatAction = useCallback((actionId: string, selectedTargetId?: string, providedRoll?: number) => {
    const combat = state.combat;
    if (!combat) return false;
    const activeHeroId = combat.initiativeOrder[combat.turnIndex];
    const conditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, activeHeroId),
    );
    const assignedRole = conditionResolution.blocked;
    const activeHeroName = sessionHeroes.find((hero) => hero.id === activeHeroId)?.name ?? activeHeroId;
    const events = createUseCombatActionCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      actionId,
      selectedTargetId,
      providedRoll,
    );
    if (!events) return false;
    const commandId = createId('combat-action');
    const makeEvent = eventFactory(commandId);
    if (assignedRole) {
      appendEvents([
        ...createConsumedConditionEvents(state, activeHeroId, 'assigned-role', makeEvent),
        ...(combat.encounterId === penisuelaFinalBoss.encounter.id
          ? createFinalBossNarrativeConditionLogEvents(state, activeHeroId, activeHeroName, makeEvent)
          : []),
        makeEvent({
          type: 'combat-log-added',
          text: 'Навязанная роль забирает формальное действие; выбранный приём не выполняется.',
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return false;
    }
    appendEvents([
      ...(combat.encounterId === penisuelaFinalBoss.encounter.id ? [
        ...createFinalBossNarrativeConditionLogEvents(state, activeHeroId, activeHeroName, makeEvent),
        ...(conditionResolution.rollModifier !== 0 ? [makeEvent({
          type: 'combat-log-added' as const,
          text: `${activeHeroName}: «стыд» относится к следующей атаке или проверке и не расходуется броском лечения/автоматическим приёмом.`,
        })] : []),
      ] : []),
      ...events.map(makeEvent),
      ...createCombatItemChargeEvents(events, definition, state.inventoryState, makeEvent),
    ]);
    return true;
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state,
  ]);

  const equipCombatItem = useCallback((actionId: string | null) => {
    const combat = state.combat;
    if (!combat) return;
    const events = createEquipCombatItemCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      actionId,
    );
    if (!events) return;
    const commandId = createId('equip-combat-item');
    const makeEvent = eventFactory(commandId);
    appendEvents(events.map(makeEvent));
  }, [
    appendEvents,
    definition,
    sessionHeroes,
    state.combat,
    state.heroHp,
    state.inventoryState,
    state.resourceUses,
  ]);

  const enemyAttack = useCallback((
    targetId: string,
    providedRoll?: number,
    useHelpingReaction = false,
    confirmedDecision?: {actionId: string; targetIds: string[]; explanation: string},
  ) => {
    const combat = state.combat;
    if (!combat) return;
    if (combat.encounterId === penisuelaFinalBoss.encounter.id) return;
    const activeEnemy = combat.enemies[combat.initiativeOrder[combat.turnIndex]];
    let resolvedTargetId = targetId;
    const firstRoundShow18 = combat.encounterId === 'universal-advice-algorithm' && combat.round === 1;
    if (firstRoundShow18) {
      const untargetedHero = sessionHeroes.find((hero) => (
        (state.heroHp[hero.id] ?? 0) > 0
        && !state.flags[`show18-first-round-target-${hero.id}`]
      ));
      if (untargetedHero && state.flags[`show18-first-round-target-${targetId}`]) {
        resolvedTargetId = untargetedHero.id;
      }
    }
    const heroTarget = sessionHeroes.find((hero) => hero.id === resolvedTargetId);
    const allyTarget = combat.allies[resolvedTargetId];
    const target = heroTarget ?? allyTarget;
    const savingThrow = activeEnemy?.attack.savingThrow;
    if (!activeEnemy || !target || (confirmedDecision && confirmedDecision.actionId !== activeEnemy.attack.id)) return;
    const selectedSkill = !confirmedDecision && definition.combatActions.find((action) => action.characterId === activeEnemy.id && combat.selectedActionIds.includes(action.id) && action.activation === 'attack');
    const attackId = selectedSkill ? selectedSkill.id : activeEnemy.attack.id;
    const attackName = selectedSkill ? selectedSkill.name : activeEnemy.attack.name;
    const suggestedDecision = getNpcDecision(activeEnemy.id)?.suggestion;
    const explanation = confirmedDecision?.explanation
      ?? (suggestedDecision?.actionId === attackId
        && suggestedDecision.targetIds[0] === resolvedTargetId
        ? suggestedDecision.explanation
        : `Мастер выбрал доступную атаку «${attackName}» и цель ${target.name}.`);
    const createConfirmedSelectionEvents = (makeEvent: ReturnType<typeof eventFactory>) => createNpcSelectionEvents(
      makeEvent,
      {
        actorId: activeEnemy.id,
        actorName: activeEnemy.name,
        actionId: attackId,
        actionName: attackName,
        targetIds: [target.id],
        targetNames: [target.name],
        explanation,
      },
    );
    if (activeEnemy && heroTarget && savingThrow) {
      const commandId = createId(`show18-${savingThrow.condition}`);
      const makeEvent = eventFactory(commandId);
      const consumeStatusEvent = (status: CombatStatusState, text: string) => makeEvent(
        status.charges <= 1
          ? {type: 'combat-status-removed' as const, statusId: status.id, text}
          : {
              type: 'combat-status-applied' as const,
              status: {...status, charges: status.charges - 1},
              text,
            },
      );
      const jammed = combat.statuses.find((status) => (
        status.kind === 'jammed' && status.targetId === activeEnemy.id && status.charges > 0
      ));
      if (jammed) {
        appendEvents([
          ...createConfirmedSelectionEvents(makeEvent),
          ...(firstRoundShow18 ? [makeEvent({
            type: 'flag-changed' as const,
            flag: `show18-first-round-target-${resolvedTargetId}`,
            value: true,
          })] : []),
          consumeStatusEvent(
            jammed,
            `Хакерский импульс глушит дополнительный эффект «${activeEnemy.attack.name}»: спасбросок не требуется.`,
          ),
          makeEvent({type: 'turn-advanced'}),
        ]);
        return true;
      }
      const natural = providedRoll ?? rollDie(20);
      if (!Number.isInteger(natural) || natural < 1 || natural > 20) return;
      const savingThrowResolution = resolveAlliedCombatSavingThrowReactions(
        {
          combat,
          definition,
          heroes: sessionHeroes,
          heroHp: state.heroHp,
          inventoryState: state.inventoryState,
          resourceUses: state.resourceUses,
          participantConditions: state.participantConditions,
        },
        heroTarget.id,
        natural,
        heroTarget.stats[savingThrow.stat] ?? 0,
        savingThrow.dc,
        useHelpingReaction,
      );
      if (!savingThrowResolution) return;
      const {modifier, total, success} = savingThrowResolution;
      const conditionLabel = savingThrow.condition === 'shamed'
        ? 'стыд: −2 к следующей атаке или проверке'
        : 'назначенная роль до следующего действия';
      const reactionEvents = savingThrowResolution.events.map(makeEvent);
      appendEvents([
        ...createConfirmedSelectionEvents(makeEvent),
        ...(firstRoundShow18 ? [makeEvent({
          type: 'flag-changed' as const,
          flag: `show18-first-round-target-${resolvedTargetId}`,
          value: true,
        })] : []),
        ...(resolvedTargetId !== targetId ? [makeEvent({
          type: 'combat-log-added' as const,
          text: `Первый раунд требует разные цели: ${activeEnemy.name} переводит прожектор на ${target.name}.`,
        })] : []),
        makeEvent({
          type: 'roll-entered',
          result: {
            checkId: `show18-${savingThrow.condition}-${target.id}`,
            heroId: heroTarget.id,
            stat: savingThrow.stat as HeroStat,
            rolls: [natural],
            modifier,
            total,
            dc: savingThrow.dc,
            success,
            automatic: false,
            text: success
              ? `${heroTarget.name} отказывается принимать навязанную формулу.`
              : `${heroTarget.name} получает состояние «${conditionLabel}».`,
          },
        }),
        makeEvent({
          type: 'combat-log-added',
          text: `${activeEnemy.name}: «${activeEnemy.attack.name}». ${heroTarget.name} бросает Мудрость: ${natural} + ${modifier} = ${total} против DC ${savingThrow.dc}; ${success ? 'успех' : `провал — ${conditionLabel}`}.`,
        }),
        ...reactionEvents,
        ...(!success ? [makeEvent({
          type: 'flag-changed' as const,
          flag: `show18-${savingThrow.condition}-${heroTarget.id}`,
          value: true,
        })] : []),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }
    const temporaryModifier = activeEnemy
      ? state.participantTemporaryModifiers[activeEnemy.id] ?? 0
      : 0;
    const effectiveCombat = activeEnemy && temporaryModifier !== 0 ? {
      ...combat,
      enemies: {
        ...combat.enemies,
        [activeEnemy.id]: {
          ...activeEnemy,
          attack: {...activeEnemy.attack, bonus: activeEnemy.attack.bonus + temporaryModifier},
        },
      },
    } : combat;
    const events = createEnemyAttackCommand(
      {
        combat: confirmedDecision ? {...effectiveCombat, selectedActionIds: []} : effectiveCombat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      resolvedTargetId,
      providedRoll,
      undefined,
      useHelpingReaction,
    );
    if (!events) return;
    const commandId = createId('enemy-attack');
    const makeEvent = eventFactory(commandId);
    const attackResolution = events.find((event) => event.type === 'combat-attack-resolved');
    const controlEffectText = attackResolution?.type === 'combat-attack-resolved' && attackResolution.hit
      ? activeEnemy.attack.id === 'urgent-conclusion'
        ? `${target.name} оттеснён на два метра к прожектору.`
        : activeEnemy.attack.id === 'curtain-applause'
          ? `${target.name} оттеснён от голосовой двери на два метра.`
          : activeEnemy.attack.id === 'plywood-maw'
            ? `${target.name} отброшен от аварийного рычага на два метра.`
            : activeEnemy.attack.id === 'repeat-encore'
              ? `${activeEnemy.name} копирует позу ${target.name} и удерживает охраняемую зону.`
              : null
      : null;
    const cancelsTelegraphedRailCharge = activeEnemy.id === 'rail-prop-kraken'
      && combat.weaknessExposed
      && state.flags['rail-charge-telegraphed'];
    appendEvents([
      ...createConfirmedSelectionEvents(makeEvent),
      ...(cancelsTelegraphedRailCharge ? [
        makeEvent({type: 'flag-changed' as const, flag: 'rail-charge-telegraphed', value: false}),
        makeEvent({type: 'combat-log-added' as const, text: 'Заклинивание рельса срывает объявленный разгон; кракен переходит к Фанерной пасти.'}),
      ] : []),
      ...(firstRoundShow18 ? [makeEvent({
        type: 'flag-changed' as const,
        flag: `show18-first-round-target-${resolvedTargetId}`,
        value: true,
      })] : []),
      ...(resolvedTargetId !== targetId && target ? [makeEvent({
        type: 'combat-log-added' as const,
        text: `Первый раунд требует разные цели: ${activeEnemy?.name ?? 'Маска'} переводит прожектор на ${target.name}.`,
      })] : []),
      ...(confirmedDecision ? combat.selectedActionIds.map((actionId) => makeEvent({type: 'combat-action-selected' as const, actionId, selected: false})) : []),
      ...events.map(makeEvent),
      ...(controlEffectText ? [makeEvent({type: 'combat-log-added' as const, text: controlEffectText})] : []),
    ]);
    return true;
  }, [
    appendEvents,
    definition,
    getNpcDecision,
    sessionHeroes,
    state.combat,
    state.flags,
    state.heroHp,
    state.participantTemporaryModifiers,
  ]);

  const applyCombatDamage = useCallback((rawDiceTotal: number) => {
    const combat = state.combat;
    if (!combat) return false;
    const resolution = createApplyCombatDamageCommand(
      {
        combat,
        definition,
        heroes: sessionHeroes,
        heroHp: state.heroHp,
        inventoryState: state.inventoryState,
        resourceUses: state.resourceUses,
        participantConditions: state.participantConditions,
      },
      rawDiceTotal,
    );
    if (!resolution) return false;
    const pendingAttackCommandId = combat.pendingAttack
      ? [...events].reverse().find((event) => (
        event.type === 'combat-attack-resolved'
        && event.attack.actorId === combat.pendingAttack?.actorId
        && event.attack.targetId === combat.pendingAttack.targetId
      ))?.commandId
      : undefined;
    const commandId = pendingAttackCommandId ?? createId('combat-damage');
    const makeEvent = eventFactory(commandId);
    const isFinalBoss = combat.encounterId === penisuelaFinalBoss.encounter.id;
    const manualFinalBossAc = isFinalBoss
      ? getActiveManualParticipantStatValue(events, penisuelaFinalBoss.encounter.id, 'ac')
      : undefined;
    const manualFinalBossAttackBonus = isFinalBoss
      ? getActiveManualParticipantStatValue(events, penisuelaFinalBoss.encounter.id, 'attackBonus')
      : undefined;
    const resolvedEvents = resolution.events.map((event) => (
      isFinalBoss && event.type === 'combat-phase-advanced'
        ? {
            ...event,
            ac: manualFinalBossAc ?? getFinalBossPhaseAc(event.phase, state.flags),
            attack: {
              ...event.attack,
              bonus: manualFinalBossAttackBonus ?? event.attack.bonus,
            },
          }
        : event
    ));
    const nextEvents: GalleryEvent[] = resolvedEvents.map(makeEvent);
    if (isFinalBoss) {
      const transition = resolvedEvents.find((event) => event.type === 'combat-phase-advanced');
      if (transition?.type === 'combat-phase-advanced') {
        const nextPhase = penisuelaFinalBoss.phases.find((phase) => phase.number === transition.phase);
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
          ...(nextPhase ? [makeEvent({type: 'combat-log-added', text: nextPhase.readAloud})] : []),
          ...getFinalBossStageCueEvents(state.flags, makeEvent),
        );
      }
      if (resolution.victory) {
        const physicalPlan = penisuelaFinalBoss.plans.find((plan) => plan.id === 'physical');
        if (physicalPlan) nextEvents.push(...getFinalBossPlanEndingEvents(physicalPlan, makeEvent));
      }
    }
    if (resolution.victory) nextEvents.push(...getStandardCombatVictoryEvents(combat.encounterId, makeEvent));

    appendEvents(nextEvents);
    return {
      savingThrowRequired: resolvedEvents.some((event) => event.type === 'combat-saving-throw-requested'),
    };
  }, [appendEvents, definition, events, sessionHeroes, state.combat, state.flags, state.heroHp]);

  const cancelPendingCombatAttackWithRedButton = useCallback(() => {
    const combat = state.combat;
    const pendingAttack = combat?.pendingAttack;
    if (
      !combat
      || !pendingAttack
      || !combat.enemies[pendingAttack.actorId]
      || !state.inventory.includes('red-button-18-plus')
      || (state.itemCharges['red-button-18-plus'] ?? 0) < 1
    ) return false;
    const commandId = createId('red-button-cancel-attack');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({
        type: 'item-charge-changed',
        itemId: 'red-button-18-plus',
        change: {mode: 'delta', value: -1},
      }),
      makeEvent({
        type: 'combat-attack-cancelled',
        text: `Красная кнопка 18+ отменяет ещё не разрешённую реакцию «${pendingAttack.attackName}». Урон не применяется.`,
      }),
      makeEvent({type: 'flag-changed', flag: 'red-button-18-plus-used', value: true}),
      makeEvent({type: 'turn-advanced'}),
    ]);
    return true;
  }, [appendEvents, state.combat, state.inventory, state.itemCharges]);

  const clearShow18ConditionWithOlva = useCallback((
    heroId: string,
    condition: 'shamed' | 'assigned-role',
  ) => {
    const combat = state.combat;
    const conditionFlag = `show18-${condition}-${heroId}`;
    const hero = heroes.find((candidate) => candidate.id === heroId);
    if (
      !combat
      || combat.encounterId !== 'universal-advice-algorithm'
      || !hero
      || !state.flags[conditionFlag]
      || state.flags['show18-olva-assist-used']
    ) return false;
    const commandId = createId('show18-olva-assist');
    const makeEvent = eventFactory(commandId);
    const decision = getNpcDecision('olga-vasilenko')?.suggestion;
    const explanation = decision?.actionId === 'olga-restore-boundary' && decision.targetIds[0] === hero.id
      ? decision.explanation
      : `Мастер направил поддержку Оливии на ${hero.name}: состояние «${condition}» снимается.`;
    appendEvents([
      ...createNpcSelectionEvents(makeEvent, {
        actorId: 'olga-vasilenko',
        actorName: 'Леди Оливия',
        actionId: 'olga-restore-boundary',
        actionName: 'Вернуть безопасные границы',
        targetIds: [hero.id],
        targetNames: [hero.name],
        explanation,
      }),
      makeEvent({type: 'flag-changed', flag: conditionFlag, value: false}),
      makeEvent({type: 'flag-changed', flag: 'show18-olva-assist-used', value: true}),
      makeEvent({
        type: 'combat-log-added',
        text: `Оливия один раз возвращает ${hero.name} право на собственный ответ и снимает состояние «${condition === 'shamed' ? 'стыд' : 'назначенная роль'}».`,
      }),
    ]);
    return true;
  }, [appendEvents, getNpcDecision, heroes, state.combat, state.flags]);

  const clearShow18ConditionWithRedButton = useCallback((
    heroId: string,
    condition: 'shamed' | 'assigned-role',
  ) => {
    const combat = state.combat;
    const conditionFlag = `show18-${condition}-${heroId}`;
    const hero = heroes.find((candidate) => candidate.id === heroId);
    if (
      !combat
      || combat.encounterId !== 'universal-advice-algorithm'
      || !hero
      || !state.flags[conditionFlag]
      || !state.inventory.includes('red-button-18-plus')
      || (state.itemCharges['red-button-18-plus'] ?? 0) < 1
    ) return false;
    const commandId = createId('show18-red-button-condition');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({
        type: 'item-charge-changed',
        itemId: 'red-button-18-plus',
        change: {mode: 'delta', value: -1},
      }),
      makeEvent({type: 'flag-changed', flag: conditionFlag, value: false}),
      makeEvent({type: 'flag-changed', flag: 'red-button-18-plus-used', value: true}),
      makeEvent({
        type: 'combat-log-added',
        text: `Красная кнопка 18+ снимает с ${hero.name} состояние «${condition === 'shamed' ? 'стыд' : 'назначенная роль'}».`,
      }),
    ]);
    return true;
  }, [appendEvents, heroes, state.combat, state.flags, state.inventory, state.itemCharges]);

  const resolveFinalBossChannel = useCallback((
    heroId: string,
    stat: HeroStat,
    providedRoll: number,
    useClearChoiceConfirmation = false,
    providedReroll?: number,
  ) => {
    const combat = state.combat;
    const hero = sessionHeroes.find((candidate) => candidate.id === heroId);
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    const clearChoiceAvailable = state.inventory.includes('clear-choice-confirmation')
      && (state.itemCharges['clear-choice-confirmation'] ?? 0) > 0;
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== heroId
      || !hero
      || (state.heroHp[heroId] ?? 0) <= 0
      || !boss
      || boss.hp <= 0
      || !penisuelaFinalBoss.encounter.weakness.stats.includes(stat)
      || (useClearChoiceConfirmation && !clearChoiceAvailable)
    ) return false;

    const conditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, heroId),
    );
    const commandId = createId('final-boss-channel');
    const makeEvent = eventFactory(commandId);
    if (conditionResolution.blocked) {
      appendEvents([
        ...createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent),
        ...createFinalBossNarrativeConditionLogEvents(state, heroId, hero.name, makeEvent),
        makeEvent({
          type: 'combat-log-added',
          text: `${hero.name}: «назначенная роль» забирает формальное действие; d20 канала не применяется.`,
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }

    const modifier = (hero.stats[stat] ?? 0)
      + (state.participantTemporaryModifiers[heroId] ?? 0)
      + conditionResolution.rollModifier
      + (useClearChoiceConfirmation ? 2 : 0);
    const primary = resolveFinalBossSavingThrow(
      providedRoll,
      modifier,
      penisuelaFinalBoss.encounter.weakness.dc,
    );
    if (!primary) return false;
    const rerollAvailable = !primary.success
      && state.flags['egorik-nastya-allies']
      && !state.flags['egorik-nastya-final-reroll-used'];
    const reroll = rerollAvailable
      ? resolveFinalBossSavingThrow(
          providedReroll ?? Number.NaN,
          modifier,
          penisuelaFinalBoss.encounter.weakness.dc,
        )
      : null;
    if (rerollAvailable && !reroll) return false;
    const finalResolution = reroll ?? primary;
    const rolls = reroll ? [primary.natural, reroll.natural] : [primary.natural];
    const resultText = finalResolution.success
      ? `${hero.name} разрывает активный канал Последнего дубля.`
      : `${hero.name} не успевает разорвать активный канал.`;
    appendEvents([
      ...(useClearChoiceConfirmation ? [
        makeEvent({
          type: 'item-charge-changed' as const,
          itemId: 'clear-choice-confirmation',
          change: {mode: 'delta' as const, value: -1},
        }),
        makeEvent({type: 'flag-changed' as const, flag: 'clear-choice-confirmation-used', value: true}),
      ] : []),
      ...(conditionResolution.rollModifier !== 0 ? [
        ...createConsumedConditionEvents(state, heroId, 'shamed', makeEvent),
        makeEvent({
          type: 'combat-log-added' as const,
          text: `${hero.name}: «стыд» даёт −2 к проверке канала и снимается этим же действием.`,
        }),
      ] : []),
      ...createFinalBossNarrativeConditionLogEvents(state, heroId, hero.name, makeEvent),
      ...(reroll ? [
        makeEvent({type: 'flag-changed' as const, flag: 'egorik-nastya-final-reroll-used', value: true}),
        makeEvent({
          type: 'combat-log-added' as const,
          text: `Егорик и Настасья дают явный повтор: первый d20 ${primary.natural}, второй d20 ${reroll.natural}.`,
        }),
      ] : []),
      makeEvent({
        type: 'roll-entered',
        result: {
          checkId: `${combat.encounterId}-weakness`,
          heroId,
          stat,
          rolls,
          modifier: finalResolution.modifier,
          total: finalResolution.total,
          dc: finalResolution.dc,
          success: finalResolution.success,
          automatic: false,
          text: resultText,
        },
      }),
      makeEvent({
        type: 'combat-log-added',
        text: `${resultText} Итоговый d20 ${finalResolution.natural} ${modifier >= 0 ? '+' : '−'} ${Math.abs(modifier)} = ${finalResolution.total} против DC ${finalResolution.dc}.`,
      }),
      ...(finalResolution.success && !combat.weaknessExposed ? [makeEvent({
        type: 'combat-weakness-exposed' as const,
        text: `${hero.name} раскрывает канал: следующая фазовая атака полностью отменяется.`,
      })] : []),
      makeEvent({type: 'turn-advanced'}),
    ]);
    return true;
  }, [
    appendEvents,
    sessionHeroes,
    state,
  ]);

  const resolveFinalBossPlan = useCallback((
    planId: FinalBossPlanDefinition['id'],
    heroId: string,
    stat: HeroStat,
    providedRoll: number,
    useClearChoiceConfirmation = false,
    reaction?: FinalBossPlanReactionInput,
  ) => {
    const combat = state.combat;
    const hero = sessionHeroes.find((candidate) => candidate.id === heroId);
    const plan = penisuelaFinalBoss.plans.find((candidate) => candidate.id === planId);
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    const clearChoiceAvailable = state.inventory.includes('clear-choice-confirmation')
      && (state.itemCharges['clear-choice-confirmation'] ?? 0) > 0;
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== heroId
      || !hero
      || (state.heroHp[heroId] ?? 0) <= 0
      || !plan?.check
      || !plan.check.stats.includes(stat)
      || !boss
      || boss.hp <= 0
      || !isFinalBossPlanAvailable(plan, {flags: state.flags, counters: state.counters})
      || (useClearChoiceConfirmation && !clearChoiceAvailable)
    ) return false;

    const conditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, heroId),
    );
    const commandId = createId(`final-boss-${plan.id}`);
    const makeEvent = eventFactory(commandId);
    if (conditionResolution.blocked) {
      appendEvents([
        ...createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent),
        ...createFinalBossNarrativeConditionLogEvents(state, heroId, hero.name, makeEvent),
        makeEvent({
          type: 'combat-log-added',
          text: `${hero.name}: «назначенная роль» забирает формальное действие; d20 плана не применяется.`,
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }

    const natural = providedRoll;
    if (!isFinalBossD20(natural)) return false;
    const modifier = (hero.stats[stat] ?? 0)
      + (state.participantTemporaryModifiers[heroId] ?? 0)
      + conditionResolution.rollModifier
      + (useClearChoiceConfirmation ? 2 : 0);
    const resolution = resolveFinalBossPlanCheck(
      penisuelaFinalBoss,
      plan,
      boss.hp,
      modifier,
      natural,
    );
    if (!resolution) return false;

    const phase = getFinalBossPhase(penisuelaFinalBoss, boss.hp);
    const bossConditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, boss.id),
    );
    const backlashBlocked = !resolution.success && bossConditionResolution.blocked;
    const backlashBonus = getFinalBossEffectiveAttackBonus(
      6,
      getFinalBossRuntimeAttackBonus(penisuelaFinalBoss, phase.number),
      boss.attack.bonus,
      (state.participantTemporaryModifiers[boss.id] ?? 0) + bossConditionResolution.rollModifier,
    );
    const backlash = !resolution.success && !backlashBlocked
      ? resolveFinalBossAttackRoll(reaction?.natural ?? Number.NaN, backlashBonus, hero.ac)
      : null;
    const backlashDamage = backlash?.hit
      ? resolveFinalBossDamageRoll(
          '1d6+3',
          backlash.critical,
          reaction?.rawDamage ?? Number.NaN,
        )
      : null;
    if (
      !resolution.success
      && !backlashBlocked
      && (!backlash || (backlash.hit && !backlashDamage))
    ) return false;
    const resultText = resolution.success
      ? `${hero.name}: «${plan.label}» закрывает контур ${phase.number}.`
      : `${hero.name}: «${plan.label}» не удерживает контур ${phase.number}; модуль немедленно перестраивает поле.`;
    const nextEvents: GalleryEvent[] = [
      ...(useClearChoiceConfirmation ? [
        makeEvent({
          type: 'item-charge-changed' as const,
          itemId: 'clear-choice-confirmation',
          change: {mode: 'delta' as const, value: -1},
        }),
        makeEvent({type: 'flag-changed' as const, flag: 'clear-choice-confirmation-used', value: true}),
      ] : []),
      ...(conditionResolution.rollModifier !== 0 ? [
        ...createConsumedConditionEvents(state, heroId, 'shamed', makeEvent),
        makeEvent({
          type: 'combat-log-added' as const,
          text: `${hero.name}: «стыд» даёт −2 к проверке плана и снимается этим же действием.`,
        }),
      ] : []),
      ...createFinalBossNarrativeConditionLogEvents(state, heroId, hero.name, makeEvent),
      makeEvent({
        type: 'roll-entered',
        result: {
          checkId: `last-take-${plan.id}-phase-${phase.number}`,
          heroId,
          stat,
          rolls: [resolution.natural],
          modifier: resolution.modifier,
          total: resolution.total,
          dc: resolution.dc,
          success: resolution.success,
          automatic: false,
          text: resultText,
        },
      }),
      makeEvent({
        type: 'combat-log-added',
        text: `${resultText} d20 ${resolution.natural} ${resolution.modifier >= 0 ? '+' : '−'} ${Math.abs(resolution.modifier)} = ${resolution.total} против DC ${resolution.dc}.`,
      }),
    ];

    if (!resolution.success) {
      if (backlashBlocked) {
        nextEvents.push(
          ...createConsumedConditionEvents(state, boss.id, 'assigned-role', makeEvent),
          ...createFinalBossNarrativeConditionLogEvents(state, boss.id, boss.name, makeEvent),
          makeEvent({
            type: 'combat-log-added',
            text: `${boss.name}: «назначенная роль» забирает немедленную реакцию; d20 и урон обратного импульса не применяются.`,
          }),
          makeEvent({type: 'turn-advanced'}),
        );
        appendEvents(nextEvents);
        return true;
      }
      nextEvents.push(
        ...(bossConditionResolution.rollModifier !== 0 ? [
          ...createConsumedConditionEvents(state, boss.id, 'shamed', makeEvent),
          makeEvent({
            type: 'combat-log-added' as const,
            text: `${boss.name}: «стыд» даёт −2 к обратному импульсу и снимается этой реакцией.`,
          }),
        ] : []),
        ...createFinalBossNarrativeConditionLogEvents(state, boss.id, boss.name, makeEvent),
      );
      nextEvents.push(makeEvent({
        type: 'combat-attack-resolved',
        hit: backlash!.hit,
        attack: {
          actorId: boss.id,
          actorName: boss.name,
          targetId: hero.id,
          targetName: hero.name,
          attackName: 'Обратный импульс режиссуры',
          natural: backlash!.natural,
          bonus: backlashBonus,
          total: backlash!.total,
          targetAc: hero.ac,
          critical: backlash!.critical,
          damageExpression: '1d6+3',
        },
        text: backlash!.hit
          ? `Немедленная реакция: обратный импульс попадает по ${hero.name} (d20 ${backlash!.natural} ${backlashBonus >= 0 ? '+' : '−'} ${Math.abs(backlashBonus)} = ${backlash!.total} против AC ${hero.ac})${backlash!.critical ? ', натуральная 20 — критическое попадание' : ''}.`
          : `Немедленная реакция: ${hero.name} уходит от обратного импульса (d20 ${backlash!.natural} ${backlashBonus >= 0 ? '+' : '−'} ${Math.abs(backlashBonus)} = ${backlash!.total} против AC ${hero.ac})${backlash!.natural === 1 ? ', натуральная 1 — автоматический промах' : ''}.`,
      }));
      if (backlash!.hit && backlashDamage) nextEvents.push(makeEvent({
        type: 'combat-damage-resolved',
        targetId: hero.id,
        amount: backlashDamage.amount,
        text: `Обратный импульс: кубики ${formatDamageCalculation(backlashDamage.rawDiceTotal, backlashDamage.modifier, backlashDamage.critical)} = ${backlashDamage.amount} урона после провала плана.`,
      }));
      nextEvents.push(makeEvent({type: 'turn-advanced'}));
      appendEvents(nextEvents);
      return true;
    }

    const floor = getFinalBossPhaseFloor(penisuelaFinalBoss, boss.hp);
    const damage = Math.max(0, boss.hp - floor);
    nextEvents.push(makeEvent({
      type: 'combat-damage-resolved',
      targetId: boss.id,
      amount: damage,
      text: `${plan.label}: контур ${phase.number} принимает ${damage} системного урона до порога ${floor} HP; лишний эффект не переносится.`,
    }));

    if (floor <= 0) {
      nextEvents.push(
        makeEvent({type: 'combat-ended', text: penisuelaFinalBoss.encounter.victoryText ?? 'Последний контур закрыт.'}),
        ...getFinalBossPlanEndingEvents(plan, makeEvent),
      );
    } else {
      const transition = penisuelaFinalBoss.encounter.phaseTransitions
        ?.find((candidate) => candidate.hpFloor === floor);
      const nextPhase = penisuelaFinalBoss.phases.find((candidate) => candidate.hpFrom === floor);
      if (!transition || !nextPhase) return false;
      nextEvents.push(
        makeEvent({
          type: 'combat-phase-advanced',
          phase: transition.phase,
          name: transition.name,
          ac: getActiveManualParticipantStatValue(events, boss.id, 'ac')
            ?? getFinalBossPhaseAc(transition.phase, state.flags),
          attack: {
            ...transition.attack,
            bonus: getActiveManualParticipantStatValue(events, boss.id, 'attackBonus')
              ?? transition.attack.bonus,
          },
          text: `Контур ${transition.phase}: «${transition.name}». Броня и активная атака перестраиваются.`,
        }),
        makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
        makeEvent({type: 'combat-log-added', text: nextPhase.readAloud}),
        ...getFinalBossStageCueEvents(state.flags, makeEvent),
        makeEvent({type: 'turn-advanced'}),
      );
    }
    appendEvents(nextEvents);
    return true;
  }, [
    appendEvents,
    events,
    sessionHeroes,
    state,
  ]);

  const acceptFinalBossHeroicIdea = useCallback((heroId: string) => {
    const combat = state.combat;
    const hero = sessionHeroes.find((candidate) => candidate.id === heroId);
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== heroId
      || !hero
      || (state.heroHp[heroId] ?? 0) <= 0
      || state.flags['final-boss-heroic-idea-used']
    ) return false;
    const commandId = createId('final-boss-heroic-idea');
    const makeEvent = eventFactory(commandId);
    const conditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, heroId),
    );
    if (conditionResolution.blocked) {
      appendEvents([
        ...createConsumedConditionEvents(state, heroId, 'assigned-role', makeEvent),
        ...createFinalBossNarrativeConditionLogEvents(state, heroId, hero.name, makeEvent),
        makeEvent({
          type: 'combat-log-added',
          text: `${hero.name}: «назначенная роль» забирает формальное действие; точная идея не применяется.`,
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }
    appendEvents([
      ...createFinalBossNarrativeConditionLogEvents(state, heroId, hero.name, makeEvent),
      ...(conditionResolution.rollModifier !== 0 ? [makeEvent({
        type: 'combat-log-added' as const,
        text: `${hero.name}: «стыд» не расходуется, потому что мастер принял идею без атаки или проверки.`,
      })] : []),
      makeEvent({type: 'flag-changed', flag: 'final-boss-heroic-idea-used', value: true}),
      makeEvent({
        type: 'combat-weakness-exposed',
        text: `${hero.name}: мастер принимает особенно точное решение без броска. Следующая атака активного канала отменяется.`,
      }),
      makeEvent({type: 'turn-advanced'}),
    ]);
    return true;
  }, [appendEvents, sessionHeroes, state]);

  const cancelFinalBossReactionWithRedButton = useCallback(() => {
    const combat = state.combat;
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== penisuelaFinalBoss.encounter.id
      || !boss
      || boss.hp <= 0
      || !state.inventory.includes('red-button-18-plus')
      || (state.itemCharges['red-button-18-plus'] ?? 0) < 1
    ) return false;
    const commandId = createId('red-button-final-boss');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({
        type: 'item-charge-changed',
        itemId: 'red-button-18-plus',
        change: {mode: 'delta', value: -1},
      }),
      makeEvent({type: 'flag-changed', flag: 'red-button-18-plus-used', value: true}),
      makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
      makeEvent({
        type: 'combat-log-added',
        text: 'Красная кнопка 18+ отменяет ещё не разрешённую реакцию Последнего дубля. Полученный ранее урон и границы фаз не меняются.',
      }),
      makeEvent({type: 'turn-advanced'}),
    ]);
    return true;
  }, [appendEvents, state.combat, state.inventory, state.itemCharges]);

  const useDanceTroupeFinalBossAssist = useCallback(() => {
    const combat = state.combat;
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== penisuelaFinalBoss.encounter.id
      || !boss
      || boss.hp <= 0
      || !state.flags['dance-troupe-allies']
      || state.flags['dance-troupe-final-assist-used']
    ) return false;
    const commandId = createId('dance-troupe-final-assist');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({type: 'flag-changed', flag: 'dance-troupe-final-assist-used', value: true}),
      makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
      makeEvent({
        type: 'combat-log-added',
        text: 'Спасённая труппа уводит прожекторы в синхронный танец и один раз отменяет атаку окружения.',
      }),
      makeEvent({type: 'turn-advanced'}),
    ]);
    return true;
  }, [appendEvents, state.combat, state.flags]);

  const resolveFinalBossEnemyTurn = useCallback((
    requestedTargetIds: string[] = [],
    rollInput?: FinalBossEnemyTurnRollInput,
  ) => {
    const combat = state.combat;
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== penisuelaFinalBoss.encounter.id
      || !boss
      || boss.hp <= 0
      || areAllHeroesDown(state.heroHp, sessionHeroes.map((hero) => hero.id))
    ) return false;

    const phase = getFinalBossPhase(penisuelaFinalBoss, boss.hp);
    const commandId = createId(`final-boss-enemy-phase-${phase.number}`);
    const makeEvent = eventFactory(commandId);
    const nextEvents: GalleryEvent[] = [];
    const livingHeroes = sessionHeroes.filter((hero) => (state.heroHp[hero.id] ?? 0) > 0);
    const suggestedDecision = getNpcDecision(boss.id)?.suggestion;
    const createFinalBossSelectionEvents = (targetIds: string[]) => {
      const targetNames = targetIds.map(
        (targetId) => sessionHeroes.find((hero) => hero.id === targetId)?.name ?? targetId,
      );
      const followsSuggestion = suggestedDecision?.actionId === phase.attack.id
        && suggestedDecision.targetIds.length === targetIds.length
        && suggestedDecision.targetIds.every((targetId, index) => targetId === targetIds[index]);
      return createNpcSelectionEvents(makeEvent, {
        actorId: boss.id,
        actorName: boss.name,
        actionId: phase.attack.id,
        actionName: phase.attack.name,
        targetIds,
        targetNames,
        explanation: followsSuggestion
          ? suggestedDecision.explanation
          : `Мастер подтвердил фазовое действие «${phase.attack.name}» и изменил предложенные цели.`,
      });
    };
    const bossConditionResolution = resolveNextFormalActionConditions(
      getEffectiveParticipantConditions(state, boss.id),
    );

    if (bossConditionResolution.blocked) {
      appendEvents([
        ...createConsumedConditionEvents(state, boss.id, 'assigned-role', makeEvent),
        ...createFinalBossNarrativeConditionLogEvents(state, boss.id, boss.name, makeEvent),
        makeEvent({
          type: 'combat-log-added',
          text: `${boss.name}: «назначенная роль» забирает фазовое действие; введённые броски не применяются.`,
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }

    if (combat.weaknessExposed) {
      nextEvents.push(
        ...createFinalBossSelectionEvents(suggestedDecision?.targetIds ?? []),
        makeEvent({
          type: 'combat-weakness-cleared',
          ac: getActiveManualParticipantStatValue(events, boss.id, 'ac')
            ?? getFinalBossPhaseAc(phase.number, state.flags),
          text: `Подсвеченный канал разорван. «${phase.attack.name}» полностью отменяется.`,
        }),
        makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
        makeEvent({type: 'turn-advanced'}),
      );
      appendEvents(nextEvents);
      return true;
    }

    if (phase.attack.savingThrow && !state.flags['final-boss-dragonfire-charged']) {
      nextEvents.push(
        ...createFinalBossSelectionEvents(suggestedDecision?.targetIds ?? livingHeroes.map((hero) => hero.id)),
        makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: true}),
        makeEvent({
          type: 'combat-log-added',
          text: 'Огненная линия заряжается целый раунд и заранее показывает траекторию. До следующего хода канал можно разорвать.',
        }),
        makeEvent({type: 'turn-advanced'}),
      );
      appendEvents(nextEvents);
      return true;
    }

    if (phase.attack.savingThrow) {
      if (rollInput?.kind !== 'saving-throws') return false;
      const damage = resolveFinalBossDamageRoll(
        phase.attack.damage,
        false,
        rollInput.resolution.rawDamage,
      );
      const saveIds = rollInput.resolution.saves.map((save) => save.heroId);
      if (
        !damage
        || saveIds.length !== livingHeroes.length
        || new Set(saveIds).size !== livingHeroes.length
        || livingHeroes.some((hero) => !saveIds.includes(hero.id))
      ) return false;
      const resolvedSaves = livingHeroes.map((hero) => {
        const input = rollInput.resolution.saves.find((save) => save.heroId === hero.id)!;
        const modifier = (hero.stats[phase.attack.savingThrow!.stat] ?? 0)
          + (state.participantTemporaryModifiers[hero.id] ?? 0);
        const resolution = resolveFinalBossSavingThrow(
          input.natural,
          modifier,
          phase.attack.savingThrow!.dc,
        );
        return resolution ? {hero, resolution} : null;
      });
      if (resolvedSaves.some((entry) => entry === null)) return false;
      nextEvents.push(...createFinalBossSelectionEvents(livingHeroes.map((hero) => hero.id)));
      nextEvents.push(
        ...createFinalBossNarrativeConditionLogEvents(state, boss.id, boss.name, makeEvent),
        makeEvent({
          type: 'combat-log-added',
          text: `${phase.attack.name}: общий бросок урона — кубики ${formatDamageCalculation(damage.rawDiceTotal, damage.modifier, damage.critical)} = ${damage.amount}.`,
        }),
      );
      if (bossConditionResolution.rollModifier !== 0) nextEvents.push(makeEvent({
        type: 'combat-log-added',
        text: `${boss.name}: «стыд» остаётся до следующей атаки или проверки самого модуля и не меняет спасброски героев.`,
      }));
      if ((state.participantTemporaryModifiers[boss.id] ?? 0) !== 0) nextEvents.push(makeEvent({
        type: 'combat-log-added',
        text: `${boss.name}: временный модификатор ${state.participantTemporaryModifiers[boss.id]} не меняет чужие спасброски и остаётся доступен для следующей атаки или проверки модуля.`,
      }));
      resolvedSaves.forEach((entry) => {
        if (!entry) return;
        const {hero, resolution} = entry;
        const appliedDamage = resolution.success ? Math.floor(damage.amount / 2) : damage.amount;
        const modifierText = resolution.modifier >= 0
          ? `+ ${resolution.modifier}`
          : `− ${Math.abs(resolution.modifier)}`;
        const resultText = `${hero.name}: Ловкость d20 ${resolution.natural} ${modifierText} = ${resolution.total} против DC ${resolution.dc}; ${resolution.success ? `успех, половина урона (${appliedDamage})` : `провал, полный урон (${appliedDamage})`}.`;
        const actionConditions = resolveNextFormalActionConditions(
          getEffectiveParticipantConditions(state, hero.id),
        );
        nextEvents.push(
          ...createFinalBossNarrativeConditionLogEvents(state, hero.id, hero.name, makeEvent),
          ...(actionConditions.blocked || actionConditions.rollModifier !== 0 ? [makeEvent({
            type: 'combat-log-added' as const,
            text: `${hero.name}: «назначенная роль»/«стыд» относятся к следующему действию или броску героя, поэтому этот защитный спасбросок их не расходует и не получает −2.`,
          })] : []),
          makeEvent({
            type: 'roll-entered',
            result: {
              checkId: `last-take-dragonfire-${hero.id}`,
              heroId: hero.id,
              stat: 'dexterity',
              rolls: [resolution.natural],
              modifier: resolution.modifier,
              total: resolution.total,
              dc: resolution.dc,
              success: resolution.success,
              automatic: false,
              text: resultText,
            },
          }),
          makeEvent({type: 'combat-log-added', text: resultText}),
          makeEvent({
            type: 'combat-damage-resolved',
            targetId: hero.id,
            amount: appliedDamage,
            text: `${phase.attack.name} наносит ${hero.name} ${appliedDamage} урона из явно зафиксированных ${damage.amount}.`,
          }),
        );
      });
      nextEvents.push(
        makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
        makeEvent({type: 'turn-advanced'}),
      );
      appendEvents(nextEvents);
      return true;
    }

    const effectiveRequestedTargetIds = requestedTargetIds.length
      ? requestedTargetIds
      : suggestedDecision?.targetIds ?? [];
    const requestedLivingTargets = effectiveRequestedTargetIds
      .filter((targetId, index, all) => (
        livingHeroes.some((hero) => hero.id === targetId)
        && (!phase.attack.distinctTargets || all.indexOf(targetId) === index)
      ));
    const fallbackTargets = livingHeroes
      .slice()
      .sort((left, right) => (
        (state.heroHp[right.id] ?? 0) - (state.heroHp[left.id] ?? 0)
        || left.id.localeCompare(right.id)
      ));
    const targets = [...requestedLivingTargets];
    fallbackTargets.forEach((hero) => {
      if (targets.length >= Math.min(phase.attack.targets, livingHeroes.length)) return;
      if (!phase.attack.distinctTargets || !targets.includes(hero.id)) targets.push(hero.id);
    });
    const strikes = targets.map((targetId, index) => ({
      targetId,
      attack: index > 0 && phase.attack.secondaryAttack
        ? phase.attack.secondaryAttack
        : phase.attack,
    }));
    if (
      rollInput?.kind !== 'attacks'
      || rollInput.strikes.length !== strikes.length
      || rollInput.strikes.some((input, index) => input.targetId !== strikes[index]?.targetId)
    ) return false;
    const attackConditionModifier = bossConditionResolution.rollModifier;
    const resolvedStrikes: Array<{
      attack: (typeof strikes)[number]['attack'];
      attackBonus: number;
      attackRoll: NonNullable<ReturnType<typeof resolveFinalBossAttackRoll>>;
      damage: ReturnType<typeof resolveFinalBossDamageRoll>;
      index: number;
      target: (typeof sessionHeroes)[number];
    }> = [];
    for (const [index, strike] of strikes.entries()) {
      const target = sessionHeroes.find((hero) => hero.id === strike.targetId);
      const provided = rollInput.strikes[index];
      const attackBonus = getFinalBossEffectiveAttackBonus(
        strike.attack.bonus,
        getFinalBossRuntimeAttackBonus(penisuelaFinalBoss, phase.number),
        boss.attack.bonus,
        (state.participantTemporaryModifiers[boss.id] ?? 0) + attackConditionModifier,
      );
      const attackRoll = target
        ? resolveFinalBossAttackRoll(provided.natural, attackBonus, target.ac)
        : null;
      const damage = attackRoll?.hit
        ? resolveFinalBossDamageRoll(
            strike.attack.damage,
            attackRoll.critical,
            provided.rawDamage ?? Number.NaN,
          )
        : null;
      if (!target || !attackRoll || (attackRoll.hit && !damage)) return false;
      resolvedStrikes.push({
        attack: strike.attack,
        attackBonus,
        attackRoll,
        damage,
        index,
        target,
      });
    }
    nextEvents.push(
      ...createFinalBossSelectionEvents(targets),
      ...(attackConditionModifier !== 0 ? [
        ...createConsumedConditionEvents(state, boss.id, 'shamed', makeEvent),
        makeEvent({
          type: 'combat-log-added' as const,
          text: `${boss.name}: «стыд» даёт −2 ко всем броскам одной фазовой мультиатаки и снимается этим же действием.`,
        }),
      ] : []),
      ...createFinalBossNarrativeConditionLogEvents(state, boss.id, boss.name, makeEvent),
    );
    resolvedStrikes.forEach(({attack, attackBonus, attackRoll, damage, index, target}) => {
      const pendingAttack = {
        actorId: boss.id,
        actorName: boss.name,
        targetId: target.id,
        targetName: target.name,
        attackName: attack.name,
        natural: attackRoll.natural,
        bonus: attackBonus,
        total: attackRoll.total,
        targetAc: target.ac,
        critical: attackRoll.critical,
        damageExpression: attack.damage,
      };
      nextEvents.push(makeEvent({
        type: 'combat-attack-resolved',
        attack: pendingAttack,
        hit: attackRoll.hit,
        text: attackRoll.hit
          ? `${boss.name}: ${attack.name} → ${target.name}. d20 ${attackRoll.natural} ${attackBonus >= 0 ? '+' : '−'} ${Math.abs(attackBonus)} = ${attackRoll.total} против AC ${target.ac}; попадание${attackRoll.critical ? ', натуральная 20 — критическое' : ''}.`
          : `${boss.name}: ${attack.name} → ${target.name}. d20 ${attackRoll.natural} ${attackBonus >= 0 ? '+' : '−'} ${Math.abs(attackBonus)} = ${attackRoll.total} против AC ${target.ac}; ${attackRoll.natural === 1 ? 'натуральная 1 — автоматический промах' : 'промах'}.`,
      }));
      if (attackRoll.hit && damage) {
        nextEvents.push(makeEvent({
          type: 'combat-damage-resolved',
          targetId: target.id,
          amount: damage.amount,
          text: `${attack.name}: кубики ${formatDamageCalculation(damage.rawDiceTotal, damage.modifier, damage.critical)} = ${damage.amount} урона по ${target.name}.`,
        }));
        if (phase.number === 2 && index === 0) nextEvents.push(makeEvent({
          type: 'combat-log-added',
          text: state.flags['stage-module-active'] === false
            ? 'Сценический модуль отключён: отталкивание не срабатывает.'
            : `${target.name} оттеснён движущейся декорацией на два метра.`,
        }));
      }
    });
    nextEvents.push(makeEvent({type: 'turn-advanced'}));
    appendEvents(nextEvents);
    return true;
  }, [
    appendEvents,
    events,
    getNpcDecision,
    sessionHeroes,
    state,
  ]);

  const resolveFinalBossDefeatFallback = useCallback(() => {
    const combat = state.combat;
    const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
    const physicalPlan = penisuelaFinalBoss.plans.find((plan) => plan.id === 'physical');
    if (
      !combat
      || combat.encounterId !== penisuelaFinalBoss.encounter.id
      || !boss
      || boss.hp <= 0
      || !physicalPlan
      || !areAllHeroesDown(state.heroHp, sessionHeroes.map((hero) => hero.id))
    ) return false;
    const commandId = createId('final-boss-defeat-fallback');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      ...sessionHeroes.map((hero) => makeEvent({
        type: 'healing-applied',
        targetId: hero.id,
        amount: 1,
        maxHp: hero.maxHp,
        text: `${hero.name} приходит в сознание у открытого аварийного рубильника с 1 HP.`,
      })),
      makeEvent({
        type: 'combat-damage-resolved',
        targetId: boss.id,
        amount: boss.hp,
        text: `Аварийный рубильник физически гасит оставшиеся ${boss.hp} HP модуля.`,
      }),
      makeEvent({type: 'combat-ended', text: penisuelaFinalBoss.defeatFallback.resolution}),
      makeEvent({type: 'flag-changed', flag: 'final-defeat-fallback', value: true}),
      makeEvent({type: 'flag-changed', flag: 'recording-damaged', value: true}),
      makeEvent({type: 'flag-changed', flag: 'footage-authorized', value: false}),
      makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
      ...getFinalBossPlanEndingEvents(physicalPlan, makeEvent),
    ]);
    return true;
  }, [appendEvents, sessionHeroes, state.combat, state.heroHp]);

  const commitManualAdjustment = useCallback((
    label: string,
    adjustment: GalleryManualAdjustment,
    semanticEvents: ManualSemanticEventInput[] = [],
  ) => {
    const normalizedLabel = label.trim().slice(0, 140);
    if (!normalizedLabel) return false;
    const commandId = createId('manual-adjustment');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      makeEvent({
        type: 'manual-adjustment',
        label: normalizedLabel,
        reason: `Ручная коррекция мастера: ${normalizedLabel}.`,
        adjustment,
      }),
      ...semanticEvents.map(makeEvent),
    ]);
    return true;
  }, [appendEvents]);

  const manualAdjustParticipant = useCallback((
    participantId: string,
    field: Extract<GalleryManualAdjustment, {kind: 'participant-stat'}>['field'],
    value: number,
  ) => {
    const hero = sessionHeroes.find((candidate) => candidate.id === participantId);
    const enemy = state.combat?.enemies[participantId];
    const participantName = hero?.name ?? enemy?.name;
    if (!participantName) return false;
    const valid = field === 'hp'
      ? isFiniteIntegerInRange(
          value,
          0,
          hero ? state.heroMaxHp[hero.id] ?? hero.maxHp : enemy?.maxHp ?? 0,
        )
      : field === 'maxHp'
        ? isFiniteIntegerInRange(value, 1, 9999)
        : field === 'ac'
          ? isFiniteIntegerInRange(value, 0, 99)
          : field === 'temporaryModifier'
            ? isFiniteIntegerInRange(value, -20, 20)
            : isFiniteIntegerInRange(value, -50, 99);
    if (!valid) return false;
    const fieldLabels = {
      hp: 'HP',
      maxHp: 'максимум HP',
      ac: 'AC',
      attackBonus: 'бонус атаки',
      temporaryModifier: 'временный модификатор',
    };
    return commitManualAdjustment(
      `${participantName}: ${fieldLabels[field]} → ${value}`,
      {kind: 'participant-stat', participantId, field, value},
    );
  }, [commitManualAdjustment, sessionHeroes, state.combat?.enemies, state.heroMaxHp]);

  const manualSetInventoryItem = useCallback((input: {
    itemId: string;
    acquired: boolean;
    ownerId: string | null;
    quantity: number;
    charges: number;
  }) => {
    if (
      !isSafeSessionId(input.itemId)
      || (input.ownerId !== null && !sessionHeroes.some((hero) => hero.id === input.ownerId))
      || !isFiniteIntegerInRange(input.quantity, 0, 99)
      || !isFiniteIntegerInRange(input.charges, 0, 99)
    ) return false;
    const owner = sessionHeroes.find((hero) => hero.id === input.ownerId);
    const label = input.acquired
      ? `Инвентарь: ${input.itemId}, ${input.quantity} шт., заряды ${input.charges}${owner ? `, владелец ${owner.name}` : ''}`
      : `Инвентарь: убрать ${input.itemId}`;
    return commitManualAdjustment(label, {kind: 'inventory-item', ...input});
  }, [commitManualAdjustment, sessionHeroes]);

  const useOlvaTimeout = useCallback(() => {
    const command = createOlvaRestCommand(state);
    if (!command) return false;
    const makeEvent = eventFactory(createId('olva-timeout'));
    appendEvents([makeEvent(command.charge), makeEvent(command.rest), makeEvent(command.remove), makeEvent(command.used)]);
    return true;
  }, [appendEvents, state]);

  const manualSetCondition = useCallback((
    participantId: string,
    conditionId: string,
    active: boolean,
  ) => {
    const participantName = sessionHeroes.find((hero) => hero.id === participantId)?.name
      ?? state.combat?.enemies[participantId]?.name;
    if (!participantName || !isSafeSessionId(conditionId)) return false;
    return commitManualAdjustment(
      `${participantName}: состояние ${conditionId} ${active ? 'добавлено' : 'снято'}`,
      {kind: 'condition', participantId, conditionId, active},
    );
  }, [commitManualAdjustment, sessionHeroes, state.combat?.enemies]);

  const manualSetFlag = useCallback((flag: string, value: boolean) => {
    if (!isSafeSessionId(flag)) return false;
    return commitManualAdjustment(
      `Флаг ${flag} → ${value ? 'да' : 'нет'}`,
      {kind: 'flag', flag, value},
    );
  }, [commitManualAdjustment]);

  const manualSetCounter = useCallback((counter: GalleryCounter, value: number) => {
    if (!galleryCounters.has(counter) || !isFiniteIntegerInRange(value, 0, 999)) return false;
    return commitManualAdjustment(
      `Счётчик ${counter} → ${value}`,
      {kind: 'counter', counter, value},
    );
  }, [commitManualAdjustment]);

  const manualSetRelationship = useCallback((relationshipId: string, value: number) => {
    if (!isSafeSessionId(relationshipId) || !isFiniteIntegerInRange(value, -999, 999)) return false;
    return commitManualAdjustment(
      `Отношение ${relationshipId} → ${value}`,
      {kind: 'relationship', relationshipId, value},
    );
  }, [commitManualAdjustment]);

  const manualSetLocation = useCallback((locationId: string, stateValue?: string | null) => {
    if (!isSafeSessionId(locationId)) return false;
    const normalizedState = stateValue === undefined ? undefined : stateValue?.trim().slice(0, 500) || null;
    return commitManualAdjustment(
      `Текущая локация → ${locationId}${normalizedState === undefined ? '' : ` · ${normalizedState ?? 'без состояния'}`}`,
      {kind: 'location', locationId, stateValue: normalizedState},
    );
  }, [commitManualAdjustment]);

  const manualSetLocationState = useCallback((
    locationId: string,
    value: string | null,
  ) => {
    const normalized = value?.trim().slice(0, 500) || null;
    if (!isSafeSessionId(locationId)) return false;
    return commitManualAdjustment(
      `Состояние локации ${locationId} → ${normalized ?? 'очищено'}`,
      {kind: 'location-state', locationId, value: normalized},
    );
  }, [commitManualAdjustment]);

  const safeLocationRest = useCallback((
    locationId = state.currentLocationId,
    providedRolls?: Record<string, number>,
  ) => {
    const rolls = providedRolls ?? Object.fromEntries(
      sessionHeroes.map((hero) => [hero.id, rollDie(8)]),
    );
    const command = createSafeLocationRestCommand(state, locationId, rolls);
    if (!command) return false;
    const commandId = createId('safe-location-rest');
    const makeEvent = eventFactory(commandId);
    appendEvents([makeEvent(command)]);
    return true;
  }, [appendEvents, sessionHeroes, state]);

  const manualSetInitiative = useCallback((order: string[], activeParticipantId: string, round: number) => {
    const combat = state.combat;
    if (!combat || !isFiniteIntegerInRange(round, 1, 999)) return false;
    const currentIds = [...combat.initiativeOrder].sort();
    const nextIds = [...new Set(order)].sort();
    if (
      order.length !== combat.initiativeOrder.length
      || currentIds.some((id, index) => id !== nextIds[index])
      || !order.includes(activeParticipantId)
    ) return false;
    const activeName = sessionHeroes.find((hero) => hero.id === activeParticipantId)?.name
      ?? combat.enemies[activeParticipantId]?.name
      ?? activeParticipantId;
    return commitManualAdjustment(
      `Инициатива: ход ${activeName}, раунд ${round}`,
      {kind: 'initiative', order, turnIndex: order.indexOf(activeParticipantId), round},
    );
  }, [commitManualAdjustment, sessionHeroes, state.combat]);

  const manualSetNpcOverride = useCallback((
    enemyId: string,
    actionId: string,
    targetId: string,
    confirmed = false,
  ) => {
    const decisionView = getNpcDecision(enemyId);
    const option = decisionView?.options.find((candidate) => candidate.actionId === actionId);
    const enemy = state.combat?.enemies[enemyId];
    const target = sessionHeroes.find((hero) => hero.id === targetId);
    if (
      !decisionView
      || !option
      || !target
      || !option.legalTargetIds.includes(targetId)
      || (state.heroHp[targetId] ?? 0) <= 0
    ) return false;
    const actorName = enemy?.name ?? decisionView.actor.name;
    const label = `${actorName}: ${option.actionName} → ${target.name}${confirmed ? ' (подтверждено)' : ' (override)'}`;
    const adjustment: Extract<GalleryManualAdjustment, {kind: 'npc-override'}> = {
      kind: 'npc-override',
      enemyId,
      actionId,
      targetId,
      targetIds: [targetId],
      confirmed,
      skipped: false,
      explanation: option.explanation,
    };
    return commitManualAdjustment(label, adjustment, [{
      type: 'npc-action-selected',
      enemyId,
      actionId,
      targetId,
      targetIds: [targetId],
      confirmed,
      skipped: false,
      explanation: option.explanation,
    }]);
  }, [commitManualAdjustment, getNpcDecision, sessionHeroes, state.combat?.enemies, state.heroHp]);

  const confirmDialoguePreset = useCallback((input: {
    preset: DialoguePresetDefinition;
    sceneId: string;
    sourceSceneId: string;
    text: string;
    conditionsOverridden: boolean;
  }) => {
    const {preset, sceneId} = input;
    const text = input.text.trim();
    if (
      !legacySceneIds.includes(sceneId)
      || !preset.sceneIds.includes(input.sourceSceneId)
      || !isSafeSessionId(input.sourceSceneId)
      || !isSafeSessionId(preset.id)
      || !isSafeSessionId(preset.characterId)
      || !text
      || text.length > 2000
      || preset.reveals.some((clueId) => !isSafeSessionId(clueId))
      || !preset.effects.every(isValidDialogueEffect)
      || (preset.effects.length > 0 && appliedDialoguePresetIds.has(preset.id))
    ) return false;

    const startBattleEffects = preset.effects.filter(
      (effect): effect is Extract<DialoguePresetEffect, {type: 'start-battle'}> => effect.type === 'start-battle',
    );
    if (startBattleEffects.length > 1) return false;
    const startBattleEffect = startBattleEffects[0];
    const startEncounter = startBattleEffect
      ? definition.encounters.find((encounter) => encounter.id === startBattleEffect.encounterId)
        ?? (startBattleEffect.encounterId === penisuelaFinalBoss.encounter.id
          ? penisuelaFinalBoss.encounter
          : undefined)
      : undefined;
    if (
      (startBattleEffect && !startEncounter)
      || (startBattleEffect && state.combat && state.combat.encounterId !== startBattleEffect.encounterId)
    ) return false;

    const commandId = createId('dialogue-preset');
    const makeEvent = eventFactory(commandId);
    const selection = {
      sceneId,
      presetId: preset.id,
      speaker: preset.characterId,
      text,
    };
    const nextEvents: GalleryEvent[] = [
      makeEvent({
        type: 'manual-adjustment',
        label: `Реплика: ${preset.characterId} · ${preset.label}`,
        reason: input.conditionsOverridden
          ? `Мастер подтвердил реплику ${preset.id} с ручным разрешением контекстных условий.`
          : `Мастер подтвердил реплику ${preset.id} по условиям текущей сцены.`,
        adjustment: {kind: 'dialogue-preset', ...selection},
      }),
      makeEvent({type: 'dialogue-preset-chosen', ...selection}),
      ...preset.reveals
        .filter((clueId) => !state.clues.includes(clueId))
        .map((clueId) => makeEvent({type: 'clue-revealed' as const, clueId})),
    ];

    preset.effects.forEach((effect) => {
      if (effect.type === 'set-flag' && state.flags[effect.flag] !== effect.value) {
        nextEvents.push(makeEvent({type: 'flag-changed', flag: effect.flag, value: effect.value}));
      }
      if (effect.type === 'consume-flag' && state.flags[effect.flag]) {
        nextEvents.push(makeEvent({type: 'flag-changed', flag: effect.flag, value: false}));
      }
      if (effect.type === 'grant-item' && !state.inventory.includes(effect.itemId)) {
        nextEvents.push(makeEvent({type: 'item-changed', itemId: effect.itemId, acquired: true}));
      }
      if (effect.type === 'remove-item' && state.inventory.includes(effect.itemId)) {
        nextEvents.push(makeEvent({type: 'item-changed', itemId: effect.itemId, acquired: false}));
      }
      if (
        effect.type === 'modify-relationship'
        && effect.value !== 0
      ) {
        nextEvents.push(makeEvent({
          type: 'relationship-changed',
          relationshipId: effect.target,
          change: {mode: 'delta', value: effect.value},
        }));
      }
      if (effect.type === 'consume-assist') {
        const flag = getDialogueAssistConsumedFlag(effect.assistId);
        if (!state.flags[flag]) nextEvents.push(makeEvent({type: 'flag-changed', flag, value: true}));
      }
      if (effect.type === 'consume-use' && !state.usedAbilities.includes(effect.useId)) {
        nextEvents.push(makeEvent({type: 'ability-used', abilityId: effect.useId}));
      }
    });

    if (startBattleEffect && startEncounter && !state.combat) {
      if (startBattleEffect.encounterId === penisuelaFinalBoss.encounter.id) {
        // The opening line arms the finale; FinalBossAdventure records all six initiative d20s before combat-started.
        nextEvents.push(
          makeEvent({type: 'flag-changed', flag: 'final-boss-started', value: true}),
          makeEvent({type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false}),
          makeEvent({type: 'ending-selected', endingId: null}),
        );
      } else {
        nextEvents.push(makeEvent({type: 'counter-changed', counter: 'preFinalCombats', delta: 1}));
        nextEvents.push(makeEvent(createStartCombatCommand(startEncounter, sessionHeroes)));
      }
    }

    appendEvents(nextEvents);
    return true;
  }, [
    appendEvents,
    appliedDialoguePresetIds,
    definition.encounters,
    legacySceneIds,
    sessionHeroes,
    state.clues,
    state.combat,
    state.flags,
    state.inventory,
    state.usedAbilities,
  ]);

  const manualSetActiveScene = useCallback((sceneId: string, previousSceneId?: string, previousSceneSearch?: string) => {
    if (previousSceneSearch && !/^\?view=(stas|dancers|device)$/.test(previousSceneSearch)) return false;
    if (state.combat || !legacySceneIds.includes(sceneId)
      || (previousSceneId !== undefined && !legacySceneIds.includes(previousSceneId))) return false;
    return commitManualAdjustment(`Видимая сцена → ${sceneId}`, {kind: 'scene', sceneId, previousSceneId, previousSceneSearch});
  }, [commitManualAdjustment, legacySceneIds, state.combat]);

  const executeRailCharge = useCallback((
    targetIds: string[],
    providedRoll: number | undefined,
    explanation: string,
  ) => {
    const combat = state.combat;
    const enemy = combat?.enemies['rail-prop-kraken'];
    const action = combat ? getNpcBehaviorAction(
      definition,
      combat.encounterId,
      'rail-prop-kraken',
      'rail-charge',
    ) : undefined;
    const resolution = action?.resolution;
    if (
      !combat
      || combat.encounterId !== 'rail-prop-kraken'
      || combat.pendingAttack
      || combat.initiativeOrder[combat.turnIndex] !== 'rail-prop-kraken'
      || !enemy
      || !action
      || resolution?.type !== 'telegraphed-saving-throw'
    ) return false;
    const targets = [...new Set(targetIds)].map(
      (targetId) => sessionHeroes.find((hero) => hero.id === targetId),
    );
    if (
      !targets.length
      || targets.some((target) => !target || (state.heroHp[target.id] ?? 0) <= 0)
      || targets.length >= sessionHeroes.filter((hero) => (state.heroHp[hero.id] ?? 0) > 0).length
    ) return false;

    const commandId = createId('rail-charge');
    const makeEvent = eventFactory(commandId);
    const confirmedSelection = createNpcSelectionEvents(makeEvent, {
      actorId: enemy.id,
      actorName: enemy.name,
      actionId: action.id,
      actionName: action.name,
      targetIds,
      targetNames: targets.map((target) => target!.name),
      explanation,
    });
    if (!state.flags[resolution.telegraphFlag]) {
      appendEvents([
        ...confirmedSelection,
        makeEvent({type: 'flag-changed', flag: resolution.telegraphFlag, value: true}),
        makeEvent({
          type: 'combat-log-added',
          text: `${enemy.name} начинает «${action.name}»: красная линия заранее отмечает ${targets.map((target) => target!.name).join(', ')}, а вне линии остаётся безопасный участок.`,
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }

    const nextEvents: GalleryEvent[] = [...confirmedSelection];
    targets.forEach((target) => {
      if (!target) return;
      const natural = providedRoll ?? rollDie(20);
      const modifier = target.stats[resolution.stat] ?? 0;
      const total = natural + modifier;
      const success = natural === 20 || (natural !== 1 && total >= resolution.dc);
      nextEvents.push(
        makeEvent({
          type: 'roll-entered',
          result: {
            checkId: `rail-charge-${target.id}`,
            heroId: target.id,
            stat: resolution.stat as HeroStat,
            rolls: [natural],
            modifier,
            total,
            dc: resolution.dc,
            success,
            automatic: false,
            text: success
              ? `${target.name} уходит с красной линии.`
              : `${target.name} не успевает уйти с красной линии и падает.`,
          },
        }),
        makeEvent({
          type: 'combat-log-added',
          text: `${target.name}: Ловкость ${natural} ${modifier >= 0 ? '+' : '−'} ${Math.abs(modifier)} = ${total} против DC ${resolution.dc}; ${success ? 'успех' : 'провал'}.`,
        }),
      );
      if (!success) {
        const damage = rollDamage(resolution.damage);
        nextEvents.push(
          makeEvent({
            type: 'combat-damage-resolved',
            targetId: target.id,
            amount: damage,
            text: `${action.name} наносит ${target.name} ${damage} урона.`,
          }),
          makeEvent({
            type: 'manual-adjustment',
            label: `${target.name}: состояние «${resolution.condition}»`,
            reason: `Следствие подтверждённого действия NPC «${action.name}».`,
            adjustment: {
              kind: 'condition',
              participantId: target.id,
              conditionId: resolution.condition,
              active: true,
            },
          }),
        );
      }
    });
    nextEvents.push(
      makeEvent({type: 'flag-changed', flag: resolution.telegraphFlag, value: false}),
      makeEvent({type: 'turn-advanced'}),
    );
    appendEvents(nextEvents);
    return true;
  }, [appendEvents, definition, sessionHeroes, state.combat, state.flags, state.heroHp]);

  const skipNpcAction = useCallback((actorId: string) => {
    const combat = state.combat;
    const actor = combat?.enemies[actorId];
    if (
      !combat
      || combat.pendingAttack
      || !actor
      || actor.hp <= 0
      || combat.initiativeOrder[combat.turnIndex] !== actorId
    ) return false;
    const explanation = 'Мастер явно подтвердил пропуск вместо доступного действия NPC.';
    const commandId = createId('npc-skip');
    const makeEvent = eventFactory(commandId);
    appendEvents([
      ...createNpcSelectionEvents(makeEvent, {
        actorId,
        actorName: actor.name,
        actionId: 'skip',
        actionName: 'Пропустить ход',
        targetIds: [],
        targetNames: [],
        explanation,
        skipped: true,
      }),
      makeEvent({type: 'combat-log-added', text: `${actor.name} пропускает ход по решению мастера.`}),
      makeEvent({type: 'turn-advanced'}),
    ]);
    return true;
  }, [appendEvents, state.combat]);

  const executeNpcDecision = useCallback((
    actorId: string,
    actionId: string,
    requestedTargetIds: string[],
    providedRoll?: number,
  ) => {
    const combat = state.combat;
    if (providedRoll !== undefined && (!Number.isInteger(providedRoll) || providedRoll < 1 || providedRoll > 20)) {
      return false;
    }
    const decisionView = getNpcDecision(actorId);
    const option = decisionView?.options.find((candidate) => candidate.actionId === actionId);
    if (!combat || !decisionView || !option) return false;
    const targetIds = [...new Set(requestedTargetIds)];
    if (
      targetIds.length !== option.targetIds.length
      || targetIds.some((targetId) => !option.legalTargetIds.includes(targetId))
    ) return false;
    const followsSuggestion = option.targetIds.every((targetId, index) => targetId === targetIds[index]);
    const explanation = followsSuggestion
      ? option.explanation
      : `Мастер оставил легальное действие «${option.actionName}», но выбрал другую допустимую цель.`;

    if (option.category === 'retreat') {
      const actor = combat.enemies[actorId];
      if (!actor || actor.hp <= 0 || combat.initiativeOrder[combat.turnIndex] !== actorId) return false;
      const commandId = createId('npc-retreat');
      const makeEvent = eventFactory(commandId);
      appendEvents([
        ...createNpcSelectionEvents(makeEvent, {
          actorId,
          actorName: actor.name,
          actionId: option.actionId,
          actionName: option.actionName,
          targetIds: [],
          targetNames: [],
          explanation,
        }),
        makeEvent({
          type: 'combat-damage-resolved',
          targetId: actorId,
          amount: actor.hp,
          text: `${actor.name} выходит из столкновения: ${option.explanation}`,
        }),
        makeEvent({type: 'turn-advanced'}),
      ]);
      return true;
    }
    if (actorId === 'olga-vasilenko' && actionId === 'olga-restore-boundary') {
      const targetId = targetIds[0];
      const condition = state.flags[`show18-shamed-${targetId}`]
        ? 'shamed'
        : state.flags[`show18-assigned-role-${targetId}`]
          ? 'assigned-role'
          : null;
      return condition ? clearShow18ConditionWithOlva(targetId, condition) : false;
    }
    if (actorId === penisuelaFinalBoss.encounter.id) {
      return resolveFinalBossEnemyTurn(targetIds);
    }
    if (actorId === 'rail-prop-kraken' && actionId === 'rail-charge') {
      return executeRailCharge(targetIds, providedRoll, explanation);
    }
    const skill = definition.combatActions.find((action) => action.id === actionId && action.characterId === actorId);
    if (skill) {
      const context = {...state, combat, definition, heroes: sessionHeroes};
      const selection = createSelectCombatActionCommand(context, actionId);
      if (!selection) return false;
      const makeEvent = eventFactory(createId('npc-skill-prepared'));
      appendEvents([
        ...(combat.selectedActionIds.includes(actionId) ? [] : selection).map(makeEvent),
        makeEvent({type: 'npc-action-selected', enemyId: actorId, actionId, targetId: targetIds[0], targetIds,
          confirmed: false, skipped: false, explanation}),
      ]);
      return true;
    }
    const enemy = combat.enemies[actorId];
    if (
      !enemy
      || combat.initiativeOrder[combat.turnIndex] !== actorId
      || enemy.attack.id !== actionId
      || targetIds.length !== 1
    ) return false;
    return enemyAttack(targetIds[0], providedRoll, false, {actionId, targetIds, explanation}) === true;
  }, [
    appendEvents,
    clearShow18ConditionWithOlva,
    enemyAttack,
    executeRailCharge,
    getNpcDecision,
    resolveFinalBossEnemyTurn,
    definition,
    sessionHeroes,
    state,
    state.combat,
    state.flags,
  ]);

  const executeNpcOverride = useCallback((enemyId: string, targetId: string, providedRoll?: number) => {
    const actionId = getNpcDecision(enemyId)?.suggestion.actionId;
    return actionId
      ? executeNpcDecision(enemyId, actionId, [targetId], providedRoll)
      : false;
  }, [executeNpcDecision, getNpcDecision]);

  const getParticipantConditions = useCallback((participantId: string) => (
    getEffectiveParticipantConditions(state, participantId)
  ), [state.flags, state.participantConditions]);

  const undoLastCommand = useCallback(() => {
    const lastCommandId = getLastUndoableCommandId(events);
    if (!lastCommandId) return;
    const commandId = createId('undo');
    const makeEvent = eventFactory(commandId);
    appendEvents([makeEvent({type: 'action-corrected', correctedCommandId: lastCommandId})]);
  }, [appendEvents, events]);

  const undoLastAction = useCallback((sceneScopeIdOverride?: string) => {
    const targetSceneScopeId = sceneScopeIdOverride ?? sceneScopeId;
    if (!targetSceneScopeId) return false;
    const lastCommandId = getLastUndoableCommandIdForScene(events, targetSceneScopeId);
    if (!lastCommandId) return false;
    const commandId = createId('undo');
    const makeEvent = eventFactory(commandId);
    appendEvents([makeEvent({type: 'action-corrected', correctedCommandId: lastCommandId})]);
    return true;
  }, [appendEvents, events, sceneScopeId]);

  const resetSession = useCallback(() => {
    clearGallerySessionEvents(definition.campaignId);
    clearCampaignSceneAndInventoryState(definition.campaignId, legacySceneIds);
    setEvents([createGallerySessionStartedEvent({
      definition: canonicalDefinition,
      heroes,
      existingInventory: [],
      eventId: createId('event'),
      commandId: createId('session-start'),
    })]);
  }, [canonicalDefinition, definition.campaignId, heroes, legacySceneIds]);

  return {
    state,
    sessionHeroes,
    npcDecisionActors,
    getNpcDecision,
    getParticipantConditions,
    managedInspectableIds,
    canUndo,
    canUndoOlvaRest,
    canUndoLastAction,
    canUndoLastActionInScope,
    inventoryArtwork: getCampaignItemSkin(definition, state.flags, 'seven-job-bag')?.artwork,
    commitStoryOutcome,
    advanceBossSequence,
    commitStoryAction,
    resolveStoryActionCheck,
    startStoryCombat,
    completeStoryCombat,
    completeCombatDefeatFallback,
    resolveStoryCombatDefeatFallback,
    resolveCombatDefeatFallback,
    changeView,
    revealPussyLore,
    acceptPussyTask,
    resolveSceneCheck,
    collectScepter,
    selectDanceTrack,
    startDanceGuardCombat,
    inspectDressingRoomObject,
    completeDressingRehearsal,
    assistStageModule,
    startProkhorConversation,
    inspectProkhorBill,
    inspectProkhorTerminal,
    launchProkhorPaymentAudit,
    confirmProkhorPaymentByPhone,
    completeAlexisProkhorTask,
    returnScepter,
    grantPussyReward,
    startCombat,
    startFinalBoss,
    clearCombat,
    heroAttack,
    summonedAllyAttack,
    resolveCombatSavingThrow,
    exposeCombatWeakness,
    selectCombatAction,
    useCombatAction,
    equipCombatItem,
    enemyAttack,
    applyCombatDamage,
    cancelPendingCombatAttackWithRedButton,
    clearShow18ConditionWithOlva,
    clearShow18ConditionWithRedButton,
    resolveFinalBossChannel,
    resolveFinalBossPlan,
    acceptFinalBossHeroicIdea,
    cancelFinalBossReactionWithRedButton,
    useDanceTroupeFinalBossAssist,
    resolveFinalBossEnemyTurn,
    resolveFinalBossDefeatFallback,
    manualAdjustParticipant,
    manualSetInventoryItem,
    useOlvaTimeout,
    manualSetCondition,
    manualSetFlag,
    manualSetCounter,
    manualSetRelationship,
    manualSetLocation,
    manualSetLocationState,
    safeLocationRest,
    manualSetInitiative,
    manualSetNpcOverride,
    confirmDialoguePreset,
    manualSetActiveScene,
    executeNpcDecision,
    skipNpcAction,
    executeNpcOverride,
    undoLastCommand,
    undoLastAction,
    resetSession,
    appliedDialoguePresetIds,
  };
}

export type GallerySessionController = ReturnType<typeof useGallerySession>;
export type {GallerySessionSnapshot};
