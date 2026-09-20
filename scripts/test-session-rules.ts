import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GalleryGameplayDefinition, GalleryHeroSource} from '../src/entities/campaign-session/model/galleryGameplay.ts';
import {
  createSafeLocationRestCommand,
  getLastUndoableCommandId,
  getLastUndoableCommandIdForScene,
  recoverGalleryResourceScopes,
  replayGalleryEvents,
  type GalleryEvent,
} from '../src/entities/campaign-session/model/gallerySession.ts';
import {
  createGallerySessionStartedEvent,
  createStoredGallerySessionEnvelope,
  GALLERY_SESSION_VERSION,
  parseGalleryEventLog,
  parseStoredGallerySessionEnvelope,
} from '../src/entities/campaign-session/model/gallerySessionJournal.ts';
import {resolveNextFormalActionConditions} from '../src/entities/campaign-session/model/conditionRules.ts';
import {
  canStartDanceGuardCombat,
  resolveDanceTrackSelection,
} from '../src/entities/campaign-session/model/dancePuzzleRules.ts';
import {
  createCombatActionUsageEvent,
  createHeroAttackCommand,
  getCombatActionResourceKey,
  isCombatActionSourceAvailable,
} from '../src/features/run-combat/model/combatCommands.ts';

const definition = JSON.parse(readFileSync(
  new URL('../content/campaigns/penisuela-gallery-gameplay.json', import.meta.url),
  'utf8',
)) as GalleryGameplayDefinition;
const allHeroes = JSON.parse(readFileSync(
  new URL('../content/characters.json', import.meta.url),
  'utf8',
)) as GalleryHeroSource[];
const partyIds = new Set(['bubsilda', 'linda', 'lambert', 'golovach-lena', 'thorin-pukoshchit']);
const heroes = allHeroes.filter((hero) => partyIds.has(hero.id));
const expectation = {
  campaignId: definition.campaignId,
  definitionId: definition.id,
  definitionVersion: definition.version,
};

let eventSequence = 0;
function event<T extends Omit<GalleryEvent, 'id' | 'commandId'>>(
  commandId: string,
  input: T,
): GalleryEvent {
  eventSequence += 1;
  return {...input, id: `event-${eventSequence}`, commandId} as GalleryEvent;
}

function startEvent(sourceHeroes = heroes) {
  return createGallerySessionStartedEvent({
    definition,
    heroes: sourceHeroes,
    eventId: 'event-start',
    commandId: 'session-start',
    startedAt: '2026-08-24T12:00:00.000Z',
  });
}

function replay(events: GalleryEvent[]) {
  return replayGalleryEvents(events, definition);
}

// Closed-bar dance console: preview is handled by the UI, confirmation resolves here.
const dancePuzzle = definition.dancePuzzle;
const correctDanceTrack = dancePuzzle.tracks.find((track) => track.correct);
const wrongDanceTracks = dancePuzzle.tracks.filter((track) => !track.correct);
assert.ok(correctDanceTrack, 'dance puzzle must have one correct track');
assert.equal(dancePuzzle.tracks.filter((track) => track.correct).length, 1,
  'dance puzzle must have exactly one correct track');
assert.ok(wrongDanceTracks.length >= 2,
  'dance puzzle must offer distinct wrong tracks for repeated attempts');
assert.equal(
  resolveDanceTrackSelection(dancePuzzle, {}, correctDanceTrack.id).kind,
  'correct',
  'correct track still resolves as a success',
);
const firstTrySuccess = resolveDanceTrackSelection(dancePuzzle, {}, correctDanceTrack.id);
assert.ok(firstTrySuccess.kind === 'correct' && firstTrySuccess.summonGuards,
  'correct first attempt must summon guards');
