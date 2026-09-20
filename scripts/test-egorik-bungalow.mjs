import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true}});
try {
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes, penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents} = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const commands = await server.ssrLoadModule('/src/features/run-combat/model/combatCommands.ts');
  const {getPendingDamageRange} = await server.ssrLoadModule('/src/entities/combat/model/combatRules.ts');
  const {isGalleryStoryConditionMet} = await server.ssrLoadModule('/src/entities/campaign-session/model/galleryGameplay.ts');
  const sceneId = 'egorik-bungalow-reveal';
  const scene = definition.storyScenes.find((item) => item.id === sceneId);
  const start = scene.actions.find((action) => action.kind === 'combat-start');
  const victory = scene.actions.find((action) => action.kind === 'combat-complete');
  const next = scene.actions.find((action) => action.nextSceneId !== sceneId);
  const show = scene.actions.find((action) => action.id === 'show-egorik-bracelet');
  const back = scene.actions.find((action) => action.id === 'return-to-egorik-conversation');
  const encounter = definition.encounters.find((item) => item.id === start.encounterId);
  const fallback = scene.actions.find((action) => action.id === encounter.defeatFallback.completionActionId);
  assert.equal(encounter.units.length, 3);
  assert.equal(new Set(encounter.units.map((unit) => unit.id)).size, 3);
  assert.equal(heroes.length, 5);
  for (const unit of encounter.units) {
    assert.equal(unit.token, 'assets/concepts/campaigns/penisuela/ui/enemy-tokens/hotel-arcane-guard.png');
    await access(unit.token);
  }
  const published = preview.scenes.find((item) => item.id === sceneId);
  assert.notEqual(published.background, published.interactionViews.find((view) => view.id === 'combat').background);
  await access(published.background);
  for (const view of published.interactionViews) await access(view.background);
  assert.ok(published.interactionViews.some((view) => view.id === 'conversation'));
  assert.ok(published.interactionViews.some((view) => view.id === 'bracelet'));
  assert.equal(next.nextSceneId, 'groom-tunnel');
  assert.equal(fallback.kind, 'automatic');
  assert.equal(victory.outcome.flags['egorik-nastasia-allies'], true);
  assert.ok(!fallback.outcome.flags['egorik-nastasia-allies']);
  assert.deepEqual(fallback.outcome.clues, []);
  assert.deepEqual(victory.outcome.clues, [], 'victory must not spoil the bracelet reveal');
  assert.equal(show.repeatable, true);
  assert.equal(back.repeatable, true);
  assert.deepEqual(show.outcome.clues, ['egorik-not-groom', 'kreed-secret-artist', 'kreed-groom-evidence', 'groom-location']);
  for (const action of definition.combatActions.filter((item) => heroes.some(hero => hero.id === item.characterId) && item.encounterIds?.includes('hotel-bar-arcane-guards'))) {
    assert.ok(action.encounterIds.includes(encounter.id), `${action.id} must remain available`);
  }
  let sequence = 0;
  const append = (events, commandId, inputs) => [...events, ...inputs.map((input) => ({...input, id: `egorik-test-${++sequence}`, commandId, sceneScopeId: sceneId}))];
  const replay = (events) => replayGalleryEvents(events, definition);
  const context = (state) => ({combat: state.combat, definition, heroes: state.heroSources, heroHp: state.heroHp, inventoryState: state.inventoryState, resourceUses: state.resourceUses, participantConditions: state.participantConditions});
  const seed = journal.createGallerySessionStartedEvent({definition, heroes, existingInventory: ['guest-bungalow-pass'], eventId: 'egorik-test-seed', commandId: 'egorik-test-session', startedAt: '2026-09-07T10:00:00.000Z'});
  const entry = append([seed], 'olva-access', [{type: 'flag-changed', flag: 'olva-bungalow-access-issued', value: true}]);
  assert.equal(replay(entry).combat, null, 'entry never starts combat');
  assert.equal(isGalleryStoryConditionMet(start.conditions, replay(entry)), true);
  assert.equal(isGalleryStoryConditionMet(next.conditions, replay(entry)), false, 'cannot skip rescue');
  let events = append(entry, 'start-bungalow', [commands.createStartCombatCommand(encounter, heroes, () => 10)]);
  let state = replay(events);
  assert.equal(Object.keys(state.combat.enemies).length, 3);
  assert.equal(state.combat.initiativeOrder.length, 8);
  assert.equal(commands.createClearCombatCommand(state.combat), null, 'cannot confirm unfinished battle');
  const undone = replay(append(events, 'undo-start', [{type: 'action-corrected', correctedCommandId: 'start-bungalow'}]));
  assert.equal(undone.combat, null);
  assert.equal(undone.flags['olva-bungalow-access-issued'], true, 'undo does not remove Olva access');
  let damageUndoChecked = false;
  for (let turn = 0; turn < 100 && Object.values(state.combat.enemies).some((enemy) => enemy.hp > 0); turn++) {
    const actor = state.combat.initiativeOrder[state.combat.turnIndex];
    const target = Object.values(state.combat.enemies).find((enemy) => enemy.hp > 0).id;
    const attack = heroes.some((hero) => hero.id === actor)
      ? commands.createHeroAttackCommand(context(state), actor, target, 20)
      : commands.createEnemyAttackCommand(context(state), heroes[0].id, 1);
    assert.ok(attack, `legal action for ${actor}`);
    events = append(events, `attack-${turn}`, attack);
    state = replay(events);
    if (state.combat.pendingAttack) {
      const before = state;
      const damage = commands.createApplyCombatDamageCommand(context(state), getPendingDamageRange(state.combat.pendingAttack).max);
      assert.ok(damage);
      events = append(events, `damage-${turn}`, damage.events);
      state = replay(events);
      if (!damageUndoChecked) {
        const rewind = replay(append(events, 'undo-damage', [{type: 'action-corrected', correctedCommandId: `damage-${turn}`} ]));
        assert.deepEqual(rewind.combat, before.combat, 'damage undo restores pending roll, HP and initiative');
        damageUndoChecked = true;
      }
    }
  }
  assert.ok(Object.values(state.combat.enemies).every((enemy) => enemy.hp === 0), 'full production battle ends in victory');
  assert.ok(state.combat.round >= 2);
  const expectation = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};
  const envelope = journal.createStoredGallerySessionEnvelope(events, expectation);
  assert.ok(envelope, 'new encounter journal serializes');
  const restored = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(envelope)), expectation);
  assert.equal(restored.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(replay(restored.events))), JSON.parse(JSON.stringify(state)), 'stored journal restores combat and all serialized state');
  const clear = commands.createClearCombatCommand(state.combat);
  assert.ok(clear);
  assert.equal(replay(append(events, 'clear-bungalow', [clear])).combat, null);
  const conversation = append(events, 'finish-bungalow', [clear,
    {type: 'flag-changed', flag: 'bridge-egorik-bungalow-reveal-egorik-first-rescue-attempt-resolved', value: true},
    {type: 'flag-changed', flag: 'egorik-nastasia-allies', value: true},
  ]);
  assert.equal(isGalleryStoryConditionMet(show.conditions, replay(conversation)), false, 'voices must be tried before the identity reveal');
  const voiceTest = append(conversation, 'test-voices', [{type: 'flag-changed', flag: 'egorik-voices-tested', value: true}]);
  assert.equal(isGalleryStoryConditionMet(show.conditions, replay(voiceTest)), true);
  assert.equal(isGalleryStoryConditionMet(next.conditions, replay(conversation)), false, 'victory alone does not open the route');
  const closeup = append(voiceTest, 'show-bracelet', [
    {type: 'flag-changed', flag: 'egorik-bracelet-visible', value: true},
    {type: 'flag-changed', flag: 'egorik-truth-revealed', value: true},
    ...show.outcome.clues.map((clueId) => ({type: 'clue-revealed', clueId})),
  ]);
  assert.equal(isGalleryStoryConditionMet(back.conditions, replay(closeup)), true);
  assert.equal(isGalleryStoryConditionMet(next.conditions, replay(closeup)), true);
  const returned = append(closeup, 'general-view', [{type: 'flag-changed', flag: 'egorik-bracelet-visible', value: false}]);
  assert.deepEqual(replay(returned).clues, replay(closeup).clues, 'return preserves the revelation');
  assert.equal(isGalleryStoryConditionMet(show.conditions, replay(returned)), true, 'show can be selected again');
  const undoView = replay(append(returned, 'undo-view', [{type: 'action-corrected', correctedCommandId: 'general-view'}]));
  assert.equal(undoView.flags['egorik-bracelet-visible'], true);
  const undoTruth = replay(append(closeup, 'undo-truth', [{type: 'action-corrected', correctedCommandId: 'show-bracelet'}]));
  assert.equal(isGalleryStoryConditionMet(next.conditions, undoTruth), false);
  const savedCloseup = journal.createStoredGallerySessionEnvelope(closeup, expectation);
  const parsedCloseup = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(savedCloseup)), expectation);
  assert.equal(parsedCloseup.ok, true);
  assert.equal(replay(parsedCloseup.events).flags['egorik-bracelet-visible'], true);
  const guide = await readFile('content/campaigns/penisuela-session-preview-guide.md', 'utf8');
  assert.ok(guide.includes(published.readAloud));
  console.log('Egorik bungalow: PASS — assets, combat, delayed truth, route gating, repeatable views, undo and journal restore.');
} finally {
  await server.close();
}
