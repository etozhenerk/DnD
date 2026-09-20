import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  root: projectRoot,
  server: {middlewareMode: true},
});

let assertionCount = 0;
let eventSequence = 0;
const completedScenarios = [];

function equal(actual, expected, message) {
  assertionCount += 1;
  assert.equal(actual, expected, message);
}

function notEqual(actual, expected, message) {
  assertionCount += 1;
  assert.notEqual(actual, expected, message);
}

function deepEqual(actual, expected, message) {
  assertionCount += 1;
  assert.deepEqual(actual, expected, message);
}

function ok(value, message) {
  assertionCount += 1;
  assert.ok(value, message);
}

async function scenario(name, run) {
  await run();
  completedScenarios.push(name);
  console.log(`  ✓ ${name}`);
}

try {
  const data = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const session = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const combatCommands = await server.ssrLoadModule('/src/features/run-combat/model/combatCommands.ts');
  const combatRules = await server.ssrLoadModule('/src/entities/combat/model/combatRules.ts');
  const combatView = await server.ssrLoadModule('/src/features/run-combat/model/createCombatArenaView.ts');
  const conditionRules = await server.ssrLoadModule('/src/entities/campaign-session/model/conditionRules.ts');
  const dialogueRules = await server.ssrLoadModule('/src/entities/campaign-session/model/dialoguePresets.ts');
  const npcRules = await server.ssrLoadModule('/src/entities/combat/model/npcBehavior.ts');
  const finalBossData = await server.ssrLoadModule('/src/entities/final-boss/model/data.ts');
  const finalBossRules = await server.ssrLoadModule('/src/entities/final-boss/model/finalBossRules.ts');
  const diceSelection = await server.ssrLoadModule('/src/shared/lib/dice/diceSelection.ts');

  // Stable combat fixture tests general round/damage/undo rules independently of story balancing.
  const dragon = data.penisuelaGalleryGameplay.encounters.find((entry) => entry.id === 'andrey-dragon');
  const trainingTarget = {...dragon, id: 'runtime-training-target', name: 'Тестовая цель', hp: 38, ac: 13,
    attack: {...dragon.attack, damage: '1d8+3'},
    units: [{...dragon.units[0], id: 'runtime-training-target', name: 'Тестовая цель'}]};
  const definition = {...data.penisuelaGalleryGameplay, encounters: [...data.penisuelaGalleryGameplay.encounters, trainingTarget]};
  const heroes = data.penisuelaGalleryHeroes;
  const dialogueBank = data.penisuelaDialogueBank;
  const finalBoss = finalBossData.penisuelaFinalBoss;
  const runtimeDefinition = finalBossData.penisuelaFinalBossGameplay;
  const expectation = {
    campaignId: definition.campaignId,
    definitionId: definition.id,
    definitionVersion: definition.version,
  };

  function makeEvent(commandId, input) {
    eventSequence += 1;
    return {
      ...input,
      id: `runtime-event-${eventSequence}`,
      commandId,
    };
  }

  function createStartEvent(sourceHeroes = heroes, existingInventory = []) {
    eventSequence += 1;
    return journal.createGallerySessionStartedEvent({
      definition,
      heroes: sourceHeroes,
      existingInventory,
      eventId: `runtime-start-${eventSequence}`,
      commandId: `runtime-session-${eventSequence}`,
      startedAt: '2026-08-24T12:00:00.000Z',
    });
  }

  function replay(events) {
    return session.replayGalleryEvents(events, definition);
  }

  function replayRuntime(events) {
    return session.replayGalleryEvents(events, runtimeDefinition);
  }

  function appendCommand(events, commandId, inputs) {
    return [...events, ...inputs.map((input) => makeEvent(commandId, input))];
  }

  function combatContext(state) {
    ok(state.combat, 'combat context requires an active combat');
    return {
      combat: state.combat,
      definition,
      heroes: state.heroSources,
      heroHp: state.heroHp,
      inventoryState: state.inventoryState,
      resourceUses: state.resourceUses,
      participantConditions: state.participantConditions,
    };
  }

  function getAction(actionId) {
    const action = definition.combatActions.find((candidate) => candidate.id === actionId);
    ok(action, `canonical combat action ${actionId} must exist`);
    return action;
  }

  function getEncounter(encounterId) {
    const encounter = definition.encounters.find((candidate) => candidate.id === encounterId);
    ok(encounter, `canonical encounter ${encounterId} must exist`);
    return encounter;
  }

  function createArenaView(state, encounter, requestedHeroTargetId, participantConditions = {}) {
    ok(state.combat, 'combat arena view requires an active combat');
    const requestedEnemyTargetId = Object.values(state.combat.enemies)
      .find((enemy) => enemy.hp > 0)?.id ?? '';
    return combatView.createCombatArenaView({
      actions: definition.combatActions,
      combat: state.combat,
      encounter,
      fallbackEnemyToken: 'test-token.png',
      heroes: state.heroSources,
      heroHp: state.heroHp,
      inventoryState: state.inventoryState,
      participantConditions,
      resourceUses: state.resourceUses,
      heroTokens: Object.fromEntries(state.heroSources.map((hero) => [hero.id, 'test-token.png'])),
      requestedEnemyTargetId,
      requestedHeroTargetId,
    });
  }

  function getPlan(planId) {
    const plan = finalBoss.plans.find((candidate) => candidate.id === planId);
    ok(plan, `canonical final plan ${planId} must exist`);
    return plan;
  }

  console.log('Penisuela production runtime scenarios:');

  await scenario('frozen session seed, strict journal, serializer and idempotent restore', () => {
    const mutableHeroes = structuredClone(heroes);
    const start = createStartEvent(mutableHeroes, ['overload-console']);
    const frozenName = start.seed.heroSources[0].name;
    const frozenItemName = start.seed.heroSources[0].items[0].name;
    mutableHeroes[0].name = 'Контент изменился после старта';
    mutableHeroes[0].items[0].name = 'Предмет изменился после старта';
    equal(start.seed.heroSources[0].name, frozenName, 'start event must freeze hero identity');
    equal(start.seed.heroSources[0].items[0].name, frozenItemName, 'start event must deep-freeze nested item sources');
    ok(start.seed.initialInventoryState['overload-console'], 'existing campaign inventory must enter the frozen seed');

    const commandA = makeEvent('strict-command-a', {type: 'flag-changed', flag: 'fixture-a', value: true});
    const commandB = makeEvent('strict-command-b', {type: 'flag-changed', flag: 'fixture-b', value: true});
    const validLog = [start, commandA, commandB];
    equal(journal.parseGalleryEventLog(validLog, expectation).ok, true, 'valid contiguous command groups must parse');
    deepEqual(replay(validLog), replay(validLog), 'replaying the same journal must be idempotent');

    const repeatedNonContiguous = [
      start,
      commandA,
      commandB,
      makeEvent('strict-command-a', {type: 'counter-changed', counter: 'timePressure', delta: 1}),
    ];
    equal(
      journal.parseGalleryEventLog(repeatedNonContiguous, expectation).ok,
      false,
      'a non-contiguous repeated command id must be rejected even with a new event id',
    );
    equal(
      journal.parseGalleryEventLog([start, commandA, {...commandB, id: commandA.id}], expectation).ok,
      false,
      'duplicate event ids must be rejected',
    );
    equal(
      journal.parseGalleryEventLog([commandA], expectation).ok,
      false,
      'session-started must be the first journal event',
    );
    equal(
      journal.parseGalleryEventLog([
        start,
        makeEvent('bad-correction', {type: 'action-corrected', correctedCommandId: 'missing-command'}),
      ], expectation).ok,
      false,
      'correction must reference an existing non-start command',
    );

    const envelope = journal.createStoredGallerySessionEnvelope(
      validLog,
      expectation,
      '2026-08-24T12:30:00.000Z',
    );
    ok(envelope, 'production serializer must accept a valid journal');
    const serialized = JSON.parse(JSON.stringify(envelope));
    const parsed = journal.parseStoredGallerySessionEnvelope(serialized, expectation);
    equal(parsed.ok, true, 'serialized production envelope must parse');
    const restored = replay(parsed.events);
    equal(restored.heroSources[0].name, frozenName, 'restore must use the frozen source snapshot');
    equal(restored.version, journal.GALLERY_SESSION_VERSION, 'restored session version must match production');
    equal(restored.flags['fixture-a'], true, 'restored state must include journal effects');
    equal(
      journal.parseStoredGallerySessionEnvelope({...serialized, version: -1}, expectation).ok,
      false,
      'incompatible envelope version must be rejected',
    );
    equal(
      journal.parseStoredGallerySessionEnvelope({...serialized, updatedAt: 'not-a-date'}, expectation).ok,
      false,
      'invalid envelope timestamp must be rejected',
    );
    equal(
      journal.createStoredGallerySessionEnvelope(validLog, expectation, 'not-a-date'),
      null,
      'serializer must refuse an invalid updatedAt value',
    );
  });

  await scenario('physical and digital d20, natural 1/20 and formal conditions', () => {
    const hero = heroes.find((candidate) => candidate.id === 'bubsilda');
    ok(hero, 'Bubsilda must be in the canonical party');
    const check = {id: 'runtime-check', dc: 12, successText: 'success', failureText: 'failure'};

    const physicalOne = session.resolveCheck({...check, dc: 0}, hero, 'charisma', [1]);
    equal(physicalOne.success, false, 'physical natural 1 must fail despite a sufficient total');
    const physicalTwenty = session.resolveCheck({...check, dc: 100}, hero, 'charisma', [20]);
    equal(physicalTwenty.success, true, 'physical natural 20 must succeed despite an insufficient total');
    const advantage = session.resolveCheck(check, hero, 'charisma', [4, 13]);
    deepEqual(advantage.rolls, [4, 13], 'both explicitly entered physical dice must remain in the result');
    equal(advantage.success, true, 'production check must select the higher advantage die');
    equal(session.resolveCheck(check, hero, 'charisma', [], true).automatic, true, 'automatic check must be explicit');
    deepEqual(
      diceSelection.resolveDiceSelection([4, 13], '1d20', 'highest'),
      {value: 13, rolls: [4, 13]},
      'digital advantage must keep both d20 values and select the higher one',
    );
    deepEqual(
      diceSelection.resolveDiceSelection([4, 13], '1d20', 'lowest'),
      {value: 4, rolls: [4, 13]},
      'digital disadvantage must keep both d20 values and select the lower one',
    );
    equal(
      diceSelection.resolveDiceSelection([4], '1d20', 'highest'),
      null,
      'advantage must reject an incomplete one-die digital result',
    );
    deepEqual(
      diceSelection.resolveDiceSelection([5, 6], '2d6', 'sum'),
      {value: 11, rolls: [5, 6]},
      'digital multi-die actions must return the visible raw dice sum before a rules modifier is added',
    );

    const originalRandom = Math.random;
    try {
      Math.random = () => 0;
      equal(combatRules.rollDie(20), 1, 'digital d20 lower boundary must be 1');
      Math.random = () => 0.999999999;
      equal(combatRules.rollDie(20), 20, 'digital d20 upper boundary must be 20');
    } finally {
      Math.random = originalRandom;
    }

    deepEqual(conditionRules.resolveNextFormalActionConditions(['shamed']), {
      blocked: false,
      rollModifier: -2,
      consumedConditionIds: ['shamed'],
    });
    equal(
      conditionRules.resolveNextFormalActionConditions(['assigned-role']).blocked,
      true,
      'assigned-role must consume and block the next formal action',
    );
  });

  await scenario('canonical sources, every usage scope, ownership, quantity, charges and recharge', () => {
    const start = createStartEvent();
    const initial = replay([start]);
    const documentary = getAction('bubsilda-documentary-guards');
    const yellowSnowball = getAction('bubsilda-yellow-snowball-guards');
    const sleepScroll = getAction('lena-sleep-scroll');
    const hudHelmet = getAction('lambert-hud-helmet-guards');

    ok(
      documentary.encounterIds.includes('dressing-room-mirror-doubles'),
      'one canonical documentary action must cover the mirror encounter',
    );
    equal(
      combatCommands.isCombatActionSourceAvailable(yellowSnowball, initial),
      true,
      'owned charged item must initially be available',
    );
    const wrongOwner = structuredClone(initial);
    wrongOwner.inventoryState['yellow-snowball'].ownerId = 'linda';
    equal(
      combatCommands.isCombatActionSourceAvailable(yellowSnowball, wrongOwner),
      false,
      'wrong owner must block an item action',
    );
    const zeroQuantity = structuredClone(initial);
    zeroQuantity.inventoryState['yellow-snowball'].quantity = 0;
    equal(
      combatCommands.isCombatActionSourceAvailable(yellowSnowball, zeroQuantity),
      false,
      'zero quantity must block an item action',
    );
    const zeroCharge = structuredClone(initial);
    zeroCharge.inventoryState['yellow-snowball'].charges = 0;
    equal(
      combatCommands.isCombatActionSourceAvailable(yellowSnowball, zeroCharge),
      false,
      'zero charges must block a charged item action',
    );

    let events = appendCommand([start], 'yellow-use', [
      combatCommands.createCombatActionUsageEvent(yellowSnowball),
      {type: 'item-charge-changed', itemId: yellowSnowball.sourceId, change: {mode: 'delta', value: -1}},
    ]);
    let state = replay(events);
    equal(state.inventoryState['yellow-snowball'].charges, 0, 'campaign item charge must be consumed atomically');
    equal(combatCommands.isCombatActionSourceAvailable(yellowSnowball, state), false, 'spent campaign item must be unavailable');
    state = session.recoverGalleryResourceScopes(state, ['turn', 'round', 'battle', 'location']);
    equal(state.inventoryState['yellow-snowball'].charges, 0, 'campaign charge must not recover from lower scopes');

    const documentaryEvent = combatCommands.createCombatActionUsageEvent(documentary);
    const sharedState = replay(appendCommand([start], 'documentary-use', [documentaryEvent]));
    equal(
      combatCommands.isCombatActionSourceAvailable(documentary, sharedState),
      false,
      'documentary must remain spent for the rest of the battle',
    );

    const scopedInputs = [
      {type: 'combat-action-used', actionId: 'fixture-turn-action', sourceId: 'fixture-turn-source', resourceKey: 'fixture-turn', scope: 'turn', max: 1},
      {type: 'combat-action-used', actionId: 'fixture-round-action', sourceId: 'fixture-round-source', resourceKey: 'fixture-round', scope: 'round', max: 1},
      {type: 'combat-action-used', actionId: documentary.id, sourceId: documentary.sourceId, resourceKey: 'fixture-battle', scope: 'battle', max: 1},
      {type: 'combat-action-used', actionId: sleepScroll.id, sourceId: sleepScroll.sourceId, resourceKey: 'fixture-location', scope: 'location', max: 1},
      {type: 'combat-action-used', actionId: yellowSnowball.id, sourceId: yellowSnowball.sourceId, resourceKey: 'fixture-campaign', scope: 'campaign', max: 1},
    ];
    const scoped = replay(appendCommand([start], 'all-scopes-used', scopedInputs));
    equal(session.recoverGalleryResourceScopes(scoped, ['turn']).resourceUses['fixture-turn'], undefined);
    equal(session.recoverGalleryResourceScopes(scoped, ['round']).resourceUses['fixture-round'], undefined);
    equal(session.recoverGalleryResourceScopes(scoped, ['battle']).resourceUses['fixture-battle'], undefined);
    equal(session.recoverGalleryResourceScopes(scoped, ['location']).resourceUses['fixture-location'], undefined);
    equal(
      session.recoverGalleryResourceScopes(scoped, ['turn', 'round', 'battle', 'location']).resourceUses['fixture-campaign'],
      1,
      'campaign use must remain consumed for the whole campaign',
    );

    const encounter = getEncounter('runtime-training-target');
    const combatStartInput = combatCommands.createStartCombatCommand(encounter, heroes, () => 10);
    const combatStarted = replay(appendCommand(
      appendCommand([start], 'pre-combat-scopes', scopedInputs),
      'scope-combat-start',
      [combatStartInput],
    ));
    equal(combatStarted.resourceUses['fixture-turn'], undefined, 'combat start recovers turn resources');
    equal(combatStarted.resourceUses['fixture-round'], undefined, 'combat start recovers round resources');
    equal(combatStarted.resourceUses['fixture-battle'], undefined, 'combat start recovers battle resources');
    equal(combatStarted.resourceUses['fixture-location'], 1, 'combat start does not recover location resources');
    equal(combatStarted.resourceUses['fixture-campaign'], 1, 'combat start does not recover campaign resources');

    const battleChargeItemId = 'fixture-battle-item';
    const chargeFixtureHeroes = heroes.map((hero) => hero.id === 'bubsilda'
      ? {
          ...hero,
          items: [
            ...hero.items,
            {id: battleChargeItemId, name: 'Тестовый предмет боя', charges: {scope: 'battle', max: 1}},
          ],
        }
      : hero);
    const chargeStart = createStartEvent(chargeFixtureHeroes);
    const chargeInputs = [
      {type: 'item-charge-changed', itemId: sleepScroll.sourceId, change: {mode: 'set', value: 0}},
      {type: 'item-charge-changed', itemId: battleChargeItemId, change: {mode: 'set', value: 0}},
    ];
    events = appendCommand([chargeStart], 'charge-spend', chargeInputs);
    events = appendCommand(events, 'location-change', [{
      type: 'manual-adjustment',
      label: 'Текущая локация → closed-bar',
      reason: 'Сценарная проверка восстановления location.',
      adjustment: {kind: 'location', locationId: 'closed-bar', stateValue: 'secured'},
    }]);
    state = replay(events);
    equal(state.inventoryState[sleepScroll.sourceId].charges, 1, 'location transition must restore location item charges');
    equal(state.inventoryState[battleChargeItemId].charges, 0, 'location transition must not restore battle item charges');
    events = appendCommand(events, 'battle-recharge-start', [combatStartInput]);
    state = replay(events);
    equal(state.inventoryState[battleChargeItemId].charges, 1, 'combat start must restore battle item charges');
    equal(
      combatCommands.isCombatActionSourceAvailable(hudHelmet, state),
      true,
      'an owned unlimited item may still have a battle-scoped technique use',
    );
  });

  await scenario('production combat commands: initiative, full round, attacks, damage, healing and victory', () => {
    const start = createStartEvent();
    const encounter = getEncounter('runtime-training-target');
    const initiativeRolls = [20, 1, 1, 1, 1, 1];
    const startInput = combatCommands.createStartCombatCommand(
      encounter,
      heroes,
      () => initiativeRolls.shift() ?? 1,
    );
    equal(startInput.initiativeOrder[0], 'bubsilda', 'deterministic production initiative must put Bubsilda first');
    let events = appendCommand([start], 'combat-start', [startInput]);
    let state = replay(events);
    equal(state.combat.round, 1);
    equal(state.combat.initiativeOrder[state.combat.turnIndex], 'bubsilda');

    const firstAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'bubsilda',
      'runtime-training-target',
      20,
    );
    ok(firstAttack, 'active hero attack command must be created');
    events = appendCommand(events, 'bubsilda-hit-one', firstAttack);
    state = replay(events);
    equal(state.combat.pendingAttack.critical, true, 'natural 20 must create a critical pending attack');
    const firstDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 8);
    ok(firstDamage, 'pending attack must accept an explicit physical damage total');
    equal(firstDamage.victory, false, 'first critical hit must not end the 38 HP encounter');
    events = appendCommand(events, 'bubsilda-damage-one', firstDamage.events);
    state = replay(events);
    equal(state.combat.enemies['runtime-training-target'].hp, 16, 'critical (8 + 3) × 2 damage must be applied by production rules');

    while (state.combat.initiativeOrder[state.combat.turnIndex] !== 'runtime-training-target') {
      const activeHeroId = state.combat.initiativeOrder[state.combat.turnIndex];
      const miss = combatCommands.createHeroAttackCommand(
        combatContext(state),
        activeHeroId,
        'runtime-training-target',
        1,
      );
      ok(miss, `${activeHeroId} must receive a legal hero attack command`);
      events = appendCommand(events, `miss-${activeHeroId}`, miss);
      state = replay(events);
    }

    const enemyAttack = combatCommands.createEnemyAttackCommand(combatContext(state), 'bubsilda', 20);
    ok(enemyAttack, 'active enemy attack command must be created');
    events = appendCommand(events, 'kraken-hit', enemyAttack);
    state = replay(events);
    equal(state.combat.pendingAttack.actorId, 'runtime-training-target');
    const enemyDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 8);
    ok(enemyDamage, 'enemy pending attack must accept explicit damage');
    events = appendCommand(events, 'kraken-damage', enemyDamage.events);
    state = replay(events);
    equal(state.heroHp.bubsilda, 16, 'enemy critical damage must reduce hero HP');

    while (state.combat.initiativeOrder[state.combat.turnIndex] !== 'bubsilda') {
      const activeHeroId = state.combat.initiativeOrder[state.combat.turnIndex];
      const miss = combatCommands.createHeroAttackCommand(
        combatContext(state),
        activeHeroId,
        'runtime-training-target',
        1,
      );
      ok(miss, `${activeHeroId} must be able to finish the round with a miss`);
      events = appendCommand(events, `round-one-miss-${activeHeroId}`, miss);
      state = replay(events);
    }
    equal(state.combat.round, 2, 'initiative must advance to round two after every participant acts');

    const finalAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'bubsilda',
      'runtime-training-target',
      20,
    );
    ok(finalAttack, 'round-two finishing attack must be legal');
    events = appendCommand(events, 'bubsilda-hit-two', finalAttack);
    state = replay(events);
    const finalDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 8);
    ok(finalDamage, 'round-two pending damage must resolve');
    equal(finalDamage.victory, true, 'second critical hit must defeat the encounter');
    events = appendCommand(events, 'bubsilda-damage-two', finalDamage.events);
    state = replay(events);
    equal(state.combat.enemies['runtime-training-target'].hp, 0);
    const clear = combatCommands.createClearCombatCommand(state.combat);
    ok(clear, 'defeated encounter must expose the production clear command');
    events = appendCommand(events, 'combat-clear', [clear]);
    state = replay(events);
    equal(state.combat, null, 'clear command must leave no active combat');

    const healingEncounter = getEncounter('hotel-vip-guards');
    const healingStartInput = combatCommands.createStartCombatCommand(
      healingEncounter,
      [heroes.find((hero) => hero.id === 'linda')],
      (() => {
        const rolls = [20, 1, 1];
        return () => rolls.shift() ?? 1;
      })(),
    );
    let healingEvents = appendCommand([start], 'hurt-thorin', [{
      type: 'manual-adjustment',
      label: 'Торин HP → 10',
      reason: 'Сценарная проверка лечения.',
      adjustment: {kind: 'participant-stat', participantId: 'thorin-pukoshchit', field: 'hp', value: 10},
    }]);
    healingEvents = appendCommand(healingEvents, 'healing-combat-start', [healingStartInput]);
    let healingState = replay(healingEvents);
    equal(healingState.combat.initiativeOrder[0], 'linda', 'Linda must act first in the healing fixture');
    const healingAction = getAction('linda-healing-pollen');
    const equip = combatCommands.createEquipCombatItemCommand(combatContext(healingState), healingAction.id);
    ok(equip, 'healing pollen must be equippable by its owner');
    healingEvents = appendCommand(healingEvents, 'equip-pollen', equip);
    healingState = replay(healingEvents);
    const heal = combatCommands.createUseCombatActionCommand(
      combatContext(healingState),
      healingAction.id,
      'thorin-pukoshchit',
      8,
    );
    ok(heal, 'selected healing action must create a production command');
    healingEvents = appendCommand(healingEvents, 'use-pollen', [
      ...heal,
      {type: 'item-charge-changed', itemId: healingAction.sourceId, change: {mode: 'delta', value: -1}},
    ]);
    healingState = replay(healingEvents);
    equal(healingState.heroHp['thorin-pukoshchit'], 18, 'explicit 2d8 raw total must heal through production rules');
    equal(healingState.inventoryState['healing-pollen'].charges, 2, 'healing item must consume one real charge');
    equal(
      healingState.resourceUses[combatCommands.getCombatActionResourceKey(healingAction)],
      1,
      'healing action use must share the canonical resource ledger',
    );
  });

  await scenario('Bubsilda abilities: support, Grandaxin, summon and emergency landing', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const bubsildaActions = definition.combatActions.filter((action) => (
      action.characterId === 'bubsilda'
      && action.encounterIds.includes(encounter.id)
    ));
    equal(bubsildaActions.filter((action) => action.source === 'ability').length, 7, 'Bubsilda must expose seven abilities');
    equal(bubsildaActions.filter((action) => action.source === 'item').length, 4, 'Bubsilda must expose four selectable inventory items');
    equal(
      bubsildaActions.some((action) => action.id === 'bubsilda-boeing-sword'),
      false,
      'Boeing-Smerch must not duplicate Bubsilda\'s default attack in the item tray',
    );
    const bubsildaBaseAttack = encounter.heroAttacks.find((attack) => attack.characterId === 'bubsilda');
    deepEqual(
      bubsildaBaseAttack,
      {characterId: 'bubsilda', name: 'Боинг-Смерч', bonus: 6, damage: '1d8+3', damageType: 'physical', range: 'melee'},
      'Boeing-Smerch must remain Bubsilda\'s default attack',
    );

    let itemSwitchEvents = appendCommand([start], 'item-switch-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds],
    }]);
    let itemSwitchState = replay(itemSwitchEvents);
    const bubsildaPassiveEffects = createArenaView(itemSwitchState, encounter, 'bubsilda').active.effects;
    ok(
      bubsildaPassiveEffects.some((effect) => effect.shortLabel === '½ холода'),
      'Bubsilda cold resistance must be visible independently from her one-use control ward',
    );
    ok(
      bubsildaPassiveEffects.some((effect) => effect.shortLabel === 'Стойкость'),
      'Bubsilda control ward must be visible on her combat card',
    );
    const weaknessState = replay(appendCommand(itemSwitchEvents, 'visible-weakness', [{
      type: 'combat-weakness-exposed',
      text: 'Слабое место раскрыто.',
    }]));
    const weaknessView = createArenaView(weaknessState, encounter, 'bubsilda');
    ok(
      weaknessView.enemyTargets.every((enemy) => (
        enemy.effects.some((effect) => effect.shortLabel === 'Слабое место')
      )),
      'a globally exposed weakness must be visible on every affected enemy card',
    );
    const iceHeart = getAction('bubsilda-ice-heart');
    const yellowSnowball = getAction('bubsilda-yellow-snowball-guards');
    const equipIceHeart = combatCommands.createEquipCombatItemCommand(combatContext(itemSwitchState), iceHeart.id);
    ok(equipIceHeart, 'Ice Heart must be equippable');
    itemSwitchEvents = appendCommand(itemSwitchEvents, 'equip-ice-heart', equipIceHeart);
    itemSwitchState = replay(itemSwitchEvents);
    equal(itemSwitchState.combat.equippedItems.bubsilda, iceHeart.id);
    ok(itemSwitchState.combat.selectedActionIds.includes(iceHeart.id), 'equipping an item must select it immediately');
    const equipYellowSnowball = combatCommands.createEquipCombatItemCommand(
      combatContext(itemSwitchState),
      yellowSnowball.id,
    );
    ok(equipYellowSnowball, 'Yellow Snowball must replace the currently equipped item');
    itemSwitchEvents = appendCommand(itemSwitchEvents, 'equip-yellow-snowball', equipYellowSnowball);
    itemSwitchState = replay(itemSwitchEvents);
    equal(itemSwitchState.combat.equippedItems.bubsilda, yellowSnowball.id);
    ok(itemSwitchState.combat.selectedActionIds.includes(yellowSnowball.id), 'the newly equipped item must stay active');
    equal(itemSwitchState.combat.selectedActionIds.includes(iceHeart.id), false, 'the previous item must be deselected');
    const itemTurnResetState = replay(appendCommand(itemSwitchEvents, 'item-turn-advanced', [{type: 'turn-advanced'}]));
    deepEqual(itemTurnResetState.combat.equippedItems, {}, 'equipped combat items must reset when the turn changes');
    deepEqual(itemTurnResetState.combat.selectedActionIds, [], 'selected skills and items must reset when the turn changes');
    const deselectYellowSnowball = combatCommands.createSelectCombatActionCommand(
      combatContext(itemSwitchState),
      yellowSnowball.id,
    );
    ok(deselectYellowSnowball, 'clicking the equipped item again must remain legal');
    itemSwitchState = replay(appendCommand(itemSwitchEvents, 'deselect-yellow-snowball', deselectYellowSnowball));
    equal(
      itemSwitchState.combat.selectedActionIds.includes(yellowSnowball.id),
      false,
      'clicking the selected item again must return to the default attack',
    );
    equal(
      createArenaView(itemSwitchState, encounter, 'bubsilda').active.attackName,
      'Боинг-Смерч',
      'deselecting an item must expose Bubsilda\'s default attack',
    );

    let events = appendCommand([start], 'royal-will-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', 'linda', ...enemyIds],
    }]);
    let state = replay(events);
    const royalWill = getAction('bubsilda-royal-will');
    const royalSelect = combatCommands.createSelectCombatActionCommand(combatContext(state), royalWill.id);
    ok(royalSelect, 'Royal Will must be selectable');
    events = appendCommand(events, 'royal-will-select', royalSelect);
    state = replay(events);
    const royalUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      royalWill.id,
      'linda',
    );
    ok(royalUse, 'Royal Will must target a living ally');
    events = appendCommand(events, 'royal-will-use', royalUse);
    state = replay(events);
    const royalStatus = state.combat.statuses.find((status) => (
      status.kind === 'guided-turn' && status.targetId === 'linda'
    ));
    ok(royalStatus, 'Royal Will must place its visible guided-turn status on the selected ally');
    equal(state.combat.initiativeOrder[state.combat.turnIndex], 'linda', 'Royal Will must hand the next turn to Linda');
    const royalWillView = createArenaView(state, encounter, 'linda');
    ok(royalWillView, 'Royal Will combat view must be available');
    ok(
      royalWillView.party.find((participant) => participant.id === 'linda')?.effects
        ?.some((effect) => effect.shortLabel === 'Королевский ход'),
      'Royal Will guided turn must be exposed in the combat HUD view',
    );
    const lindaAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'linda',
      enemyIds[0],
      10,
    );
    ok(lindaAttack, 'inspired Linda must be able to attack');
    equal(
      lindaAttack.find((event) => event.type === 'combat-attack-resolved').attack.rollMode,
      'advantage',
      'Royal Will must grant advantage to Linda\'s first attack',
    );
    state = replay(appendCommand(events, 'royal-will-attack', lindaAttack));
    equal(
      state.combat.statuses.some((status) => status.id === royalStatus.id),
      false,
      'Royal Will must be consumed by that attack',
    );

    events = appendCommand([start], 'grandaxin-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds],
    }, {
      type: 'combat-condition-changed',
      participantId: 'bubsilda',
      condition: 'blinded',
      active: true,
      bypassImmunity: true,
      text: 'Тестовое ослепление.',
    }]);
    state = replay(events);
    const grandaxin = getAction('bubsilda-grandaxin');
    events = appendCommand(events, 'grandaxin-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      grandaxin.id,
    ));
    state = replay(events);
    const grandaxinUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      grandaxin.id,
      'bubsilda',
      5,
    );
    ok(grandaxinUse, 'Grandaxin must accept a successful d8 result');
    state = replay(appendCommand(events, 'grandaxin-use', grandaxinUse));
    deepEqual(state.combat.conditions.bubsilda, [], 'successful Grandaxin must cleanse combat conditions');
    equal(state.combat.attackModifiers[0].amount, 2, 'Grandaxin 3–6 must grant +2 to the next attack');
    equal(state.combat.initiativeOrder[state.combat.turnIndex], 'bubsilda', 'Grandaxin must wait for its healing roll before ending the turn');
    const grandaxinView = createArenaView(state, encounter, 'bubsilda');
    ok(grandaxinView, 'Grandaxin combat view must be available');
    ok(
      grandaxinView.active.effects.some((effect) => effect.shortLabel === 'АТК +2'),
      'Grandaxin attack bonus must be visible on Bubsilda\'s active card',
    );

    events = appendCommand([start], 'grandaxin-strong-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds],
    }]);
    state = replay(events);
    events = appendCommand(events, 'grandaxin-strong-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      grandaxin.id,
    ));
    state = replay(events);
    const strongGrandaxinUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      grandaxin.id,
      'bubsilda',
      8,
    );
    ok(strongGrandaxinUse, 'Grandaxin must resolve its strongest 7–8 outcome');
    state = replay(appendCommand(events, 'grandaxin-strong-use', strongGrandaxinUse));
    ok(
      state.combat.statuses.some((status) => status.kind === 'attack-advantage' && status.targetId === 'bubsilda'),
      'strong Grandaxin must retain its visible attack advantage alongside other effects',
    );
    equal(
      state.combat.statuses.find((status) => status.kind === 'temporary-hp' && status.targetId === 'bubsilda')?.amount,
      6,
      'strong Grandaxin must retain six visible temporary HP alongside attack advantage',
    );

    events = appendCommand([start], 'ice-guard-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds],
    }]);
    state = replay(events);
    const iceGuard = getAction('bubsilda-ice-guard');
    const iceGuardSummon = iceGuard.effects.find((effect) => effect.type === 'summon-allies');
    equal(iceGuardSummon?.unit.name, 'Ледяной Страж', 'Ice Guard summon must use the Guard identity, not an enemy steward');
    equal(
      iceGuardSummon?.unit.token,
      'assets/concepts/campaigns/penisuela/ui/summon-tokens/ice-guard.png',
      'Ice Guard summon must use its own approved combat token',
    );
    events = appendCommand(events, 'ice-guard-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      iceGuard.id,
    ));
    state = replay(events);
    const iceGuardUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      iceGuard.id,
      'bubsilda',
      3,
    );
    ok(iceGuardUse, 'Ice Guard must accept an explicit 1d4 result');
    state = replay(appendCommand(events, 'ice-guard-use', iceGuardUse));
    equal(Object.keys(state.combat.allies).length, 3, 'Ice Guard must summon the requested number of guards');

    events = appendCommand([start], 'emergency-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    const emergencyLanding = getAction('bubsilda-emergency-landing');
    events = appendCommand(events, 'emergency-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      emergencyLanding.id,
    ));
    state = replay(events);
    const emergencySelectionView = createArenaView(state, encounter, 'linda');
    equal(
      emergencySelectionView.actions.find((action) => action.id === emergencyLanding.id)?.rollOwnerLabel,
      'Мастер за всех противников · один общий d20',
      'Emergency Landing HUD must identify who rolls the shared enemy save',
    );
    const emergencyUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      emergencyLanding.id,
      undefined,
      1,
    );
    ok(emergencyUse, 'Emergency Landing must accept a shared enemy save');
    state = replay(appendCommand(events, 'emergency-use', emergencyUse));
    equal(state.combat.initiativeOrder[state.combat.turnIndex], 'linda', 'all stunned enemies must lose their next action');
    enemyIds.forEach((enemyId) => deepEqual(state.combat.conditions[enemyId], [], `${enemyId} conditions must clear after the skipped action`));
    const skippedEnemiesView = createArenaView(state, encounter, 'linda');
    enemyIds.forEach((enemyId) => ok(
      skippedEnemiesView.participants.find((participant) => participant.id === enemyId)?.effects
        ?.some((effect) => effect.id === 'recently-skipped'),
      `${enemyId} must remain visibly marked in the initiative rail after its action was skipped`,
    ));
    ok(state.combat.log.at(-1).includes('пропускают следующее действие'), 'skipped enemy actions must be explicit in the combat log');

    events = appendCommand([start], 'emergency-threshold-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    events = appendCommand(events, 'emergency-threshold-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      emergencyLanding.id,
    ));
    state = replay(events);
    const emergencyThresholdUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      emergencyLanding.id,
      undefined,
      12,
    );
    ok(emergencyThresholdUse, 'Emergency Landing must accept the exact DC result');
    state = replay(appendCommand(events, 'emergency-threshold-use', emergencyThresholdUse));
    equal(state.combat.initiativeOrder[state.combat.turnIndex], enemyIds[0], 'a shared save of 12 must let enemies keep their actions');

    events = appendCommand([start], 'stunned-active-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'bubsilda', 'linda', ...enemyIds.slice(1)],
    }, {
      type: 'combat-condition-changed',
      participantId: enemyIds[0],
      condition: 'stunned',
      active: true,
    }]);
    state = replay(events);
    equal(
      combatCommands.createEnemyAttackCommand(combatContext(state), 'bubsilda', 20),
      null,
      'a stunned active enemy must not be able to attack even after a manual initiative override',
    );
  });

  await scenario('Linda combat kit: visible passives, flight, resonance and shared turbulence charges', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);

    let events = appendCommand([start], 'linda-flight-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', 'bubsilda', ...enemyIds],
    }]);
    let state = replay(events);
    const initialLindaView = createArenaView(state, encounter, 'bubsilda');
    const initialLindaEffects = initialLindaView.party.find((hero) => hero.id === 'linda')?.effects ?? [];
    ok(initialLindaEffects.some((effect) => effect.shortLabel === '½ яда'), 'Linda poison resistance must be visible');
    ok(initialLindaEffects.some((effect) => effect.shortLabel === 'Воля жизни'), 'Linda survival trigger must be visible');
    const sessionDebuffEffects = createArenaView(
      state,
      encounter,
      'bubsilda',
      {linda: ['shamed']},
    ).party.find((hero) => hero.id === 'linda')?.effects ?? [];
    ok(
      sessionDebuffEffects.some((effect) => effect.shortLabel === 'Стыд −2' && effect.tone === 'negative'),
      'session debuffs must be visible on the right-side hero card',
    );

    const flight = getAction('linda-flight');
    events = appendCommand(events, 'linda-flight-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      flight.id,
    ));
    state = replay(events);
    const flightUse = combatCommands.createUseCombatActionCommand(combatContext(state), flight.id, 'linda');
    ok(flightUse, 'Flight must toggle on without consuming Linda\'s action');
    events = appendCommand(events, 'linda-flight-use', flightUse);
    state = replay(events);
    const flyingView = createArenaView(state, encounter, 'bubsilda');
    ok(flyingView.active.effects.some((effect) => effect.shortLabel === 'Полёт'), 'Flight stance must be visible');
    ok(flyingView.active.effects.some((effect) => effect.shortLabel === 'Пикирование'), 'Dive bonus must be visible');
    const diveAttack = combatCommands.createHeroAttackCommand(combatContext(state), 'linda', enemyIds[0], 10);
    ok(diveAttack, 'Linda must be able to dive-attack after taking flight');
    deepEqual(
      diveAttack.find((event) => event.type === 'combat-attack-resolved').attack.bonusDamageDice,
      [{expression: '1d6', label: 'Пикирование'}],
      'the player must roll the visible dive die together with the base damage dice',
    );
    state = replay(appendCommand(events, 'linda-dive-attack', diveAttack));
    equal(state.combat.stances.linda?.includes('airborne') ?? false, false, 'the dive attack must end Flight');
    equal(
      state.combat.statuses.some((status) => status.kind === 'dive-ready' && status.targetId === 'linda'),
      false,
      'the visible dive bonus must be consumed by the attack',
    );

    events = appendCommand([start], 'linda-whisper-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', 'bubsilda', ...enemyIds],
    }]);
    state = replay(events);
    const whisper = getAction('linda-magic-whisper-guards');
    events = appendCommand(events, 'linda-whisper-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      whisper.id,
    ));
    state = replay(events);
    const whisperUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      whisper.id,
      enemyIds[0],
    );
    ok(whisperUse, 'Magic Whisper must target a living enemy');
    events = appendCommand(events, 'linda-whisper-use', whisperUse);
    state = replay(events);
    const resonance = state.combat.statuses.find((status) => (
      status.kind === 'resonance' && status.targetId === enemyIds[0]
    ));
    equal(resonance?.charges, 2, 'Magic Whisper must track two different-hero resonance hits');
    ok(
      createArenaView(state, encounter, 'bubsilda').enemyTargets
        .find((enemy) => enemy.id === enemyIds[0])?.effects
        ?.some((effect) => effect.shortLabel === 'Резонанс ×2'),
      'resonance charges must be visible on the enemy card',
    );
    const resonanceAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'bubsilda',
      enemyIds[0],
      10,
    );
    ok(resonanceAttack, 'the next different hero must be able to consume one resonance charge');
    deepEqual(
      resonanceAttack.find((event) => event.type === 'combat-attack-resolved').attack.bonusDamageDice,
      [{expression: '1d4', label: 'Магический резонанс'}],
      'the player must roll the resonance d4 instead of receiving a hidden flat result',
    );
    state = replay(appendCommand(events, 'linda-whisper-hit', resonanceAttack));
    equal(
      state.combat.statuses.find((status) => status.id === resonance.id)?.charges,
      1,
      'one successful hero hit must consume exactly one resonance charge',
    );

    events = appendCommand([start], 'linda-turbulence-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', enemyIds[0], 'bubsilda', ...enemyIds.slice(1)],
    }]);
    state = replay(events);
    const turbulence = getAction('linda-resort-turbulence');
    events = appendCommand(events, 'linda-turbulence-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      turbulence.id,
    ));
    state = replay(events);
    const turbulenceUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      turbulence.id,
      undefined,
    );
    ok(turbulenceUse, 'Resort Turbulence must protect the whole party');
    events = appendCommand(events, 'linda-turbulence-use', turbulenceUse);
    state = replay(events);
    const windGuards = state.combat.statuses.filter((status) => status.kind === 'wind-guard');
    equal(windGuards.length, heroes.length, 'every hero card must receive the shared turbulence marker');
    ok(windGuards.every((status) => status.charges === 2), 'every marker must show both shared reroll charges');
    const turbulentEnemyAttack = combatCommands.createEnemyAttackCommand(
      combatContext(state),
      'bubsilda',
      20,
    );
    ok(turbulentEnemyAttack, 'the first successful enemy attack must be rerolled by turbulence');
    events = appendCommand(events, 'linda-turbulence-trigger', turbulentEnemyAttack);
    state = replay(events);
    equal(state.combat.pendingSavingThrow?.kind, 'enemy-attack-reroll', 'turbulence must request an explicit reroll');
    state = replay(appendCommand(events, 'linda-turbulence-reroll', combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 8)));
    const remainingWindGuards = state.combat.statuses.filter((status) => status.kind === 'wind-guard');
    ok(
      remainingWindGuards.every((status) => status.charges === 1),
      'one enemy attack must consume one shared charge on every visible party marker',
    );
  });

  await scenario('Lambert combat kit: five skills, four items and working tactical effects', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const actions = definition.combatActions.filter((action) => (
      action.characterId === 'lambert' && action.encounterIds.includes(encounter.id)
    ));
    equal(actions.filter((action) => action.source === 'ability').length, 5, 'Lambert must expose five abilities');
    equal(actions.filter((action) => action.source === 'item').length, 4, 'Lambert must expose four selectable items');
    equal(
      actions.some((action) => action.sourceId === 'investment-bow'),
      false,
      'Investment Bow must remain the default attack instead of duplicating the item arc',
    );

    let events = appendCommand([start], 'lambert-double-shot-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', ...enemyIds],
    }]);
    let state = replay(events);
    const doubleShot = getAction('lambert-double-shot');
    events = appendCommand(events, 'lambert-double-shot-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      doubleShot.id,
    ));
    state = replay(events);
    const doubleShotAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'lambert',
      enemyIds[0],
      10,
    );
    ok(doubleShotAttack, 'Double Shot must replace Lambert\'s attack');
    const doubleShotEvent = doubleShotAttack.find((event) => event.type === 'combat-attack-resolved');
    equal(doubleShotEvent.attack.damageExpression, '1d8+4', 'Double Shot must split its damage when another enemy is available');
    equal(doubleShotEvent.attack.secondaryTargetId, enemyIds[1], 'Double Shot must automatically acquire a second living enemy');
    equal(doubleShotEvent.attack.bonus, 6, 'Double Shot must keep Lambert\'s +6 attack bonus');

    events = appendCommand([start], 'lambert-sacrifice-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', 'linda', ...enemyIds],
    }]);
    state = replay(events);
    const sacrifice = getAction('lambert-sacrifice');
    events = appendCommand(events, 'lambert-sacrifice-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      sacrifice.id,
    ));
    state = replay(events);
    const sacrificeView = createArenaView(state, encounter, 'linda');
    equal(sacrificeView.selectedHeroTargetId, 'linda', 'manual ally selection must be preserved at full HP');
    equal(
      sacrificeView.supportTargets.some((target) => target.id === 'lambert'),
      false,
      'selected-ally actions must not offer their source as a target',
    );
    equal(
      combatCommands.createUseCombatActionCommand(combatContext(state), sacrifice.id, 'lambert'),
      null,
      'Sacrifice must reject Lambert as his own selected ally',
    );
    const woundedElsewhereState = replay(appendCommand(events, 'lambert-target-preservation', [{
      type: 'manual-adjustment',
      label: 'Торин HP → 1',
      reason: 'Проверка ручного выбора союзника.',
      adjustment: {kind: 'participant-stat', participantId: 'thorin-pukoshchit', field: 'hp', value: 1},
    }]));
    equal(
      createArenaView(woundedElsewhereState, encounter, 'linda').selectedHeroTargetId,
      'linda',
      'a more wounded ally must not override the manually selected target',
    );
    const downedTargetState = replay(appendCommand(events, 'lambert-downed-target', [{
      type: 'manual-adjustment',
      label: 'Торин HP → 0',
      reason: 'Проверка недоступной цели усиления.',
      adjustment: {kind: 'participant-stat', participantId: 'thorin-pukoshchit', field: 'hp', value: 0},
    }]));
    notEqual(
      createArenaView(downedTargetState, encounter, 'thorin-pukoshchit').selectedHeroTargetId,
      'thorin-pukoshchit',
      'a downed participant must not remain selected for a non-healing ally buff',
    );
    const sacrificeUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      sacrifice.id,
      'linda',
    );
    ok(sacrificeUse, 'Sacrifice must accept a living ally');
    events = appendCommand(events, 'lambert-sacrifice-use', sacrificeUse);
    state = replay(events);
    ok(
      state.combat.statuses.some((status) => status.kind === 'commanded-strike' && status.targetId === 'linda'),
      'Sacrifice must place the visible commanded-strike status on Linda',
    );
    equal(state.combat.initiativeOrder[state.combat.turnIndex], 'linda', 'Sacrifice must hand the turn to Linda');
    const inspiredAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'linda',
      enemyIds[0],
      10,
    );
    ok(inspiredAttack, 'the inspired ally must be able to attack');
    equal(
      inspiredAttack.find((event) => event.type === 'combat-attack-resolved').attack.rollMode,
      'advantage',
      'Sacrifice must grant advantage to Linda\'s next attack',
    );

    events = appendCommand([start], 'lambert-sarcasm-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    const sarcasm = getAction('lambert-sarcasm');
    events = appendCommand(events, 'lambert-sarcasm-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      sarcasm.id,
    ));
    state = replay(events);
    const sarcasmView = createArenaView(state, encounter, 'linda');
    equal(
      sarcasmView.actions.find((action) => action.id === sarcasm.id)?.rollOwnerLabel,
      'Мастер за всех противников · один общий d20',
      'Sarcasm must identify the master as the shared-save roller',
    );
    ok(
      sarcasmView.actions.find((action) => action.id === sarcasm.id)?.effectLabel.includes('перепутал цель'),
      'Sarcasm HUD must describe its actual failed-save status',
    );
    const sarcasmUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      sarcasm.id,
      undefined,
      1,
    );
    ok(sarcasmUse, 'Sarcasm must resolve a failed shared Wisdom save');
    const sarcasmLog = sarcasmUse.find((event) => event.type === 'combat-log-added')?.text ?? '';
    ok(sarcasmLog.includes('перепутал цель'), 'Sarcasm log must describe target confusion');
    equal(sarcasmLog.includes('падают'), false, 'Sarcasm log must not claim that enemies fall');
    state = replay(appendCommand(events, 'lambert-sarcasm-use', sarcasmUse));
    enemyIds.forEach((enemyId) => ok(
      state.combat.statuses.some((status) => status.kind === 'confused' && status.targetId === enemyId),
      `${enemyId} must receive a visible confused status from Sarcasm`,
    ));

    events = appendCommand([start], 'lambert-hacker-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', ...enemyIds],
    }]);
    state = replay(events);
    const hackerPulse = getAction('lambert-hacker-pulse-guards');
    events = appendCommand(events, 'lambert-hacker-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      hackerPulse.id,
    ));
    state = replay(events);
    const hackerUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      hackerPulse.id,
      enemyIds[0],
    );
    ok(hackerUse, 'Hacker Pulse must target a living enemy');
    state = replay(appendCommand(events, 'lambert-hacker-use', hackerUse));
    const jammed = state.combat.statuses.find((status) => (
      status.kind === 'jammed' && status.targetId === enemyIds[0]
    ));
    equal(jammed?.charges, 2, 'Hacker Pulse must visibly track two jammed attacks');
    ok(
      createArenaView(state, encounter, 'linda').enemyTargets
        .find((enemy) => enemy.id === enemyIds[0])?.effects
        ?.some((effect) => effect.shortLabel === 'Сбой ×2'),
      'Hacker Pulse charges must be exposed in the enemy HUD',
    );
  });

  await scenario('Golovach Lena combat kit: fire attack, self buff and restorative items', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const actions = definition.combatActions.filter((action) => (
      action.characterId === 'golovach-lena' && action.encounterIds.includes(encounter.id)
    ));
    equal(actions.filter((action) => action.source === 'ability').length, 5, 'Golovach must expose five abilities');
    equal(actions.filter((action) => action.source === 'item').length, 4, 'Golovach must expose four selectable items');
    equal(
      actions.some((action) => action.sourceId === 'fire-fists'),
      false,
      'Fire Fists must remain the default attack instead of duplicating the item arc',
    );

    let events = appendCommand([start], 'lena-breath-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    let state = replay(events);
    const breath = getAction('lena-buldak-breath');
    events = appendCommand(events, 'lena-breath-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      breath.id,
    ));
    state = replay(events);
    const breathUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      breath.id,
      enemyIds[0],
      7,
    );
    ok(breathUse, 'Buldak Breath must execute as a two-target area action');
    equal(
      breathUse.filter((event) => event.type === 'combat-damage-resolved').length,
      0,
      'Buldak Breath must wait for explicit target saves instead of resolving hidden RNG',
    );
    equal(
      breathUse.filter((event) => event.type === 'combat-saving-throw-requested').length,
      1,
      'Buldak Breath must stage the first target save in the combat journal',
    );
    events = appendCommand(events, 'lena-breath-use', breathUse);
    state = replay(events);
    equal(state.combat.pendingSavingThrow?.kind, 'area-damage-save', 'first Buldak target must receive an explicit d20 save');
    equal(state.combat.pendingSavingThrow?.targetId, enemyIds[0], 'selected Buldak target must save first');
    equal(state.combat.pendingSavingThrow?.areaDamage?.damage, 10, 'the explicit 2d6 result must be frozen with +3 damage');
    equal(
      combatCommands.createResolveCombatSavingThrowCommand(combatContext(state)),
      null,
      'Buldak target saves must reject an omitted roll instead of using hidden RNG',
    );
    const failedBreathSave = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
    ok(failedBreathSave, 'first Buldak target must resolve an explicit failed save');
    events = appendCommand(events, 'lena-breath-save-one', failedBreathSave);
    state = replay(events);
    equal(state.combat.enemies[enemyIds[0]].hp, encounter.hp - 10, 'failed Buldak save must apply full damage');
    equal(state.combat.pendingSavingThrow?.kind, 'area-damage-status', 'failed living target must stage its burning d4');
    const breathBurning = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 3);
    ok(breathBurning, 'Buldak burning duration must accept an explicit d4 result');
    events = appendCommand(events, 'lena-breath-burning', breathBurning);
    state = replay(events);
    equal(state.combat.pendingSavingThrow?.targetId, enemyIds[1], 'Buldak must continue to the second living target');
    equal(
      state.combat.statuses.find((status) => status.kind === 'burning' && status.targetId === enemyIds[0])?.amount,
      3,
      'explicit Buldak d4 must be persisted as burning damage',
    );
    const successfulBreathSave = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 20);
    ok(successfulBreathSave, 'second Buldak target must resolve an explicit successful save');
    events = appendCommand(events, 'lena-breath-save-two', successfulBreathSave);
    state = replay(events);
    equal(state.combat.enemies[enemyIds[1]].hp, encounter.hp - 5, 'successful Buldak save must apply half damage');
    equal(state.combat.pendingSavingThrow, null, 'Buldak staged sequence must finish after the second target');
    equal(state.combat.enemies[enemyIds[0]].hp, encounter.hp - 13, 'burning must resolve through turn-start damage after the staged sequence');
    equal(
      breath.effects.find((effect) => effect.type === 'area-damage')?.savingThrow.dc,
      13,
      'Buldak Breath must keep its DC 13 Dexterity save',
    );

    events = appendCommand([start], 'lena-crisis-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    state = replay(events);
    const creativeCrisis = getAction('lena-creative-crisis');
    events = appendCommand(events, 'lena-crisis-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      creativeCrisis.id,
    ));
    state = replay(events);
    const crisisUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      creativeCrisis.id,
      'golovach-lena',
      2,
    );
    ok(crisisUse, 'Creative Crisis must succeed on 2');
    events = appendCommand(events, 'lena-crisis-use', crisisUse);
    state = replay(events);
    equal(state.combat.initiativeOrder[state.combat.turnIndex], enemyIds[0], 'Creative Crisis must end Lena turn');
    equal(state.combat.attackModifiers[0].targetIds[0], 'golovach-lena', 'Creative Crisis must buff Golovach himself');
    equal(state.combat.attackModifiers[0].amount, 2, 'Creative Crisis result 2 must grant +2 to attack');
    ok(
      state.combat.statuses.some((status) => status.kind === 'bonus-damage' && status.targetId === 'golovach-lena'),
      'Creative Crisis result 2 must visibly grant its +1d4 damage status',
    );
    equal(combatCommands.createHeroAttackCommand(combatContext(state), 'golovach-lena', enemyIds[0], 10), null, 'no extra attack after Creative Crisis');
    for (const enemyId of enemyIds) {
      events = appendCommand(events, `crisis-enemy-${enemyId}`, combatCommands.createEnemyAttackCommand(combatContext(state), 'golovach-lena', 1));
      state = replay(events);
    }
    const crisisAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'golovach-lena',
      enemyIds[0],
      10,
    );
    ok(crisisAttack, 'Golovach must be able to attack on his next turn');
    equal(
      crisisAttack.find((event) => event.type === 'combat-attack-resolved').attack.bonus,
      8,
      'Creative Crisis result 2 must add +2 to Golovach\'s next attack',
    );
    deepEqual(
      crisisAttack.find((event) => event.type === 'combat-attack-resolved').attack.bonusDamageDice,
      [{expression: '1d4', label: 'Дополнительный урон'}],
      'Creative Crisis bonus damage must remain an explicit player roll',
    );

    events = appendCommand([start], 'lena-crisis-four-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    state = replay(events);
    events = appendCommand(events, 'lena-crisis-four-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      creativeCrisis.id,
    ));
    state = replay(events);
    const crisisFourUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      creativeCrisis.id,
      'golovach-lena',
      4,
    );
    ok(crisisFourUse, 'Creative Crisis must resolve its 4–5 outcome');
    state = replay(appendCommand(events, 'lena-crisis-four-use', crisisFourUse));
    ok(
      state.combat.statuses.some((status) => status.kind === 'attack-advantage' && status.targetId === 'golovach-lena'),
      'Creative Crisis 4–5 must retain visible attack advantage',
    );
    ok(
      state.combat.statuses.some((status) => status.kind === 'bonus-damage' && status.targetId === 'golovach-lena'),
      'Creative Crisis 4–5 must retain visible bonus damage at the same time',
    );

    events = appendCommand([start], 'lena-noodles-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    state = replay(events);
    const noodles = getAction('lena-buldak-noodles');
    const equipNoodles = combatCommands.createEquipCombatItemCommand(combatContext(state), noodles.id);
    ok(equipNoodles, 'Buldak Noodles must be equippable');
    events = appendCommand(events, 'lena-noodles-equip', equipNoodles);
    state = replay(events);
    const fullHpNoodlesUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      noodles.id,
      'golovach-lena',
    );
    ok(fullHpNoodlesUse, 'Buldak Noodles must remain usable at full HP because they also grant a buff');
    state = replay(appendCommand(events, 'lena-noodles-use', fullHpNoodlesUse));
    equal(state.heroHp['golovach-lena'], 42, 'Buldak Noodles must not overheal past maximum HP');
    equal(state.combat.attackModifiers[0].amount, 2, 'Buldak Noodles must grant +2 to the next attack');

    const nameStory = getAction('lena-name-story');
    equal(nameStory.effects[0].type, 'apply-status', 'Name Story must use a visible inspiration status');
    equal(nameStory.effects[0].status, 'inspired', 'Name Story must grant a d20 reroll');
    events = appendCommand([start], 'lena-name-story-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', 'linda', ...enemyIds],
    }]);
    state = replay(events);
    events = appendCommand(events, 'lena-name-story-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      nameStory.id,
    ));
    state = replay(events);
    const nameStoryUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      nameStory.id,
      'linda',
    );
    ok(nameStoryUse, 'Name Story must execute against a manually selected living ally');
    state = replay(appendCommand(events, 'lena-name-story-use', nameStoryUse));
    ok(
      state.combat.statuses.some((status) => status.kind === 'inspired' && status.targetId === 'linda'),
      'Name Story runtime must apply inspiration only to Linda',
    );
    ok(
      createArenaView(state, encounter, 'linda').party.find((hero) => hero.id === 'linda')?.effects
        ?.some((effect) => effect.shortLabel === 'Вдохновение'),
      'Name Story inspiration must be visible in the party HUD',
    );
    const surveillance = getAction('lena-video-surveillance-guards');
    equal(surveillance.effects[0].type, 'apply-status', 'Video Surveillance must apply a visible surveillance status');
    equal(surveillance.effects[0].status, 'surveilled', 'Video Surveillance must force the next enemy attack reroll');
  });

  await scenario('Thorin combat kit: shared debuff, second wind, protection and healing', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const actions = definition.combatActions.filter((action) => (
      action.characterId === 'thorin-pukoshchit' && action.encounterIds.includes(encounter.id)
    ));
    equal(actions.filter((action) => action.source === 'ability').length, 5, 'Thorin must expose five abilities');
    equal(actions.filter((action) => action.source === 'item').length, 4, 'Thorin must expose four selectable items');
    equal(
      actions.some((action) => action.sourceId === 'worker-hammer'),
      false,
      'Worker Hammer must remain the default attack instead of duplicating the item arc',
    );

    let events = appendCommand([start], 'thorin-second-wind-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', ...enemyIds],
    }, {
      type: 'manual-adjustment',
      label: 'Торин HP → 20',
      reason: 'Проверка второго дыхания.',
      adjustment: {kind: 'participant-stat', participantId: 'thorin-pukoshchit', field: 'hp', value: 20},
    }, {
      type: 'combat-condition-changed',
      participantId: 'thorin-pukoshchit',
      condition: 'blinded',
      active: true,
      text: 'Тестовое ослепление Торина.',
    }]);
    let state = replay(events);
    const secondWind = getAction('thorin-work-until-pulse-drops');
    events = appendCommand(events, 'thorin-second-wind-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      secondWind.id,
    ));
    state = replay(events);
    const secondWindUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      secondWind.id,
      'thorin-pukoshchit',
    );
    ok(secondWindUse, 'Work Until Pulse Drops must be usable');
    state = replay(appendCommand(events, 'thorin-second-wind-use', secondWindUse));
    equal(state.heroHp['thorin-pukoshchit'], 28, 'second wind must restore 8 HP');
    deepEqual(state.combat.conditions['thorin-pukoshchit'], [], 'second wind must remove negative combat conditions');
    equal(state.combat.initiativeOrder[state.combat.turnIndex], enemyIds[0], 'second wind must end Thorin turn');
    ok(
      state.combat.statuses.some((status) => status.kind === 'last-push' && status.targetId === 'thorin-pukoshchit'),
      'second wind must visibly protect Thorin from dropping below 1 HP until his next turn',
    );

    events = appendCommand([start], 'thorin-smile-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', 'linda', ...enemyIds],
    }]);
    state = replay(events);
    const smile = getAction('thorin-hypnotic-smile');
    events = appendCommand(events, 'thorin-smile-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      smile.id,
    ));
    state = replay(events);
    const smileUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      smile.id,
      enemyIds[0],
      1,
    );
    ok(smileUse, 'Hypnotic Smile must resolve a failed save for the selected enemy');
    state = replay(appendCommand(events, 'thorin-smile-use', smileUse));
    ok(
      state.combat.conditions[enemyIds[0]]?.includes('stunned'),
      'the failed Hypnotic Smile target must visibly be marked to skip its next action',
    );
    enemyIds.slice(1).forEach((enemyId) => equal(
      state.combat.conditions[enemyId]?.includes('stunned') ?? false,
      false,
      `${enemyId} must not be affected by the single-target smile`,
    ));

    events = appendCommand([start], 'thorin-bag-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', 'linda', ...enemyIds],
    }]);
    state = replay(events);
    const bag = getAction('thorin-seven-job-bag');
    const equipBag = combatCommands.createEquipCombatItemCommand(combatContext(state), bag.id);
    ok(equipBag, 'Seven Job Bag must be equippable');
    events = appendCommand(events, 'thorin-bag-equip', equipBag);
    state = replay(events);
    const bagSelectionView = createArenaView(state, encounter, 'linda');
    ok(
      bagSelectionView.actions.find((action) => action.id === bag.id)?.effectLabel
        .includes('Выбранному союзнику +2 AC'),
      'Seven Job Bag HUD must describe a single selected ally',
    );
    const bagUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      bag.id,
      'linda',
    );
    ok(bagUse, 'Seven Job Bag must target a living ally');
    state = replay(appendCommand(events, 'thorin-bag-use', bagUse));
    equal(state.combat.acModifiers[0].amount, 2, 'Seven Job Bag must grant +2 AC');
    deepEqual(state.combat.acModifiers[0].targetIds, ['linda'], 'Seven Job Bag must protect only the selected ally');
    equal(
      createArenaView(state, encounter, 'linda').party.find((participant) => participant.id === 'linda')?.ac,
      12,
      'Seven Job Bag AC bonus must be visible in the HUD',
    );

    events = appendCommand([start], 'thorin-summon-target-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', ...enemyIds],
    }, {
      type: 'combat-allies-summoned',
      allies: [{
        id: 'test-ice-guard',
        ownerId: 'bubsilda',
        name: 'Ледяной Страж I',
        hp: 10,
        maxHp: 10,
        ac: 12,
        initiative: 0,
        attack: {name: 'Ледяное копьё', bonus: 4, damage: '1d6+2'},
        expiresAfterRound: 3,
      }],
      text: 'Тестовый союзник призван.',
    }]);
    state = replay(events);
    const equipBagForSummon = combatCommands.createEquipCombatItemCommand(combatContext(state), bag.id);
    ok(equipBagForSummon, 'Seven Job Bag must remain equippable while a summon is present');
    events = appendCommand(events, 'thorin-summon-target-equip', equipBagForSummon);
    state = replay(events);
    const bagSummonUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      bag.id,
      'test-ice-guard',
    );
    ok(bagSummonUse, 'Seven Job Bag must accept a living summoned ally');
    state = replay(appendCommand(events, 'thorin-summon-target-use', bagSummonUse));
    deepEqual(state.combat.acModifiers[0].targetIds, ['test-ice-guard'], 'AC buff must target the selected summon');

    events = appendCommand([start], 'thorin-ration-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', 'linda', ...enemyIds],
    }, {
      type: 'manual-adjustment',
      label: 'Линда HP → 10',
      reason: 'Проверка перекуса.',
      adjustment: {kind: 'participant-stat', participantId: 'linda', field: 'hp', value: 10},
    }]);
    state = replay(events);
    const ration = getAction('thorin-ration-pouch');
    const equipRation = combatCommands.createEquipCombatItemCommand(combatContext(state), ration.id);
    ok(equipRation, 'Ration Pouch must be equippable');
    events = appendCommand(events, 'thorin-ration-equip', equipRation);
    state = replay(events);
    const rationUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      ration.id,
      'linda',
      5,
    );
    ok(rationUse, 'Ration Pouch must heal a selected ally');
    state = replay(appendCommand(events, 'thorin-ration-use', rationUse));
    equal(state.heroHp.linda, 15, 'Ration Pouch must apply the provided 1d8 result');

    const shiftBell = getAction('thorin-shift-bell');
    equal(shiftBell.effects[0].type, 'area-saving-throw', 'Shift Bell must use the supported shared save');
    events = appendCommand([start], 'thorin-shift-bell-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    const equipShiftBell = combatCommands.createEquipCombatItemCommand(combatContext(state), shiftBell.id);
    ok(equipShiftBell, 'Shift Bell must be equippable');
    events = appendCommand(events, 'thorin-shift-bell-equip', equipShiftBell);
    state = replay(events);
    const shiftBellUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      shiftBell.id,
      undefined,
      1,
    );
    ok(shiftBellUse, 'Shift Bell must execute its shared save');
    const shiftBellLog = shiftBellUse.find((event) => event.type === 'combat-log-added')?.text ?? '';
    ok(shiftBellLog.includes('помеха на следующую атаку'), 'Shift Bell log must describe attack disadvantage');
    state = replay(appendCommand(events, 'thorin-shift-bell-use', shiftBellUse));
    enemyIds.forEach((enemyId) => ok(
      state.combat.conditions[enemyId]?.includes('attack-disadvantage'),
      `${enemyId} must receive attack disadvantage from Shift Bell`,
    ));
    const needle = getAction('thorin-needle-guards');
    equal(needle.effects[0].type, 'apply-status', 'Needle in a Haystack must apply a visible opening status');
    equal(needle.effects[0].status, 'critical-opening', 'Needle in a Haystack must make the next hit critical and ignore armor');
  });

  await scenario('every ordinary combat action exposes a readable HUD contract', () => {
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    let visibleActionCount = 0;

    for (const hero of heroes) {
      const start = createStartEvent();
      const state = replay(appendCommand([start], `hud-contract-${hero.id}`, [{
        type: 'combat-started',
        encounterId: encounter.id,
        initiativeOrder: [hero.id, ...enemyIds],
      }]));
      const view = createArenaView(state, encounter, hero.id);
      ok(view, `${hero.name} combat view must exist`);
      const expectedActions = definition.combatActions.filter((action) => (
        action.characterId === hero.id && action.encounterIds.includes(encounter.id)
      ));
      equal(view.actions.length, expectedActions.length, `${hero.name} HUD must expose every canonical combat action`);
      visibleActionCount += view.actions.length;

      expectedActions.forEach((action) => {
        const actionView = view.actions.find((candidate) => candidate.id === action.id);
        ok(actionView, `${action.name} must exist in the HUD`);
        ok(actionView.description.trim().length >= 20, `${action.name} must have a meaningful on-screen description`);
        ok(actionView.effectLabel.trim().length > 0, `${action.name} must expose a concise mechanical result`);
        ok(actionView.mechanicsHelp.entries.length > 0, `${action.name} must expose mechanics help`);
        actionView.mechanicsHelp.entries.forEach((entry) => {
          ok(entry.term.trim().length > 0, `${action.name} mechanics term must be readable`);
          ok(entry.description.trim().length >= 20, `${action.name} mechanics explanation must be explicit`);
        });
        if (action.effects.some((effect) => effect.type === 'roll-table')) {
          ok(actionView.effectRows?.length, `${action.name} must show every roll-table outcome before use`);
        }
        if (action.effects.some((effect) => effect.type === 'area-saving-throw')) {
          ok(
            actionView.rollOwnerLabel?.startsWith('Мастер'),
            `${action.name} must clearly identify the master as the enemy-save roller`,
          );
        }
        if (action.effects.some((effect) => effect.type === 'area-damage')) {
          ok(
            actionView.effectLabel.includes('спасбросок'),
            `${action.name} must mention the separate target save in its concise result`,
          );
          ok(
            actionView.mechanicsHelp.entries.some((entry) => entry.term === 'Спасбросок от урона'),
            `${action.name} must explain that every target saves separately`,
          );
        }
      });
    }

    const mirrorEncounter = getEncounter('dressing-room-mirror-doubles');
    const mirrorEnemyIds = mirrorEncounter.units.map((unit) => unit.id);
    let mirrorEvents = appendCommand([createStartEvent()], 'mirror-hud-contract', [{
      type: 'combat-started',
      encounterId: mirrorEncounter.id,
      initiativeOrder: ['linda', ...mirrorEnemyIds],
    }]);
    let mirrorState = replay(mirrorEvents);
    const mirrorAction = getAction('linda-break-mirror-angle');
    const mirrorView = createArenaView(mirrorState, mirrorEncounter, 'linda');
    const mirrorActionView = mirrorView.actions.find((action) => action.id === mirrorAction.id);
    ok(mirrorActionView, 'Linda mirror-only action must be exposed in its encounter HUD');
    ok(mirrorActionView.description.trim().length >= 20, 'mirror-only action must retain a readable description');
    ok(mirrorActionView.mechanicsHelp.entries.length > 0, 'mirror-only action must expose mechanics help');
    visibleActionCount += 1;

    mirrorEvents = appendCommand(mirrorEvents, 'mirror-action-select', combatCommands.createSelectCombatActionCommand(
      combatContext(mirrorState),
      mirrorAction.id,
    ));
    mirrorState = replay(mirrorEvents);
    const mirrorUse = combatCommands.createUseCombatActionCommand(
      combatContext(mirrorState),
      mirrorAction.id,
      mirrorEnemyIds[0],
    );
    ok(mirrorUse, 'Linda mirror-only action must execute against a living double');
    mirrorState = replay(appendCommand(mirrorEvents, 'mirror-action-use', mirrorUse));
    equal(
      mirrorState.combat.statuses.find((status) => status.kind === 'resonance' && status.targetId === mirrorEnemyIds[0])?.charges,
      2,
      'Linda mirror-only action must apply both resonance charges',
    );

    equal(visibleActionCount, 48, 'all 48 playable combat actions must be covered across their encounter HUDs');
    equal(
      definition.combatActions.filter((action) => action.encounterIds.length === 0).length,
      3,
      'three compatibility-only archive actions must remain hidden from every encounter',
    );
  });

  await scenario('Bubsilda passives, documentary marks and defensive item resolve mechanically', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);

    let events = appendCommand([start], 'bubsilda-passive-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', ...enemyIds],
    }, {
      type: 'combat-condition-changed',
      participantId: 'bubsilda',
      condition: 'prone',
      active: true,
    }]);
    let state = replay(events);
    equal(state.combat.conditions.bubsilda?.includes('prone') ?? false, false, 'Bubis Balance must cancel prone');
    ok(
      state.combat.statuses.some((status) => status.kind === 'attack-advantage' && status.targetId === 'bubsilda'),
      'prevented prone must grant Bubsilda attack advantage',
    );
    events = appendCommand(events, 'bubsilda-ward-trigger', [{
      type: 'combat-condition-changed',
      participantId: 'bubsilda',
      condition: 'blinded',
      active: true,
    }]);
    state = replay(events);
    equal(state.combat.conditions.bubsilda?.includes('blinded') ?? false, false, 'Northern Ward must cancel first control');
    equal(
      state.combat.statuses.find((status) => status.kind === 'temporary-hp' && status.targetId === 'bubsilda')?.amount,
      4,
      'Northern Ward must grant four temporary HP after cancelling control',
    );
    events = appendCommand(events, 'bubsilda-second-control', [{
      type: 'combat-condition-changed',
      participantId: 'bubsilda',
      condition: 'blinded',
      active: true,
    }]);
    state = replay(events);
    equal(state.combat.conditions.bubsilda?.includes('blinded'), true, 'second control effect must apply after the ward is spent');

    events = appendCommand([start], 'documentary-runtime-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', 'linda', 'lambert', ...enemyIds],
    }]);
    state = replay(events);
    const documentary = getAction('bubsilda-documentary-guards');
    events = appendCommand(events, 'documentary-runtime-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      documentary.id,
    ));
    state = replay(events);
    const documentaryUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      documentary.id,
      enemyIds[0],
    );
    ok(documentaryUse, 'Documentary must be usable against the selected living enemy');
    events = appendCommand(events, 'documentary-runtime-use', documentaryUse);
    state = replay(events);
    let studied = state.combat.statuses.find((status) => status.kind === 'studied-target');
    equal(studied?.charges, 2, 'Documentary must create two marks');
    for (const heroId of ['linda', 'lambert']) {
      const attack = combatCommands.createHeroAttackCommand(combatContext(state), heroId, enemyIds[0], 10);
      ok(attack, `${heroId} must be able to consume a Documentary mark`);
      deepEqual(
        attack.find((event) => event.type === 'combat-attack-resolved').attack.bonusDamageDice,
        [{expression: '1d4', label: 'Изученная цель'}],
        'each different hero must explicitly roll the Documentary bonus d4',
      );
      events = appendCommand(events, `documentary-${heroId}-attack`, attack);
      state = replay(events);
      const damage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 2);
      ok(damage, `${heroId} Documentary hit must accept explicit damage dice`);
      events = appendCommand(events, `documentary-${heroId}-damage`, damage.events);
      state = replay(events);
      studied = state.combat.statuses.find((status) => status.kind === 'studied-target');
    }
    equal(studied, undefined, 'both Documentary marks must be consumed after two different heroes hit');

    events = appendCommand([start], 'ice-heart-runtime-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', enemyIds[0]],
    }]);
    state = replay(events);
    const baseAc = combatRules.getCombatHeroAc(state.combat, state.heroSources.find((hero) => hero.id === 'bubsilda'));
    const iceHeart = getAction('bubsilda-ice-heart');
    events = appendCommand(events, 'ice-heart-runtime-equip', combatCommands.createEquipCombatItemCommand(
      combatContext(state),
      iceHeart.id,
    ));
    state = replay(events);
    const iceHeartUse = combatCommands.createUseCombatActionCommand(combatContext(state), iceHeart.id, 'bubsilda');
    ok(iceHeartUse, 'Ice Heart must be usable as an action');
    events = appendCommand(events, 'ice-heart-runtime-use', iceHeartUse);
    state = replay(events);
    equal(
      combatRules.getCombatHeroAc(state.combat, state.heroSources.find((hero) => hero.id === 'bubsilda')),
      baseAc + 2,
      'Ice Heart must increase Bubsilda AC by two',
    );
    const bubsildaMiss = combatCommands.createHeroAttackCommand(combatContext(state), 'bubsilda', enemyIds[0], 1);
    equal(bubsildaMiss, null, 'Ice Heart ends the turn and prevents an extra attack');
    const enemyMiss = combatCommands.createEnemyAttackCommand(combatContext(state), 'bubsilda', 1);
    ok(enemyMiss, 'enemy must be able to finish its turn');
    state = replay(appendCommand(events, 'ice-heart-enemy-miss', enemyMiss));
    equal(
      combatRules.getCombatHeroAc(state.combat, state.heroSources.find((hero) => hero.id === 'bubsilda')),
      baseAc,
      'Ice Heart AC bonus must expire exactly at the start of Bubsilda next turn',
    );
  });

  await scenario('Linda missing kit paths: size, summons, blind and reserve healing', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const lindaSource = heroes.find((hero) => hero.id === 'linda');
    ok(lindaSource, 'Linda source must exist');

    let events = appendCommand([start], 'linda-size-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', enemyIds[0]],
    }]);
    let state = replay(events);
    const baseAc = combatRules.getCombatHeroAc(state.combat, lindaSource);
    const baseAttackModifier = combatRules.getCombatAttackBonusModifier(state.combat, 'linda', enemyIds[0]);
    const tinySize = getAction('linda-tiny-size');
    events = appendCommand(events, 'linda-size-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      tinySize.id,
    ));
    state = replay(events);
    const becomeTiny = combatCommands.createUseCombatActionCommand(combatContext(state), tinySize.id, 'linda');
    ok(becomeTiny, 'Linda must be able to enter tiny form');
    events = appendCommand(events, 'linda-size-use', becomeTiny);
    state = replay(events);
    equal(state.combat.initiativeOrder[state.combat.turnIndex], 'linda', 'tiny form must remain a bonus action');
    equal(combatRules.getCombatHeroAc(state.combat, lindaSource), baseAc + 3, 'tiny form must grant +3 AC');
    equal(
      combatRules.getCombatAttackBonusModifier(state.combat, 'linda', enemyIds[0]),
      baseAttackModifier - 2,
      'tiny form must apply −2 to Linda attacks',
    );
    events = appendCommand(events, 'linda-size-miss', combatCommands.createHeroAttackCommand(
      combatContext(state),
      'linda',
      enemyIds[0],
      1,
    ));
    state = replay(events);
    events = appendCommand(events, 'linda-size-enemy-miss', combatCommands.createEnemyAttackCommand(
      combatContext(state),
      'linda',
      1,
    ));
    state = replay(events);
    events = appendCommand(events, 'linda-size-return-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      tinySize.id,
    ));
    state = replay(events);
    const returnToNormal = combatCommands.createUseCombatActionCommand(combatContext(state), tinySize.id, 'linda');
    ok(returnToNormal, 'Linda must be able to leave tiny form on her next turn');
    state = replay(appendCommand(events, 'linda-size-return', returnToNormal));
    equal(combatRules.getCombatHeroAc(state.combat, lindaSource), baseAc, 'returning to normal must remove tiny AC');
    ok(
      state.combat.statuses.some((status) => status.kind === 'attack-advantage' && status.targetId === 'linda'),
      'returning to normal must grant advantage to the next attack',
    );

    events = appendCommand([start], 'pitahaya-summon-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', ...enemyIds],
    }]);
    state = replay(events);
    const summon = getAction('linda-pitahaya-summon');
    events = appendCommand(events, 'pitahaya-summon-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      summon.id,
    ));
    state = replay(events);
    const summonUse = combatCommands.createUseCombatActionCommand(combatContext(state), summon.id, 'linda', 2);
    ok(summonUse, 'Pitahaya summon must accept an explicit 1d4 result');
    events = appendCommand(events, 'pitahaya-summon-use', summonUse);
    state = replay(events);
    const summonedIds = Object.keys(state.combat.allies);
    equal(summonedIds.length, 2, 'explicit summon roll of two must create two pitahayanoids');
    deepEqual(
      state.combat.initiativeOrder.slice(1, 3),
      summonedIds,
      'all summoned pitahayanoids must enter initiative directly after Linda',
    );
    equal(state.combat.initiativeOrder[state.combat.turnIndex], summonedIds[0], 'first summon must act immediately');
    const summonAttack = combatCommands.createSummonedAllyAttackCommand(
      combatContext(state),
      summonedIds[0],
      enemyIds[0],
      20,
    );
    ok(summonAttack, 'summoned pitahayanoid must receive its own attack turn');
    events = appendCommand(events, 'pitahaya-summon-attack', summonAttack);
    state = replay(events);
    const summonDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 2);
    ok(summonDamage, 'summoned critical hit must accept an explicit damage total');
    events = appendCommand(events, 'pitahaya-summon-damage', summonDamage.events);
    state = replay(events);
    ok(state.combat.pendingSavingThrow, 'pitahaya bite must request its on-hit Constitution save');
    const failedBiteSave = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
    ok(failedBiteSave, 'pitahaya bite save must resolve explicitly');
    events = appendCommand(events, 'pitahaya-summon-save', failedBiteSave);
    state = replay(events);
    equal(
      state.combat.conditions[enemyIds[0]]?.includes('attack-disadvantage'),
      true,
      'failed pitahaya bite save must impose attack disadvantage',
    );
    equal(state.combat.initiativeOrder[state.combat.turnIndex], summonedIds[1], 'second summon must keep its own queue slot');
    let safety = 0;
    while (state.combat.round < 4 && safety < 30) {
      events = appendCommand(events, `pitahaya-expiry-${safety}`, [{type: 'turn-advanced'}]);
      state = replay(events);
      safety += 1;
    }
    equal(state.combat.round, 4, 'summon expiry fixture must reach round four');
    equal(
      Object.values(state.combat.allies).some((ally) => combatRules.isCombatAllyActive(state.combat, ally.id)),
      false,
      'three-round summons must no longer be active in round four',
    );
    equal(
      createArenaView(state, encounter, 'linda').participants.some((participant) => summonedIds.includes(participant.id)),
      false,
      'expired summons must disappear from the visible initiative rail',
    );

    events = appendCommand([start], 'blinding-pollen-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', ...enemyIds],
    }]);
    state = replay(events);
    const blindingPollen = getAction('linda-blinding-pollen');
    events = appendCommand(events, 'blinding-pollen-equip', combatCommands.createEquipCombatItemCommand(
      combatContext(state),
      blindingPollen.id,
    ));
    state = replay(events);
    const pollenAttack = combatCommands.createHeroAttackCommand(combatContext(state), 'linda', enemyIds[0], 20);
    ok(pollenAttack, 'Blinding Pollen must replace Linda default attack');
    events = appendCommand(events, 'blinding-pollen-hit', pollenAttack);
    state = replay(events);
    const pollenDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 2);
    ok(pollenDamage, 'Blinding Pollen hit must accept explicit damage');
    events = appendCommand(events, 'blinding-pollen-damage', pollenDamage.events);
    state = replay(events);
    ok(state.combat.pendingSavingThrow, 'Blinding Pollen must request a save after a surviving hit');
    const pollenSave = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
    ok(pollenSave, 'Blinding Pollen save must resolve');
    state = replay(appendCommand(events, 'blinding-pollen-save', pollenSave));
    equal(state.combat.conditions[enemyIds[0]]?.includes('blinded'), true, 'failed Pollen save must blind the target');

    events = appendCommand([start], 'pitahaya-reserve-start', [{
      type: 'manual-adjustment',
      label: 'Линда HP → 10',
      reason: 'Проверка запаса питахайи.',
      adjustment: {kind: 'participant-stat', participantId: 'linda', field: 'hp', value: 10},
    }, {
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['linda', ...enemyIds],
    }]);
    state = replay(events);
    const reserve = getAction('linda-pitahaya-reserve');
    events = appendCommand(events, 'pitahaya-reserve-equip', combatCommands.createEquipCombatItemCommand(
      combatContext(state),
      reserve.id,
    ));
    state = replay(events);
    const reserveUse = combatCommands.createUseCombatActionCommand(combatContext(state), reserve.id, 'linda');
    ok(reserveUse, 'Pitahaya Reserve must be usable when Linda is wounded');
    state = replay(appendCommand(events, 'pitahaya-reserve-use', reserveUse));
    equal(state.heroHp.linda, 20, 'Pitahaya Reserve must restore exactly ten HP');
  });

  await scenario('Lambert split shot, confusion redirect and passive reaction stay deterministic', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const doubleShot = getAction('lambert-double-shot');

    let events = appendCommand([start], 'lambert-split-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', ...enemyIds],
    }]);
    let state = replay(events);
    ok(
      state.combat.statuses.some((status) => status.kind === 'tech-recalculation' && status.targetId === 'lambert'),
      'Tech Genius must initialize its one-use battle reaction',
    );
    const lindaSource = state.heroSources.find((hero) => hero.id === 'linda');
    const lindaWisdom = lindaSource.stats.wisdom ?? 0;
    const recalculationRoll = Math.max(2, 12 - lindaWisdom - 4);
    const techOnlyContext = combatContext(state);
    techOnlyContext.combat = {
      ...techOnlyContext.combat,
      statuses: techOnlyContext.combat.statuses.filter((status) => status.kind === 'tech-recalculation'),
    };
    const recalculatedSave = combatCommands.resolveAlliedCombatSavingThrowReactions(
      techOnlyContext,
      'linda',
      recalculationRoll,
      lindaWisdom,
      12,
    );
    ok(recalculatedSave, 'Tech Genius saving-throw reaction must resolve');
    equal(recalculatedSave.success, true, 'Tech Genius +4 must turn the eligible failed save into a success');
    equal(recalculatedSave.modifier, lindaWisdom + 4, 'Tech Genius must expose the full visible modifier');
    ok(
      recalculatedSave.events.some((event) => event.type === 'combat-status-removed'),
      'successful Tech Genius recalculation must consume its battle charge',
    );
    const downedTechContext = {
      ...techOnlyContext,
      heroHp: {...techOnlyContext.heroHp, lambert: 0},
    };
    const unavailableRecalculation = combatCommands.resolveAlliedCombatSavingThrowReactions(
      downedTechContext,
      'linda',
      recalculationRoll,
      lindaWisdom,
      12,
    );
    ok(unavailableRecalculation, 'downed Tech Genius fixture must still resolve the original save');
    equal(unavailableRecalculation.success, false, 'downed Lambert must not improve an ally save');
    equal(unavailableRecalculation.events.length, 0, 'downed Lambert must not spend or emit a reaction');
    events = appendCommand(events, 'lambert-split-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      doubleShot.id,
    ));
    state = replay(events);
    const splitAttack = combatCommands.createHeroAttackCommand(combatContext(state), 'lambert', enemyIds[0], 10);
    ok(splitAttack, 'Double Shot must execute while several enemies are alive');
    const splitResolution = splitAttack.find((event) => event.type === 'combat-attack-resolved').attack;
    equal(splitResolution.damageExpression, '1d8+4', 'split Double Shot must use one arrow damage per target');
    equal(splitResolution.secondaryTargetId, enemyIds[1], 'split Double Shot must select a second living enemy');
    events = appendCommand(events, 'lambert-split-hit', splitAttack);
    state = replay(events);
    const hpBeforeSplit = enemyIds.slice(0, 2).map((enemyId) => state.combat.enemies[enemyId].hp);
    const splitDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 1);
    ok(splitDamage, 'split Double Shot must accept an explicit 1d8 result');
    state = replay(appendCommand(events, 'lambert-split-damage', splitDamage.events));
    equal(state.combat.enemies[enemyIds[0]].hp, hpBeforeSplit[0] - 5, 'first arrow must deal 1d8+4');
    equal(state.combat.enemies[enemyIds[1]].hp, hpBeforeSplit[1] - 5, 'second arrow must deal 1d8+4');

    events = appendCommand([start], 'lambert-focused-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', ...enemyIds],
    }, ...enemyIds.slice(1).map((enemyId) => ({
      type: 'combat-damage-resolved',
      targetId: enemyId,
      amount: 999,
      text: `${enemyId} removed for the single-target fixture.`,
    }))]);
    state = replay(events);
    events = appendCommand(events, 'lambert-focused-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      doubleShot.id,
    ));
    state = replay(events);
    const focusedAttack = combatCommands.createHeroAttackCommand(combatContext(state), 'lambert', enemyIds[0], 10);
    ok(focusedAttack, 'Double Shot must execute against a single remaining enemy');
    const focusedResolution = focusedAttack.find((event) => event.type === 'combat-attack-resolved').attack;
    equal(focusedResolution.damageExpression, '2d8+8', 'focused Double Shot must combine both arrows');
    equal(focusedResolution.secondaryTargetId, undefined, 'focused Double Shot must not create a phantom second target');
    equal(
      focusedResolution.targetAc,
      state.combat.enemies[enemyIds[0]].ac - 2,
      'focused Double Shot must ignore two points of armor',
    );

    events = appendCommand([start], 'lambert-confusion-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['lambert', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    const sarcasm = getAction('lambert-sarcasm');
    events = appendCommand(events, 'lambert-confusion-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      sarcasm.id,
    ));
    state = replay(events);
    const sarcasmUse = combatCommands.createUseCombatActionCommand(combatContext(state), sarcasm.id, undefined, 1);
    ok(sarcasmUse, 'Sarcasm must accept the shared failed Wisdom save');
    events = appendCommand(events, 'lambert-confusion-use', sarcasmUse);
    state = replay(events);
    equal(state.combat.initiativeOrder[state.combat.turnIndex], enemyIds[0], 'first enemy must keep its initiative slot');
    const redirectedAttack = combatCommands.createEnemyAttackCommand(combatContext(state), 'linda', 10);
    ok(redirectedAttack, 'confused enemy must still resolve an attack');
    const redirectedResolution = redirectedAttack.find((event) => event.type === 'combat-attack-resolved').attack;
    equal(redirectedResolution.targetId, enemyIds[1], 'confused enemy must attack another living enemy');
    ok(
      redirectedAttack.some((event) => event.type === 'combat-status-removed' && event.statusId.includes('confused')),
      'confusion must be consumed by the redirected attack',
    );
  });

  await scenario('Golovach Lena fire line, burning queue, heat and surveillance resolve visibly', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);
    const breath = getAction('lena-buldak-breath');
    const originalRandom = Math.random;

    let events = appendCommand([start], 'lena-fire-line-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    let state = replay(events);
    const initialEnemyHp = enemyIds.slice(0, 2).map((enemyId) => state.combat.enemies[enemyId].hp);
    events = appendCommand(events, 'lena-fire-line-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      breath.id,
    ));
    state = replay(events);
    try {
      Math.random = () => {
        throw new Error('Buldak Breath must not use hidden RNG');
      };
      const breathUse = combatCommands.createUseCombatActionCommand(
        combatContext(state),
        breath.id,
        enemyIds[0],
        2,
      );
      ok(breathUse, 'Buldak Breath must resolve with explicit damage and deterministic enemy saves');
      events = appendCommand(events, 'lena-fire-line-use', breathUse);
      state = replay(events);
      const firstSave = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
      ok(firstSave, 'first Buldak target must accept an explicit failed save');
      events = appendCommand(events, 'lena-fire-line-save-one', firstSave);
      state = replay(events);
      const firstBurn = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
      ok(firstBurn, 'first Buldak target must accept an explicit burning roll');
      events = appendCommand(events, 'lena-fire-line-burn-one', firstBurn);
      state = replay(events);
      const secondSave = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
      ok(secondSave, 'second Buldak target must accept an explicit failed save');
      events = appendCommand(events, 'lena-fire-line-save-two', secondSave);
      state = replay(events);
      const secondBurn = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
      ok(secondBurn, 'second Buldak target must accept an explicit burning roll');
      events = appendCommand(events, 'lena-fire-line-burn-two', secondBurn);
      state = replay(events);
    } finally {
      Math.random = originalRandom;
    }
    equal(state.combat.enemies[enemyIds[0]].hp, initialEnemyHp[0] - 6, 'first target must take damage and its start-turn burn');
    equal(state.combat.enemies[enemyIds[1]].hp, initialEnemyHp[1] - 5, 'second target burn must wait for its own turn');
    equal(
      state.combat.statuses.find((status) => status.kind === 'burning' && status.targetId === enemyIds[1])?.amount,
      1,
      'pending burning damage must remain visible on the next enemy',
    );
    const firstEnemyMiss = combatCommands.createEnemyAttackCommand(combatContext(state), 'golovach-lena', 1);
    ok(firstEnemyMiss, 'first burning enemy must still receive its own action after the damage tick');
    events = appendCommand(events, 'lena-fire-line-enemy-miss', firstEnemyMiss);
    state = replay(events);
    equal(state.combat.enemies[enemyIds[1]].hp, initialEnemyHp[1] - 6, 'second burn must trigger only when its queue slot starts');
    equal(
      state.combat.statuses.some((status) => status.kind === 'burning' && status.targetId === enemyIds[1]),
      false,
      'burning must expire after its one visible tick',
    );

    events = appendCommand([start], 'lena-heat-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'golovach-lena'],
    }]);
    state = replay(events);
    const coldContext = combatContext(state);
    const coldEnemy = coldContext.combat.enemies[enemyIds[0]];
    const coldAttack = combatCommands.createEnemyAttackCommand({
      ...coldContext,
      combat: {
        ...coldContext.combat,
        enemies: {
          ...coldContext.combat.enemies,
          [enemyIds[0]]: {
            ...coldEnemy,
            attack: {...coldEnemy.attack, damageType: 'cold'},
          },
        },
      },
    }, 'golovach-lena', 15);
    ok(coldAttack, 'cold enemy fixture must hit Lena');
    events = appendCommand(events, 'lena-heat-hit', coldAttack);
    state = replay(events);
    const coldDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 1);
    ok(coldDamage, 'cold hit must accept explicit damage');
    state = replay(appendCommand(events, 'lena-heat-damage', coldDamage.events));
    equal(
      state.combat.statuses.find((status) => status.kind === 'heat-charge' && status.targetId === 'golovach-lena')?.amount,
      2,
      'cold damage must create a visible +2 heat charge',
    );

    events = appendCommand([start], 'lena-surveillance-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    const surveillance = getAction('lena-video-surveillance-guards');
    events = appendCommand(events, 'lena-surveillance-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      surveillance.id,
    ));
    state = replay(events);
    const surveillanceUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      surveillance.id,
      enemyIds[0],
    );
    ok(surveillanceUse, 'Video Surveillance must target one enemy');
    events = appendCommand(events, 'lena-surveillance-use', surveillanceUse);
    state = replay(events);
    const watchedStart = combatCommands.createEnemyAttackCommand(combatContext(state), 'linda', 20);
    events = appendCommand(events, 'lena-surveillance-reroll-request', watchedStart);
    state = replay(events);
    equal(state.combat.pendingSavingThrow?.kind, 'enemy-attack-reroll', 'surveillance must show the second d20');
    const watchedAttack = combatCommands.createResolveCombatSavingThrowCommand(combatContext(state), 1);
    ok(watchedAttack, 'watched enemy attack must resolve');
    equal(
      watchedAttack.find((event) => event.type === 'combat-attack-resolved').hit,
      false,
      'Video Surveillance must force the natural 20 to reroll and keep the lower natural 1',
    );
    ok(
      watchedAttack.some((event) => event.type === 'combat-status-removed' && event.statusId.includes('surveilled')),
      'Video Surveillance must be consumed by that attack',
    );
  });

  await scenario('Thorin reactions, challenge and critical opening obey target and lifetime rules', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);

    let events = appendCommand([start], 'thorin-help-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'thorin-pukoshchit', 'linda'],
    }]);
    let state = replay(events);
    const linda = state.heroSources.find((hero) => hero.id === 'linda');
    const lindaAc = combatRules.getCombatHeroAc(state.combat, linda);
    const enemyBonus = state.combat.enemies[enemyIds[0]].attack.bonus;
    const nearHitRoll = lindaAc - enemyBonus;
    ok(nearHitRoll > 1 && nearHitRoll < 20, 'helping-reaction fixture must produce a non-critical near hit');
    const helpedAttack = combatCommands.createEnemyAttackCommand(combatContext(state), 'linda', nearHitRoll, undefined, true);
    ok(helpedAttack, 'enemy near-hit must resolve through Thorin reaction');
    equal(
      helpedAttack.find((event) => event.type === 'combat-attack-resolved').hit,
      false,
      'Helping Stick must add +2 AC and turn the current near-hit into a miss',
    );
    ok(
      helpedAttack.some((event) => event.type === 'combat-status-removed' && event.statusId.includes('helping-reaction')),
      'Helping Stick must spend its only reaction',
    );

    events = appendCommand([start], 'thorin-help-downed-start', [{
      type: 'manual-adjustment',
      label: 'Торин HP → 0',
      reason: 'Проверка недоступной реакции.',
      adjustment: {kind: 'participant-stat', participantId: 'thorin-pukoshchit', field: 'hp', value: 0},
    }, {
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'thorin-pukoshchit', 'linda'],
    }]);
    state = replay(events);
    const downedLindaAc = combatRules.getCombatHeroAc(state.combat, state.heroSources.find((hero) => hero.id === 'linda'));
    const downedNearHit = downedLindaAc - state.combat.enemies[enemyIds[0]].attack.bonus;
    const unhelpedAttack = combatCommands.createEnemyAttackCommand(combatContext(state), 'linda', downedNearHit);
    ok(unhelpedAttack, 'enemy attack must still resolve while Thorin is down');
    equal(
      unhelpedAttack.find((event) => event.type === 'combat-attack-resolved').hit,
      true,
      'downed Thorin must not use Helping Stick',
    );

    events = appendCommand([start], 'thorin-challenge-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', ...enemyIds, 'linda'],
    }]);
    state = replay(events);
    const challenge = getAction('thorin-beast-understanding');
    events = appendCommand(events, 'thorin-challenge-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      challenge.id,
    ));
    state = replay(events);
    const challengeUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      challenge.id,
      enemyIds[0],
    );
    ok(challengeUse, 'Beast Understanding must target a living enemy');
    events = appendCommand(events, 'thorin-challenge-use', challengeUse);
    state = replay(events);
    const challengedAttack = combatCommands.createEnemyAttackCommand(combatContext(state), 'linda', 10);
    ok(challengedAttack, 'challenged enemy must still attack in its queue slot');
    const challengedResolution = challengedAttack.find((event) => event.type === 'combat-attack-resolved').attack;
    equal(challengedResolution.targetId, 'thorin-pukoshchit', 'challenged enemy must be redirected to Thorin');
    equal(challengedResolution.rollMode, 'disadvantage', 'challenged enemy attack must have disadvantage');

    events = appendCommand([start], 'thorin-opening-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', 'linda', ...enemyIds],
    }]);
    state = replay(events);
    const opening = getAction('thorin-needle-guards');
    events = appendCommand(events, 'thorin-opening-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      opening.id,
    ));
    state = replay(events);
    const openingUse = combatCommands.createUseCombatActionCommand(combatContext(state), opening.id, enemyIds[0]);
    ok(openingUse, 'Critical Opening must target one enemy');
    events = appendCommand(events, 'thorin-opening-use', openingUse);
    state = replay(events);
    const openingAttack = combatCommands.createHeroAttackCommand(combatContext(state), 'linda', enemyIds[0], 2);
    ok(openingAttack, 'armor-ignoring opening must allow Linda low roll to hit');
    const openingResolution = openingAttack.find((event) => event.type === 'combat-attack-resolved').attack;
    equal(openingResolution.targetAc, 0, 'Critical Opening must ignore armor');
    equal(openingResolution.critical, true, 'Critical Opening hit must become critical');
    ok(
      openingAttack.some((event) => event.type === 'combat-status-removed' && event.statusId.includes('critical-opening')),
      'Critical Opening must be consumed only by the successful hit',
    );
  });

  await scenario('defensive passives, survival and critical focus resolve instead of remaining labels', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);

    let events = appendCommand([start], 'bubsilda-cold-resistance-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'bubsilda'],
    }]);
    let state = replay(events);
    let context = combatContext(state);
    const coldEnemy = context.combat.enemies[enemyIds[0]];
    const coldAttack = combatCommands.createEnemyAttackCommand({
      ...context,
      combat: {
        ...context.combat,
        enemies: {
          ...context.combat.enemies,
          [enemyIds[0]]: {...coldEnemy, attack: {...coldEnemy.attack, damageType: 'cold'}},
        },
      },
    }, 'bubsilda', 10);
    ok(coldAttack, 'cold resistance fixture must create a hit on Bubsilda');
    events = appendCommand(events, 'bubsilda-cold-resistance-hit', coldAttack);
    state = replay(events);
    const resistedColdDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 1);
    ok(resistedColdDamage, 'Bubsilda cold damage must resolve');
    ok(
      resistedColdDamage.events.find((event) => event.type === 'combat-damage-resolved').text.includes('сопротивление'),
      'Bubsilda damage log must explain cold resistance mitigation',
    );

    events = appendCommand([start], 'linda-poison-resistance-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'linda'],
    }]);
    state = replay(events);
    context = combatContext(state);
    const poisonEnemy = context.combat.enemies[enemyIds[0]];
    const poisonAttack = combatCommands.createEnemyAttackCommand({
      ...context,
      combat: {
        ...context.combat,
        enemies: {
          ...context.combat.enemies,
          [enemyIds[0]]: {...poisonEnemy, attack: {...poisonEnemy.attack, damageType: 'poison'}},
        },
      },
    }, 'linda', 10);
    ok(poisonAttack, 'poison resistance fixture must create a hit on Linda');
    events = appendCommand(events, 'linda-poison-resistance-hit', poisonAttack);
    state = replay(events);
    const resistedPoisonDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 1);
    ok(resistedPoisonDamage, 'Linda poison damage must resolve');
    ok(
      resistedPoisonDamage.events.find((event) => event.type === 'combat-damage-resolved').text.includes('сопротивление'),
      'Linda damage log must explain poison resistance mitigation',
    );

    events = appendCommand([start], 'linda-survival-start', [{
      type: 'manual-adjustment',
      label: 'Линда HP → 1',
      reason: 'Проверка Воли жизни.',
      adjustment: {kind: 'participant-stat', participantId: 'linda', field: 'hp', value: 1},
    }, {
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: [enemyIds[0], 'linda'],
    }, {
      type: 'combat-condition-changed',
      participantId: 'linda',
      condition: 'blinded',
      active: true,
    }]);
    state = replay(events);
    const lethalAttack = combatCommands.createEnemyAttackCommand(combatContext(state), 'linda', 10);
    ok(lethalAttack, 'survival fixture must create a lethal hit');
    events = appendCommand(events, 'linda-survival-hit', lethalAttack);
    state = replay(events);
    const lethalDamage = combatCommands.createApplyCombatDamageCommand(combatContext(state), 1);
    ok(lethalDamage, 'lethal Linda damage must resolve');
    state = replay(appendCommand(events, 'linda-survival-damage', lethalDamage.events));
    equal(state.heroHp.linda, 1, 'Will to Live must keep Linda at one HP');
    deepEqual(state.combat.conditions.linda, [], 'Will to Live must clear Linda negative combat conditions');
    equal(
      state.combat.statuses.some((status) => status.kind === 'survival-instinct' && status.targetId === 'linda'),
      false,
      'Will to Live must be consumed by the first lethal hit',
    );

    events = appendCommand([start], 'thorin-last-push-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['thorin-pukoshchit', ...enemyIds],
    }]);
    state = replay(events);
    const lastPush = getAction('thorin-work-until-pulse-drops');
    events = appendCommand(events, 'thorin-last-push-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      lastPush.id,
    ));
    state = replay(events);
    const lastPushUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      lastPush.id,
      'thorin-pukoshchit',
    );
    ok(lastPushUse, 'Work Until Pulse Drops must apply even at full HP because it has defensive effects');
    events = appendCommand(events, 'thorin-last-push-use', lastPushUse);
    state = replay(events);
    state = replay(appendCommand(events, 'thorin-last-push-lethal', [{
      type: 'combat-damage-resolved',
      targetId: 'thorin-pukoshchit',
      amount: 999,
      text: 'Тестовый смертельный урон.',
    }]));
    equal(state.heroHp['thorin-pukoshchit'], 1, 'Last Push must keep Thorin at one HP');

    events = appendCommand([start], 'lena-critical-focus-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    state = replay(events);
    const creativeCrisis = getAction('lena-creative-crisis');
    events = appendCommand(events, 'lena-critical-focus-select', combatCommands.createSelectCombatActionCommand(
      combatContext(state),
      creativeCrisis.id,
    ));
    state = replay(events);
    const criticalFocusUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      creativeCrisis.id,
      'golovach-lena',
      6,
    );
    ok(criticalFocusUse, 'Creative Crisis six must resolve');
    events = appendCommand(events, 'lena-critical-focus-use', criticalFocusUse);
    state = replay(events);
    for (const enemyId of enemyIds) {
      events = appendCommand(events, `focus-enemy-${enemyId}`, combatCommands.createEnemyAttackCommand(combatContext(state), 'golovach-lena', 1));
      state = replay(events);
    }
    const focusedAttack = combatCommands.createHeroAttackCommand(
      combatContext(state),
      'golovach-lena',
      enemyIds[0],
      19,
    );
    ok(focusedAttack, 'critical-focus Lena attack must resolve');
    equal(
      focusedAttack.find((event) => event.type === 'combat-attack-resolved').attack.critical,
      true,
      'Creative Crisis six must expand the critical range to natural 19',
    );
    ok(
      focusedAttack.some((event) => event.type === 'combat-status-removed' && event.statusId.includes('critical-focus')),
      'critical focus must be consumed by the next attack',
    );
  });

  await scenario('weakness items and Sleep Scroll execute their complete combat paths', () => {
    const start = createStartEvent();
    const encounter = getEncounter('prop-room-winding-carriers');
    const enemyIds = encounter.units.map((unit) => unit.id);

    for (const [heroId, actionId] of [
      ['bubsilda', 'bubsilda-yellow-snowball-guards'],
      ['lambert', 'lambert-hud-helmet-guards'],
    ]) {
      let events = appendCommand([start], `${actionId}-start`, [{
        type: 'combat-started',
        encounterId: encounter.id,
        initiativeOrder: [heroId, ...enemyIds],
      }]);
      let state = replay(events);
      const action = getAction(actionId);
      events = appendCommand(events, `${actionId}-equip`, combatCommands.createEquipCombatItemCommand(
        combatContext(state),
        action.id,
      ));
      state = replay(events);
      const weaknessAttack = combatCommands.createHeroAttackCommand(
        combatContext(state),
        heroId,
        enemyIds[0],
        10,
      );
      ok(weaknessAttack, `${action.name} must execute as the selected attack enhancement`);
      const resolution = weaknessAttack.find((event) => event.type === 'combat-attack-resolved').attack;
      equal(
        resolution.targetAc,
        encounter.weakness.reducedAc,
        `${action.name} must use the encounter reduced AC for its attack`,
      );
      ok(
        weaknessAttack.some((event) => event.type === 'combat-action-used' && event.actionId === action.id),
        `${action.name} must consume its canonical use on the attack`,
      );
    }

    let events = appendCommand([start], 'sleep-scroll-runtime-start', [{
      type: 'manual-adjustment',
      label: 'Лена HP → 20',
      reason: 'Проверка Сонного свитка.',
      adjustment: {kind: 'participant-stat', participantId: 'golovach-lena', field: 'hp', value: 20},
    }, {
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['golovach-lena', ...enemyIds],
    }]);
    let state = replay(events);
    const sleepScroll = getAction('lena-sleep-scroll');
    events = appendCommand(events, 'sleep-scroll-runtime-equip', combatCommands.createEquipCombatItemCommand(
      combatContext(state),
      sleepScroll.id,
    ));
    state = replay(events);
    const sleepUse = combatCommands.createUseCombatActionCommand(
      combatContext(state),
      sleepScroll.id,
      'golovach-lena',
      5,
    );
    ok(sleepUse, 'Sleep Scroll must accept an explicit 1d8 result');
    state = replay(appendCommand(events, 'sleep-scroll-runtime-use', sleepUse));
    equal(state.heroHp['golovach-lena'], 25, 'Sleep Scroll must restore the entered five HP');
    equal(state.combat.initiativeOrder[state.combat.turnIndex], enemyIds[0], 'Sleep Scroll must spend Lena action');
  });

  await scenario('remaining hero kits keep canonical sources, encounter coverage and HUD icons', async () => {
    const characterSources = JSON.parse(await readFile(`${projectRoot}/content/characters.json`, 'utf8'));
    const traySource = await readFile(
      `${projectRoot}/src/widgets/campaign-scene/ui/CombatArena/CombatActionTray.tsx`,
      'utf8',
    );
    const ordinaryEncounterIds = data.penisuelaGalleryGameplay.encounters.map((encounter) => encounter.id).sort();
    const remainingHeroIds = ['lambert', 'golovach-lena', 'thorin-pukoshchit'];

    for (const heroId of remainingHeroIds) {
      const character = characterSources.find((candidate) => candidate.id === heroId);
      ok(character, `${heroId} canonical character source must exist`);
      const canonicalSourceIds = new Set([
        ...character.abilities.map((ability) => ability.id),
        ...character.items.map((item) => item.id),
      ]);
      const visibleActions = definition.combatActions.filter((action) => (
        action.characterId === heroId && action.encounterIds.length > 0
      ));
      equal(visibleActions.length, 9, `${heroId} must expose exactly five skills and four items`);
      for (const action of visibleActions) {
        ok(canonicalSourceIds.has(action.sourceId), `${action.id} must reference a canonical source owned by ${heroId}`);
        deepEqual([...action.encounterIds].sort(), ordinaryEncounterIds, `${action.id} must cover all ordinary encounters`);
        const mapping = traySource.match(new RegExp(`'${action.id}': '([^']+)'`));
        ok(mapping, `${action.id} must have a HUD icon mapping`);
        await access(`${projectRoot}/${mapping[1]}`);
        assertionCount += 1;
      }
    }
  });

  await scenario('downed turn skipping and ordinary fail-forward defeat snapshot', () => {
    const start = createStartEvent();
    const encounter = getEncounter('runtime-training-target');
    let events = appendCommand([start], 'fallback-combat-start', [{
      type: 'combat-started',
      encounterId: encounter.id,
      initiativeOrder: ['bubsilda', 'linda', 'runtime-training-target'],
    }]);
    events = appendCommand(events, 'down-linda', [{
      type: 'manual-adjustment',
      label: 'Линда HP → 0',
      reason: 'Проверка пропуска downed.',
      adjustment: {kind: 'participant-stat', participantId: 'linda', field: 'hp', value: 0},
    }]);
    events = appendCommand(events, 'advance-past-downed', [{type: 'turn-advanced'}]);
    let state = replay(events);
    equal(
      state.combat.initiativeOrder[state.combat.turnIndex],
      'runtime-training-target',
      'turn advance must skip a hero at 0 HP',
    );

    const downInputs = heroes.map((hero) => ({
      type: 'manual-adjustment',
      label: `${hero.name}: HP → 0`,
      reason: 'Проверка fail-forward поражения.',
      adjustment: {kind: 'participant-stat', participantId: hero.id, field: 'hp', value: 0},
    }));
    events = appendCommand(events, 'all-heroes-down', downInputs);
    state = replay(events);
    equal(
      finalBossRules.areAllHeroesDown(state.heroHp, heroes.map((hero) => hero.id)),
      true,
      'production all-down predicate must recognize party defeat',
    );
    ok(encounter.defeatFallback, 'ordinary canonical encounter must define fail-forward fallback');

    const fallbackInputs = [
      ...heroes.map((hero) => ({
        type: 'healing-applied',
        targetId: hero.id,
        amount: 1,
        maxHp: hero.maxHp,
        text: `${hero.name} приходит в себя с 1 HP.`,
      })),
      {
        type: 'combat-damage-resolved',
        targetId: 'runtime-training-target',
        amount: state.combat.enemies['runtime-training-target'].hp,
        text: 'Аварийный протокол завершает столкновение.',
      },
      {type: 'combat-ended', text: encounter.defeatFallback.resolution},
      {type: 'flag-changed', flag: 'combat-defeat-fallback-runtime-training-target', value: true},
      {type: 'flag-changed', flag: 'rail-kraken-resolved', value: true},
      {type: 'counter-changed', counter: 'timePressure', delta: 1},
    ];
    events = appendCommand(events, 'apply-rail-fallback', fallbackInputs);
    state = replay(events);
    heroes.forEach((hero) => equal(state.heroHp[hero.id], 1, `${hero.id} must recover to exactly 1 HP`));
    equal(state.combat.enemies['runtime-training-target'].hp, 0, 'fallback must end the surviving enemy protocol');
    equal(state.flags['rail-kraken-resolved'], true, 'fallback must preserve the mandatory route flag');
    equal(state.counters.timePressure, 1, 'fallback must apply its canonical time cost');
  });

  await scenario('dialogue conditions, effects and one-command atomic correction', () => {
    const preset = dialogueBank.presets.find((candidate) => candidate.id === 'igor-authorize-technical-use');
    ok(preset, 'canonical dialogue preset with relationship and flag effects must exist');
    const start = createStartEvent();
    let events = appendCommand([start], 'technical-need', [{
      type: 'story-action-resolved',
      actionId: 'explain-reset-to-couple',
      result: 'success',
      sceneId: 'ceremony-villa',
    }]);
    let state = replay(events);
    equal(
      dialogueRules.evaluateDialoguePresetConditions(preset, state, null).available,
      true,
      'canonical state-backed dialogue conditions must become available',
    );
    equal(preset.effects.length, 4, 'fixture must retain all canonical dialogue effects');

    const selection = {
      sceneId: 'ceremony-villa',
      presetId: preset.id,
      speaker: preset.characterId,
      text: preset.text,
    };
    const dialogueInputs = [
      {
        type: 'manual-adjustment',
        label: `Реплика: ${preset.characterId} · ${preset.label}`,
        reason: 'Мастер подтвердил канонический пресет по условиям сцены.',
        adjustment: {kind: 'dialogue-preset', ...selection},
      },
      {type: 'dialogue-preset-chosen', ...selection},
      {type: 'relationship-changed', relationshipId: 'wedding-couple-trust', change: {mode: 'delta', value: 1}},
      {type: 'flag-changed', flag: 'footage-authorized', value: true},
      {type: 'flag-changed', flag: 'couple-trust', value: true},
      {type: 'flag-changed', flag: 'bride-voice-key', value: true},
    ];
    events = appendCommand(events, 'dialogue-authorize-footage', dialogueInputs);
    state = replay(events);
    equal(state.selectedDialoguePreset.presetId, preset.id, 'selected dialogue must be stored in the session snapshot');
    equal(state.relationships['wedding-couple-trust'], 1, 'dialogue relationship effect must be applied');
    equal(state.flags['footage-authorized'], true);
    equal(state.flags['couple-trust'], true);
    equal(state.flags['bride-voice-key'], true);

    events = appendCommand(events, 'undo-dialogue-authorize-footage', [{
      type: 'action-corrected',
      correctedCommandId: 'dialogue-authorize-footage',
    }]);
    state = replay(events);
    equal(state.selectedDialoguePreset, null, 'correction must remove the selected dialogue atomically');
    equal(state.relationships['wedding-couple-trust'], undefined, 'correction must remove relationship effect atomically');
    equal(state.flags['footage-authorized'], undefined, 'correction must remove every dialogue flag atomically');
    equal(state.flags['couple-trust'], undefined);
    equal(state.flags['bride-voice-key'], undefined);
  });

  await scenario('manual GM edits for all state families and atomic undo', () => {
    const start = createStartEvent();
    let events = appendCommand([start], 'manual-combat-start', [{
      type: 'combat-started',
      encounterId: 'runtime-training-target',
      initiativeOrder: ['bubsilda', 'runtime-training-target'],
    }]);
    const adjustments = [
      {kind: 'participant-stat', participantId: 'bubsilda', field: 'maxHp', value: 40},
      {kind: 'participant-stat', participantId: 'bubsilda', field: 'hp', value: 7},
      {kind: 'participant-stat', participantId: 'bubsilda', field: 'ac', value: 17},
      {kind: 'participant-stat', participantId: 'bubsilda', field: 'attackBonus', value: 9},
      {kind: 'participant-stat', participantId: 'bubsilda', field: 'temporaryModifier', value: 2},
      {kind: 'inventory-item', itemId: 'runtime-token', acquired: true, ownerId: 'bubsilda', quantity: 2, charges: 1},
      {kind: 'condition', participantId: 'bubsilda', conditionId: 'inspired', active: true},
      {kind: 'flag', flag: 'runtime-manual-flag', value: true},
      {kind: 'counter', counter: 'timePressure', value: 5},
      {kind: 'relationship', relationshipId: 'stas', value: 3},
      {kind: 'location', locationId: 'closed-bar', stateValue: 'secured'},
      {kind: 'initiative', order: ['runtime-training-target', 'bubsilda'], turnIndex: 0, round: 4},
    ];
    events = appendCommand(events, 'manual-batch', adjustments.map((adjustment, index) => ({
      type: 'manual-adjustment',
      label: `Ручная правка ${index + 1}`,
      reason: 'Сценарный тест мастерской коррекции.',
      adjustment,
    })));
    let state = replay(events);
    equal(state.heroMaxHp.bubsilda, 40);
    equal(state.heroHp.bubsilda, 7);
    equal(state.heroAc.bubsilda, 17);
    equal(state.heroAttackBonuses.bubsilda, 9);
    equal(state.participantTemporaryModifiers.bubsilda, 2);
    deepEqual(state.inventoryState['runtime-token'], {
      ownerId: 'bubsilda',
      quantity: 2,
      charges: 1,
      maxCharges: null,
      chargeScope: null,
    });
    deepEqual(state.participantConditions.bubsilda, ['inspired']);
    equal(state.flags['runtime-manual-flag'], true);
    equal(state.counters.timePressure, 5);
    equal(state.relationships.stas, 3);
    equal(state.currentLocationId, 'closed-bar');
    equal(state.locationStates['closed-bar'], 'secured');
    deepEqual(state.combat.initiativeOrder, ['runtime-training-target', 'bubsilda']);
    equal(state.combat.round, 4);

    events = appendCommand(events, 'undo-manual-batch', [{
      type: 'action-corrected',
      correctedCommandId: 'manual-batch',
    }]);
    state = replay(events);
    equal(state.heroMaxHp.bubsilda, heroes.find((hero) => hero.id === 'bubsilda').maxHp);
    equal(state.heroHp.bubsilda, heroes.find((hero) => hero.id === 'bubsilda').hp);
    equal(state.heroAc.bubsilda, heroes.find((hero) => hero.id === 'bubsilda').ac);
    equal(state.heroAttackBonuses.bubsilda, undefined);
    equal(state.participantTemporaryModifiers.bubsilda, undefined);
    equal(state.inventoryState['runtime-token'], undefined);
    equal(state.participantConditions.bubsilda, undefined);
    equal(state.flags['runtime-manual-flag'], undefined);
    equal(state.counters.timePressure, 0);
    equal(state.relationships.stas, undefined);
    equal(state.currentLocationId, definition.sceneId);
    equal(state.locationStates['closed-bar'], undefined);
    deepEqual(state.combat.initiativeOrder, ['bubsilda', 'runtime-training-target']);
    equal(state.combat.round, 1);
  });

  await scenario('early hotel decision controls late plan availability', () => {
    const start = createStartEvent(heroes, ['overload-console', 'camera-pendant']);
    let events = appendCommand([start], 'keep-pendant-connected', [
      {type: 'flag-changed', flag: 'pendant-choice-resolved', value: true},
      {type: 'flag-changed', flag: 'pendant-connected', value: true},
      {type: 'flag-changed', flag: 'recording-damaged', value: false},
      {type: 'counter-changed', counter: 'timePressure', delta: 1},
      {type: 'clue-revealed', clueId: 'shutdown-options'},
    ]);
    events = appendCommand(events, 'read-overload-console', [
      {type: 'story-action-resolved', actionId: 'read-overload-console', result: 'automatic', sceneId: 'hotel-overload-search'},
      {type: 'flag-changed', flag: 'overload-console-read', value: true},
      {type: 'clue-revealed', clueId: 'system-overload'},
    ]);
    events = appendCommand(events, 'inspect-pendant-log', [
      {type: 'story-action-resolved', actionId: 'inspect-pendant-log', result: 'automatic', sceneId: 'hotel-overload-search'},
      {type: 'flag-changed', flag: 'pendant-log-inspected', value: true},
      {type: 'clue-revealed', clueId: 'shutdown-options'},
    ]);
    let state = replay(events);
    const director = getPlan('director');
    equal(finalBossRules.isFinalBossPlanAvailable(director, state), false, 'early decision alone is insufficient without late log repair');

    events = appendCommand(events, 'restore-control-log', [
      {type: 'story-action-resolved', actionId: 'align-control-log-timestamps', result: 'success', sceneId: 'restore-control-log'},
      {type: 'flag-changed', flag: 'control-log-restored', value: true},
      {type: 'clue-revealed', clueId: 'shutdown-options'},
    ]);
    state = replay(events);
    equal(finalBossRules.isFinalBossPlanAvailable(director, state), true, 'kept pendant plus repaired log must unlock director plan');
    equal(state.counters.timePressure, 1, 'early connected choice must retain its time-pressure cost');

    const disconnectedStart = createStartEvent();
    const disconnectedEvents = appendCommand([disconnectedStart], 'disconnect-pendant', [
      {type: 'flag-changed', flag: 'pendant-choice-resolved', value: true},
      {type: 'flag-changed', flag: 'pendant-connected', value: false},
      {type: 'flag-changed', flag: 'recording-damaged', value: true},
      {type: 'flag-changed', flag: 'control-log-restored', value: true},
    ]);
    equal(
      finalBossRules.isFinalBossPlanAvailable(director, replay(disconnectedEvents)),
      false,
      'disconnecting the pendant must keep director plan unavailable even after late log repair',
    );

    events = appendCommand(events, 'late-time-loss', [{type: 'counter-changed', counter: 'timePressure', delta: 4}]);
    equal(
      finalBossRules.isFinalBossPlanAvailable(director, replay(events)),
      false,
      'time pressure above the canonical limit must close director plan',
    );
  });

  await scenario('three final plans, three endings and deterministic phase rules', () => {
    const standard = getPlan('standard');
    const director = getPlan('director');
    const physical = getPlan('physical');
    const availability = {
      flags: {
        'groom-voice-key': true,
        'bride-voice-key': true,
        'couple-trust': true,
        'pendant-connected': true,
        'control-log-restored': true,
      },
      counters: {timePressure: 2, preFinalCombats: 1},
    };
    equal(finalBossRules.isFinalBossPlanAvailable(standard, availability), true);
    equal(finalBossRules.isFinalBossPlanAvailable(director, availability), true);
    equal(finalBossRules.isFinalBossPlanAvailable(physical, {flags: {}, counters: {timePressure: 99, preFinalCombats: 99}}), true);

    const standardSuccess = finalBossRules.resolveFinalBossPlanCheck(finalBoss, standard, 125, 0, 20);
    equal(standardSuccess.success, true, 'natural 20 must complete standard plan');
    const standardFailure = finalBossRules.resolveFinalBossPlanCheck(finalBoss, standard, 125, 99, 1);
    equal(standardFailure.success, false, 'natural 1 must fail standard plan');
    equal(finalBossRules.resolveFinalBossPlanCheck(finalBoss, director, 44, 4, 8).dc, 12, 'prepared phase-three director DC must be 12');
    equal(finalBossRules.resolveFinalBossPlanCheck(finalBoss, physical, 44, 0, 10), null, 'physical plan must have no fake check');

    equal(finalBossRules.getFinalBossPhase(finalBoss, 125).number, 1);
    equal(finalBossRules.getFinalBossPhase(finalBoss, 85).number, 2);
    equal(finalBossRules.getFinalBossPhase(finalBoss, 45).number, 3);
    equal(finalBossRules.getFinalBossPhase(finalBoss, 0).number, 3);
    equal(finalBossRules.getFinalBossPhaseFloor(finalBoss, 125), 85);
    equal(finalBossRules.capFinalBossDamage(finalBoss, 125, 999), 40, 'phase one damage must stop at its segment floor');
    equal(finalBossRules.capFinalBossDamage(finalBoss, 85, 999), 40, 'phase two damage must stop at its segment floor');
    equal(finalBossRules.capFinalBossDamage(finalBoss, 45, 999), 45, 'phase three may reach zero');

    const initiative = finalBossRules.resolveFinalBossInitiative([
      {id: 'bubsilda', name: 'Бубсильда', modifier: 3},
      {id: 'last-take-module', name: 'Последний дубль', modifier: 4},
    ], {bubsilda: 20, 'last-take-module': 19});
    deepEqual(
      initiative.order,
      ['last-take-module', 'bubsilda'],
      'deterministic final initiative tie must use the higher canonical modifier',
    );
    equal(finalBossRules.resolveFinalBossInitiative([
      {id: 'bubsilda', name: 'Бубсильда', modifier: 3},
    ], {bubsilda: 0}), null, 'invalid final initiative die must be rejected');

    equal(finalBossRules.resolveFinalBossAttackRoll(1, 99, 10).hit, false, 'boss natural 1 must miss');
    equal(finalBossRules.resolveFinalBossAttackRoll(20, -99, 99).hit, true, 'boss natural 20 must hit');
    equal(finalBossRules.resolveFinalBossDamageRoll('1d8+3', false, 8).amount, 11);
    equal(finalBossRules.resolveFinalBossDamageRoll('1d8+3', false, 9), null, 'out-of-range raw damage must be rejected');
    equal(finalBossRules.resolveFinalBossSavingThrow(1, 99, 13).success, false, 'save natural 1 must fail');
    equal(finalBossRules.resolveFinalBossSavingThrow(20, -99, 13).success, true, 'save natural 20 must succeed');

    const finalStart = createStartEvent();
    const finalRequestedEvents = appendCommand([finalStart], 'final-dialogue-start-request', [
      {type: 'flag-changed', flag: 'final-boss-started', value: true},
      {type: 'flag-changed', flag: 'final-boss-dragonfire-charged', value: false},
      {type: 'ending-selected', endingId: null},
    ]);
    const requestedState = replayRuntime(finalRequestedEvents);
    equal(requestedState.combat, null, 'final dialogue must arm the battle without hidden initiative rolls');
    equal(requestedState.flags['final-boss-started'], true, 'final dialogue must expose the explicit initiative step');
    const finalEvents = appendCommand(finalRequestedEvents, 'final-runtime-start', [{
      type: 'combat-started',
      encounterId: finalBoss.encounter.id,
      initiativeOrder: ['bubsilda', finalBoss.encounter.id],
    }]);
    const finalState = replayRuntime(finalEvents);
    equal(finalState.combat.encounterId, finalBoss.encounter.id, 'merged runtime definition must start final combat');
    equal(finalState.combat.enemies[finalBoss.encounter.id].hp, 125, 'final runtime enemy must start at canonical HP');
    equal(finalState.combat.enemies[finalBoss.encounter.id].ac, 15, 'final runtime enemy must start at canonical AC');
    deepEqual(
      finalState.combat.initiativeOrder,
      ['bubsilda', finalBoss.encounter.id],
      'final runtime replay must preserve explicit physical initiative order',
    );
    ok(
      runtimeDefinition.npcBehaviors.some((profile) => profile.id === finalBoss.npcBehavior.id),
      'merged runtime definition must include the final NPC behavior',
    );

    const overriddenHeroBonus = finalBossRules.getFinalBossEffectiveHeroAttackBonus(6, 9, 2, -2);
    equal(overriddenHeroBonus, 9, 'hero manual attack override, temporary bonus and condition penalty must compose');
    equal(
      finalBossRules.resolveFinalBossAttackRoll(6, overriddenHeroBonus, finalState.combat.enemies[finalBoss.encounter.id].ac).hit,
      true,
      'composed hero override must be used against current enemy AC',
    );
    const overriddenEnemyBonus = finalBossRules.getFinalBossEffectiveAttackBonus(6, 6, 9, -1);
    equal(overriddenEnemyBonus, 8, 'enemy manual attack override and temporary modifier must compose');
    const manualTargetAc = 17;
    const attackAgainstManualAc = finalBossRules.resolveFinalBossAttackRoll(8, overriddenEnemyBonus, manualTargetAc);
    equal(attackAgainstManualAc.targetAc, manualTargetAc, 'enemy attack must retain manually overridden target AC');
    equal(attackAgainstManualAc.hit, false, 'manually raised target AC must change the hit result');

    for (const plan of [standard, director, physical]) {
      const ending = finalBossRules.getFinalBossEndingOutcome(plan);
      const start = createStartEvent();
      const events = appendCommand([start], `ending-${plan.id}`, [
        {type: 'flag-changed', flag: ending.endingFlag, value: true},
        {type: 'ending-selected', endingId: ending.endingId},
      ]);
      const state = replay(events);
      equal(state.selectedEnding, plan.endingId, `${plan.id} must select its canonical ending`);
      equal(state.flags[plan.endingFlag], true, `${plan.id} must retain its canonical ending flag`);
      ok(
        definition.storyScenes.some((scene) => scene.id === plan.epilogueSceneId),
        `${plan.id} epilogue scene must exist in production content`,
      );
    }
  });

  await scenario('current dragon NPC decision participates in production state', () => {
    const profile = definition.npcBehaviors.find((candidate) => candidate.id === 'andrey-dragon-behavior');
    const participants = [{id:'andrey-dragon',name:dragon.name,faction:'enemy',hp:dragon.hp,maxHp:dragon.hp,ac:dragon.ac},
      ...heroes.map((hero)=>({...hero,faction:'hero'}))];
    const decision=npcRules.selectNpcDecision(profile,{encounterId:dragon.id,actorId:dragon.id,round:1,participants,flags:{},resources:{},availableActionIds:[dragon.attack.id]});
    equal(decision.actionId,dragon.attack.id);equal(decision.targetIds.length,1);ok(decision.explanation.length>0);
  });

  console.log(
    `Penisuela production runtime: ${completedScenarios.length}/${completedScenarios.length} scenarios passed, ${assertionCount} assertions.`,
  );
} finally {
  await server.close();
}