for (const wrongTrack of wrongDanceTracks) {
  const wrongSelection = resolveDanceTrackSelection(dancePuzzle, {}, wrongTrack.id);
  assert.ok(wrongSelection.kind === 'wrong' && wrongSelection.summonGuards,
    `${wrongTrack.id}: each wrong track must summon its own wave`);
  assert.equal(resolveDanceTrackSelection(dancePuzzle,
    {[`dance-track-${wrongTrack.id}-rejected`]: true}, wrongTrack.id).kind, 'blocked',
    `${wrongTrack.id}: a rejected track cannot summon another wave`);
  const recoveredSuccess = resolveDanceTrackSelection(dancePuzzle,
    {[`dance-track-${wrongTrack.id}-rejected`]: true}, correctDanceTrack.id);
  assert.ok(recoveredSuccess.kind === 'correct' && !recoveredSuccess.summonGuards,
    'correct answer after any mistake must not summon more guards');
}
assert.equal(
  resolveDanceTrackSelection(dancePuzzle, {}, wrongDanceTracks[0].id).kind,
  'wrong',
  'wrong track must schedule the guard penalty',
);
assert.equal(
  resolveDanceTrackSelection(
    dancePuzzle,
    {[`dance-track-${wrongDanceTracks[0].id}-rejected`]: true},
    wrongDanceTracks[0].id,
  ).kind,
  'blocked',
  'a rejected track cannot summon the same wave twice',
);
assert.equal(
  resolveDanceTrackSelection(
    dancePuzzle,
    {[`dance-track-${wrongDanceTracks[0].id}-rejected`]: true},
    wrongDanceTracks[1].id,
  ).kind,
  'wrong',
  'the second wrong track remains available after the first battle',
);
assert.equal(canStartDanceGuardCombat({'dance-guard-wave-pending': true}, false), true);
assert.equal(canStartDanceGuardCombat({'dance-guard-wave-pending': true}, true), false);
assert.equal(canStartDanceGuardCombat({
  'dance-guard-wave-pending': true,
  'dance-troupe-freed': true,
  'dance-correct-track-selected': true,
}, false), true, 'first-try success must permit its pending guard battle');
assert.equal(canStartDanceGuardCombat({
  'dance-guard-wave-pending': true,
  'dance-troupe-freed': true,
}, false), false);

const beatGuardEncounter = definition.encounters.find(
  (encounter) => encounter.id === dancePuzzle.wrongTrackPenalty.encounterId,
);
assert.ok(beatGuardEncounter, 'wrong-track penalty must reference an encounter');
assert.equal(beatGuardEncounter.units.length, 4, 'each wrong track must summon exactly four guards');
assert.equal(
  new Set(beatGuardEncounter.units.map((unit) => unit.id)).size,
  4,
  'all four summoned guards must have unique combat ids',
);
assert.ok(
  beatGuardEncounter.units.every((unit) => unit.token.endsWith('/club-beat-guard.png')),
  'every summoned guard must use the approved holographic avatar',
);

const wrongTrackCommandId = 'dance-track-wrong';
const guardWaveCommandId = 'dance-guard-wave';
const wrongTrackEvents: GalleryEvent[] = [
  startEvent(),
  event(wrongTrackCommandId, {
    type: 'flag-changed',
    flag: `dance-track-${wrongDanceTracks[0].id}-rejected`,
    value: true,
  }),
  event(wrongTrackCommandId, {
    type: 'flag-changed',
    flag: 'dance-guard-wave-pending',
    value: true,
  }),
  event(guardWaveCommandId, {
    type: 'flag-changed',
    flag: 'dance-guard-wave-pending',
    value: false,
  }),
  event(guardWaveCommandId, {
    type: 'combat-started',
    encounterId: beatGuardEncounter.id,
    initiativeOrder: [
      ...heroes.map((hero) => hero.id),
      ...beatGuardEncounter.units.map((unit) => unit.id),
    ],
  }),
  event('undo-guard-wave', {
    type: 'action-corrected',
    correctedCommandId: guardWaveCommandId,
  }),
];
const pendingModalState = replay(wrongTrackEvents);
assert.equal(pendingModalState.combat, null, 'undoing combat start must restore the pre-combat modal');
assert.equal(pendingModalState.flags['dance-guard-wave-pending'], true);
assert.equal(
  getLastUndoableCommandId(wrongTrackEvents),
  wrongTrackCommandId,
  'undo must continue past the restored modal to the wrong-track choice',
);
const fullyRewoundDanceChoice = replay([
  ...wrongTrackEvents,
  event('undo-wrong-track', {
    type: 'action-corrected',
    correctedCommandId: wrongTrackCommandId,
  }),
]);
assert.equal(fullyRewoundDanceChoice.flags['dance-guard-wave-pending'], undefined);
assert.equal(
  fullyRewoundDanceChoice.flags[`dance-track-${wrongDanceTracks[0].id}-rejected`],
  undefined,
  'second undo must remove the rejected-track state',
);

const campaignSceneSource = readFileSync(new URL(
  '../src/widgets/campaign-scene/ui/CampaignScene/CampaignScene.tsx',
  import.meta.url,
), 'utf8');
assert.match(
  campaignSceneSource,
  /onRestartScene=\{restartBlock \?\? restartCurrentScene\}/,
  'campaign restart must not create a duplicate scene-restart button',
);
assert.doesNotMatch(
  campaignSceneSource,
  /\bonStart=|\bonMasterRestart\b|\bmasterStartLabel\b/,
  'the duplicate restart condition must not return',
);

// Frozen snapshot and compatible reload.
const mutableHeroes = structuredClone(heroes);
const frozenStart = startEvent(mutableHeroes);
const originalName = frozenStart.seed.heroSources[0].name;
mutableHeroes[0].name = 'Изменённый контент после старта';
mutableHeroes[0].items[0].name = 'Изменённый предмет';
assert.equal(frozenStart.seed.heroSources[0].name, originalName, 'session-started must deep-clone hero sources');
assert.notEqual(
  frozenStart.seed.heroSources[0].items[0].name,
  mutableHeroes[0].items[0].name,
  'session-started must deep-clone nested item sources',
);
const serializedLog = JSON.parse(JSON.stringify([frozenStart]));
const parsedReload = parseGalleryEventLog(serializedLog, expectation);
assert.equal(parsedReload.ok, true, 'serialized compatible journal must parse');
const reloaded = replay((parsedReload as {ok: true; events: GalleryEvent[]}).events);
assert.equal(reloaded.heroSources[0].name, originalName, 'reload must use frozen hero snapshot');
assert.equal(reloaded.version, GALLERY_SESSION_VERSION);
const canonicalPartyItemCount = new Set(heroes.flatMap((hero) => hero.items.map((item) => item.id))).size;
assert.equal(Object.keys(reloaded.inventoryState).length, canonicalPartyItemCount, 'all owned hero items enter frozen inventory');
heroes.forEach((hero) => hero.items.forEach((item) => {
  assert.equal(reloaded.inventoryState[item.id]?.ownerId, hero.id, `${item.id} must retain canonical owner`);
}));
const migratedStart = createGallerySessionStartedEvent({
  definition,
  heroes,
  existingInventory: ['egorik-recording', 'recording-for-egorik'],
  eventId: 'event-migrated-start',
  commandId: 'session-migrated-start',
  startedAt: '2026-08-24T12:00:00.000Z',
});
assert.ok(migratedStart.seed.initialInventoryState['recording-for-egorik']);
assert.equal(migratedStart.seed.initialInventoryState['egorik-recording'], undefined, 'legacy visual id migrates and deduplicates at frozen session start');
const legacyPersistedStart = structuredClone(frozenStart);
legacyPersistedStart.seed.initialInventoryState['egorik-recording'] = {
  ownerId: null,
  quantity: 1,
  charges: 0,
  maxCharges: null,
  chargeScope: null,
};
const legacyPersistedSnapshot = replay([legacyPersistedStart]);
assert.ok(legacyPersistedSnapshot.inventoryState['recording-for-egorik'], 'replay migrates the legacy visual id in an already persisted v23 seed');
assert.equal(legacyPersistedSnapshot.inventoryState['egorik-recording'], undefined);
assert.ok(legacyPersistedStart.seed.initialInventoryState['egorik-recording'], 'replay migration must not mutate the persisted event log');
assert.equal(legacyPersistedStart.seed.initialInventoryState['recording-for-egorik'], undefined);

const incompatibleDefinition = parseGalleryEventLog(serializedLog, {...expectation, definitionVersion: definition.version + 1});
assert.equal(incompatibleDefinition.ok, false, 'definition version mismatch must invalidate journal');
assert.equal(parseStoredGallerySessionEnvelope({
  version: GALLERY_SESSION_VERSION,
  campaignId: definition.campaignId,
  updatedAt: '2026-08-24T12:05:00.000Z',
  events: serializedLog,
}, expectation).ok, true, 'storage envelope with updatedAt must parse');
assert.ok(
  createStoredGallerySessionEnvelope([frozenStart], expectation, '2026-08-24T12:05:00.000Z'),
  'pure serializer must validate and create a persisted envelope',
);

// Strict invalid/duplicate/idempotency rules.
const baseStart = startEvent();
const flagA = event('command-a', {type: 'flag-changed', flag: 'fixture-a', value: true});
const flagB = event('command-b', {type: 'flag-changed', flag: 'fixture-b', value: true});
assert.equal(parseGalleryEventLog([flagA], expectation).ok, false, 'session-started must be first');
assert.equal(
  parseGalleryEventLog([baseStart, flagA, {...flagB, id: flagA.id}], expectation).ok,
  false,
  'duplicate event ids must invalidate journal',
);
const repeatedCommandGroup = [
  baseStart,
  flagA,
  flagB,
  event('command-a', {type: 'counter-changed', counter: 'timePressure', delta: 1}),
];
assert.equal(
  parseGalleryEventLog(repeatedCommandGroup, expectation).ok,
  false,
  'a repeated non-contiguous command group must be rejected even with new event ids',
);
const validLog = [baseStart, flagA, flagB];
assert.deepEqual(replay(validLog), replay(validLog), 'replay of the same valid log must be idempotent');

// Scene-scoped undo must never fall through to an older command from another scene.
const searchItemCommand = event('search-item', {
  type: 'item-changed',
  itemId: 'anonymous-bracelets',
  acquired: true,
  sceneScopeId: 'hotel-overload-search',
});
const galleryCommand = event('gallery-action', {
  type: 'flag-changed',
  flag: 'gallery-fixture',
  value: true,
  sceneScopeId: 'hotel-gallery',
});
const scopedLog = [baseStart, searchItemCommand, galleryCommand];
assert.equal(getLastUndoableCommandId(scopedLog), 'gallery-action');
assert.equal(
  getLastUndoableCommandIdForScene(scopedLog, 'hotel-overload-search'),
  'search-item',
  'scene undo must find the latest command belonging to that scene',
);
assert.equal(
  getLastUndoableCommandIdForScene(scopedLog, 'closed-bar-overview'),
  undefined,
  'a scene with no commands must not expose an older foreign command',
);
const correctedSearchLog = [
  ...scopedLog,
  event('undo-search-item', {
    type: 'action-corrected',
    correctedCommandId: 'search-item',
    sceneScopeId: 'hotel-overload-search',
  }),
];
assert.equal(
  getLastUndoableCommandIdForScene(correctedSearchLog, 'hotel-overload-search'),
  undefined,
  'a corrected scene command must not fall through to another scene',
);
assert.equal(
  getLastUndoableCommandIdForScene(validLog, 'hotel-gallery'),
  undefined,
  'legacy unscoped commands remain globally undoable but are never guessed into a scene',
);
assert.equal(parseGalleryEventLog(scopedLog, expectation).ok, true, 'valid scene scope metadata must parse');
assert.equal(parseGalleryEventLog([
  baseStart,
  {...searchItemCommand, sceneScopeId: 'Hotel Gallery'},
], expectation).ok, false, 'unsafe scene scope metadata must be rejected');
assert.equal(parseGalleryEventLog([
  baseStart,
  searchItemCommand,
  event('search-item', {
    type: 'flag-changed',
    flag: 'search-fixture',
    value: true,
    sceneScopeId: 'hotel-gallery',
  }),
], expectation).ok, false, 'all events in one command must share the same scene scope');
assert.equal(parseGalleryEventLog([
  baseStart,
  event('invalid-range', {type: 'combat-damage-resolved', targetId: 'bubsilda', amount: -1, text: 'bad'}),
], expectation).ok, false, 'negative damage must fail runtime validation');

// Canonical source ids/scopes and one shared resource across encounter variants.
const expectedSources: Record<string, {sourceId: string; scope: string; max: number}> = {
  'bubsilda-documentary-guards': {sourceId: 'documentary', scope: 'battle', max: 1},
  'bubsilda-royal-will': {sourceId: 'royal-will', scope: 'battle', max: 1},
  'bubsilda-ice-guard': {sourceId: 'ice-guard', scope: 'campaign', max: 1},
  'bubsilda-grandaxin': {sourceId: 'grandaxin', scope: 'battle', max: 1},
  'bubsilda-emergency-landing': {sourceId: 'emergency-landing', scope: 'battle', max: 1},
  'bubsilda-yellow-snowball-guards': {sourceId: 'yellow-snowball', scope: 'campaign', max: 1},
  'linda-magic-whisper-guards': {sourceId: 'magic-whisper', scope: 'location', max: 1},
  'linda-healing-pollen': {sourceId: 'healing-pollen', scope: 'campaign', max: 3},
  'lambert-hacker-pulse-guards': {sourceId: 'hacker-pulse', scope: 'location', max: 1},
  'lambert-hud-helmet-guards': {sourceId: 'hud-helmet', scope: 'battle', max: 1},
  'lena-video-surveillance-guards': {sourceId: 'video-surveillance', scope: 'location', max: 1},
  'lena-sleep-scroll': {sourceId: 'sleep-scroll', scope: 'location', max: 1},
  'thorin-needle-guards': {sourceId: 'needle-in-haystack', scope: 'campaign', max: 3},
  'thorin-ration-pouch': {sourceId: 'ration-and-potion-pouch', scope: 'battle', max: 1},
};
Object.entries(expectedSources).forEach(([actionId, expected]) => {
  const action = definition.combatActions.find((candidate) => candidate.id === actionId);
  assert.ok(action, `${actionId} must exist`);
  assert.deepEqual({sourceId: action.sourceId, ...action.uses}, expected, `${actionId} must use canonical resource`);
});
definition.combatActions.forEach((action) => {
  const hero = heroes.find((candidate) => candidate.id === action.characterId);
  if (action.effects.some((effect) => effect.type === 'guest-skill')) {
    assert.equal(action.source, 'ability');
    assert.deepEqual(action.uses, {scope: 'battle', max: 1});
    assert.ok(action.encounterIds.length > 0);
    for (const encounterId of action.encounterIds) {
      const encounter = definition.encounters.find((candidate) => candidate.id === encounterId);
      assert.ok(encounter?.units?.some((enemy) => enemy.releaseAlly?.id === action.characterId), `${action.id} must reference a rescued ally in ${encounterId}`);
    }
    return;
  }
  if (!hero) {
    assert.equal(action.source, 'ability');
    assert.deepEqual(action.uses, {scope: 'battle', max: 1});
    assert.ok(action.encounterIds.length > 0);
    for (const encounterId of action.encounterIds) {
      const encounter = definition.encounters.find((candidate) => candidate.id === encounterId);
      assert.ok(encounter?.units?.some((enemy) => enemy.id === action.characterId), `${action.id} must reference an enemy in ${encounterId}`);
    }
    return;
  }
  const sources = action.source === 'ability' ? hero.abilities : hero.items;
  assert.ok(sources.some((source) => source.id === action.sourceId), `${action.id} sourceId must exist on canonical hero`);
});
const documentary = definition.combatActions.find((action) => action.id === 'bubsilda-documentary-guards')!;
assert.ok(documentary.encounterIds.includes('dressing-room-mirror-doubles'));
[
  ['linda-magic-whisper-guards', 'linda-break-mirror-angle'],
  ['lambert-hacker-pulse-guards', 'lambert-break-mirror-angle'],
  ['lena-video-surveillance-guards', 'lena-break-mirror-angle'],
  ['thorin-needle-guards', 'thorin-break-mirror-angle'],
].forEach(([canonicalActionId, mirrorActionId]) => {
  const canonicalAction = definition.combatActions.find((action) => action.id === canonicalActionId)!;
  const mirrorAction = definition.combatActions.find((action) => action.id === mirrorActionId)!;
  assert.equal(
    getCombatActionResourceKey(canonicalAction),
    getCombatActionResourceKey(mirrorAction),
    `${mirrorActionId} must share the canonical source resource`,
  );
});
const sharedResourceState = {
  inventoryState: reloaded.inventoryState,
  resourceUses: {[getCombatActionResourceKey(documentary)]: 1},
};
assert.equal(isCombatActionSourceAvailable(documentary, sharedResourceState), false, 'documentary cannot bypass its shared source use');

// Item ownership, quantity, charges, remove/reacquire and scoped recharge.
const yellowSnowball = definition.combatActions.find((action) => action.id === 'bubsilda-yellow-snowball-guards')!;
assert.equal(isCombatActionSourceAvailable(yellowSnowball, {
  inventoryState: reloaded.inventoryState,
  resourceUses: {},
}), true, 'owned charged item must initially be available');
const wrongOwnerState = structuredClone(reloaded);
wrongOwnerState.inventoryState['yellow-snowball'].ownerId = 'linda';
assert.equal(isCombatActionSourceAvailable(yellowSnowball, wrongOwnerState), false, 'wrong item owner must block action');
const yellowUsed = event('yellow-use', createCombatActionUsageEvent(yellowSnowball));
const yellowCharge = event('yellow-use', {
  type: 'item-charge-changed',
  itemId: yellowSnowball.sourceId,
  change: {mode: 'delta', value: -1},
});
const afterYellow = replay([baseStart, yellowUsed, yellowCharge]);
assert.equal(afterYellow.inventoryState['yellow-snowball'].charges, 0);
assert.equal(isCombatActionSourceAvailable(yellowSnowball, afterYellow), false, 'zero charge must block action');

const removed = event('remove-yellow', {type: 'item-changed', itemId: 'yellow-snowball', acquired: false});
const reacquired = event('reacquire-yellow', {type: 'item-changed', itemId: 'yellow-snowball', acquired: true});
const afterRemove = replay([baseStart, removed]);
assert.equal(afterRemove.itemCharges['yellow-snowball'], undefined, 'remove must clear stale charge mirror');
assert.equal(isCombatActionSourceAvailable(yellowSnowball, afterRemove), false, 'removed item must block action');
const afterReacquire = replay([baseStart, removed, reacquired]);
assert.equal(afterReacquire.inventoryState['yellow-snowball'].charges, 1, 'reacquire restores frozen canonical charges, not stale value');
assert.equal(afterReacquire.inventoryState['yellow-snowball'].ownerId, 'bubsilda');

const quantityZero = event('quantity-zero', {
  type: 'manual-adjustment',
  label: 'Жёлтый снежок: количество ноль',
  reason: 'Ручная коррекция мастера.',
  adjustment: {kind: 'inventory-item', itemId: 'yellow-snowball', acquired: true, ownerId: 'bubsilda', quantity: 0, charges: 1},
});
assert.equal(isCombatActionSourceAvailable(yellowSnowball, replay([baseStart, quantityZero])), false, 'quantity zero must block item action');

const sleepScrollState = structuredClone(reloaded);
sleepScrollState.inventoryState['sleep-scroll'].charges = 0;
sleepScrollState.itemCharges['sleep-scroll'] = 0;
const locationRecovered = recoverGalleryResourceScopes(sleepScrollState, ['location']);
assert.equal(locationRecovered.inventoryState['sleep-scroll'].charges, 1);
assert.equal(locationRecovered.itemCharges['sleep-scroll'], 1, 'location recharge mirrors both charge representations');
const battleChargeState = structuredClone(reloaded);
battleChargeState.inventoryState['fixture-battle-item'] = {
  ownerId: 'bubsilda',
  quantity: 1,
  charges: 0,
  maxCharges: 1,
  chargeScope: 'battle',
};
battleChargeState.itemCharges['fixture-battle-item'] = 0;
const battleRecovered = recoverGalleryResourceScopes(battleChargeState, ['battle']);
assert.equal(battleRecovered.inventoryState['fixture-battle-item'].charges, 1);
assert.equal(battleRecovered.itemCharges['fixture-battle-item'], 1, 'battle recharge mirrors both charge representations');
const campaignNotRecovered = recoverGalleryResourceScopes(afterYellow, ['location', 'battle']);
assert.equal(campaignNotRecovered.inventoryState['yellow-snowball'].charges, 0, 'campaign charges never recover from lower scopes');

// All resource scopes and production turn/round recovery.
const scopedState = {
  ...reloaded,
  resourceUses: {
    'fixture-turn': 1,
    'fixture-round': 1,
    'fixture-battle': 1,
    'fixture-location': 1,
    'fixture-campaign': 1,
  },
  resourceScopes: {
    'fixture-turn': 'turn',
    'fixture-round': 'round',
    'fixture-battle': 'battle',
    'fixture-location': 'location',
    'fixture-campaign': 'campaign',
  } as const,
};
const recoveredTurn = recoverGalleryResourceScopes(scopedState, ['turn']);
assert.equal(recoveredTurn.resourceUses['fixture-turn'], undefined);
assert.equal(recoveredTurn.resourceUses['fixture-round'], 1);
const recoveredRound = recoverGalleryResourceScopes(scopedState, ['round']);
assert.equal(recoveredRound.resourceUses['fixture-round'], undefined);
const recoveredBattle = recoverGalleryResourceScopes(scopedState, ['battle']);
assert.equal(recoveredBattle.resourceUses['fixture-battle'], undefined);
const recoveredLocation = recoverGalleryResourceScopes(scopedState, ['location']);
assert.equal(recoveredLocation.resourceUses['fixture-location'], undefined);
assert.equal(recoveredLocation.resourceUses['fixture-campaign'], 1);

const encounter = definition.encounters.find((candidate) => candidate.id === 'dressing-room-mirror-doubles')!;
const encounterActorId = encounter.units?.[0]?.id ?? encounter.id;
const combatStart = event('combat-start', {
  type: 'combat-started',
  encounterId: encounter.id,
  initiativeOrder: ['bubsilda', encounterActorId],
});
const turnUse = event('turn-use', {
  type: 'combat-action-used',
  actionId: 'fixture-turn-action',
  sourceId: 'fixture-turn-source',
  resourceKey: 'fixture-turn-resource',
  scope: 'turn',
  max: 1,
});
const roundUse = event('turn-use', {
  type: 'combat-action-used',
  actionId: 'fixture-round-action',
  sourceId: 'fixture-round-source',
  resourceKey: 'fixture-round-resource',
  scope: 'round',
  max: 1,
});
const firstAdvance = event('advance-one', {type: 'turn-advanced'});
const secondAdvance = event('advance-two', {type: 'turn-advanced'});
const afterFirstAdvance = replay([baseStart, combatStart, turnUse, roundUse, firstAdvance]);
assert.equal(afterFirstAdvance.resourceUses['fixture-turn-resource'], undefined, 'turn resource clears on advance');
assert.equal(afterFirstAdvance.resourceUses['fixture-round-resource'], 1, 'round resource remains inside round');
const afterSecondAdvance = replay([baseStart, combatStart, turnUse, roundUse, firstAdvance, secondAdvance]);
assert.equal(afterSecondAdvance.resourceUses['fixture-round-resource'], undefined, 'round resource clears on round increment');
const battleUse = event('battle-use', {
  type: 'combat-action-used',
  actionId: 'fixture-battle-action',
  sourceId: 'fixture-battle-source',
  resourceKey: 'fixture-battle-resource',
  scope: 'battle',
  max: 1,
});
const nextCombatStart = event('next-combat-start', {
  type: 'combat-started',
  encounterId: encounter.id,
  initiativeOrder: ['bubsilda', encounterActorId],
});
assert.equal(
  replay([baseStart, combatStart, battleUse, nextCombatStart]).resourceUses['fixture-battle-resource'],
  undefined,
  'starting a new combat recovers battle resources',
);

// Safe rest uses explicit 1d8 results, caps HP and restores location resources.
const damaged = event('damage-fixture', {
  type: 'manual-adjustment',
  label: 'Бубсильда HP → 1',
  reason: 'Ручная коррекция мастера.',
  adjustment: {kind: 'participant-stat', participantId: 'bubsilda', field: 'hp', value: 1},
});
const locationUseBeforeRest = event('location-use-before-rest', {
  type: 'combat-action-used',
  actionId: 'fixture-location-action',
  sourceId: 'fixture-location-source',
  resourceKey: 'fixture-location-resource',
  scope: 'location',
  max: 1,
});
const damagedState = replay([baseStart, damaged, locationUseBeforeRest]);
const restRolls = Object.fromEntries(heroes.map((hero) => [hero.id, hero.id === 'bubsilda' ? 8 : 1]));
const restCommand = createSafeLocationRestCommand(damagedState, 'hotel-gallery', restRolls);
assert.ok(restCommand, 'safe rest command must accept explicit valid d8 results outside combat');
const afterRest = replay([baseStart, damaged, locationUseBeforeRest, event('safe-rest', restCommand)]);
assert.equal(afterRest.heroHp.bubsilda, Math.min(afterRest.heroMaxHp.bubsilda, 9));
assert.equal(afterRest.locationStates['hotel-gallery'], 'rested');
assert.equal(afterRest.resourceUses['fixture-location-resource'], undefined);

// Condition registry and undoable relationship/location adjustments.
assert.deepEqual(resolveNextFormalActionConditions(['shamed']), {
  blocked: false,
  rollModifier: -2,
  consumedConditionIds: ['shamed'],
});
assert.equal(resolveNextFormalActionConditions(['assigned-role']).blocked, true, 'assigned-role blocks next formal action');
const downedCondition = event('downed-condition', {
  type: 'manual-adjustment',
  label: 'Бубсильда: состояние downed добавлено',
  reason: 'Ручная коррекция мастера.',
  adjustment: {kind: 'condition', participantId: 'bubsilda', conditionId: 'downed', active: true},
});
const downedCombatState = replay([baseStart, combatStart, downedCondition]);
assert.ok(downedCombatState.combat);
assert.equal(createHeroAttackCommand({
  combat: downedCombatState.combat!,
  definition,
  heroes: downedCombatState.heroSources,
  heroHp: downedCombatState.heroHp,
  inventoryState: downedCombatState.inventoryState,
  resourceUses: downedCombatState.resourceUses,
  participantConditions: downedCombatState.participantConditions,
}, 'bubsilda', encounterActorId, 20), null, 'downed participant cannot execute an attack');
const enemyFirstStart = event('combat-start-enemy-first', {
  type: 'combat-started',
  encounterId: encounter.id,
  initiativeOrder: [encounterActorId, 'bubsilda'],
});
const skipDowned = replay([
  baseStart,
  enemyFirstStart,
  downedCondition,
  event('advance-past-downed', {type: 'turn-advanced'}),
]);
assert.equal(
  skipDowned.combat?.initiativeOrder[skipDowned.combat.turnIndex],
  encounterActorId,
  'initiative advance skips a participant with downed condition',
);
const relationship = event('relationship-manual', {
  type: 'manual-adjustment',
  label: 'Отношение stas → 3',
  reason: 'Ручная коррекция мастера.',
  adjustment: {kind: 'relationship', relationshipId: 'stas', value: 3},
});
const location = event('location-manual', {
  type: 'manual-adjustment',
  label: 'Текущая локация → closed-bar',
  reason: 'Ручная коррекция мастера.',
  adjustment: {kind: 'location', locationId: 'closed-bar', stateValue: 'secured'},
});
const worldLocationUse = event('world-location-use', {
  type: 'combat-action-used',
  actionId: 'world-location-action',
  sourceId: 'world-location-source',
  resourceKey: 'world-location-resource',
  scope: 'location',
  max: 1,
});
const undoLocation = event('undo-location', {type: 'action-corrected', correctedCommandId: 'location-manual'});
const worldState = replay([baseStart, relationship, worldLocationUse, location]);
assert.equal(worldState.relationships.stas, 3);
assert.equal(worldState.currentLocationId, 'closed-bar');
assert.equal(worldState.locationStates['closed-bar'], 'secured');
assert.equal(worldState.resourceUses['world-location-resource'], undefined, 'location change recovers location resource');
const undoneWorldState = replay([baseStart, relationship, worldLocationUse, location, undoLocation]);
assert.equal(undoneWorldState.relationships.stas, 3, 'atomic undo of location leaves prior relationship command');
assert.equal(undoneWorldState.currentLocationId, definition.sceneId, 'undo restores frozen initial location');
assert.equal(undoneWorldState.resourceUses['world-location-resource'], 1, 'undo restores pre-location resource usage');

console.log('Session/rules fixtures: all passed');
