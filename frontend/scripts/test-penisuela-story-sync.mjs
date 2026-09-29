import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true}});
try {
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes, penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents: replay} = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const {isGalleryStoryConditionMet: allowed} = await server.ssrLoadModule('/src/entities/campaign-session/model/galleryGameplay.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  let n = 0;
  const event = (data, commandId = `command-${++n}`) => ({...data, id: `event-${++n}`, commandId});
  const seed = journal.createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId: 'seed', commandId: 'seed'});
  const flag = (name, value = true) => event({type: 'flag-changed', flag: name, value});
  const story = id => definition.storyScenes.find(scene => scene.id === id);
  const action = (scene, id) => story(scene).actions.find(item => item.id === id);
  const apply = (events, outcome) => [...events,
    ...Object.entries(outcome?.flags ?? {}).map(([key, value]) => flag(key, value)),
    ...(outcome?.inventory?.acquire ?? []).map(itemId => event({type: 'item-changed', itemId, acquired: true, quantity: outcome.inventory.quantities?.[itemId] ?? 1})),
  ];
  let events = [seed];
  for (const [index, milestone] of definition.doomMilestones.entries()) {
    const before = replay(events, definition);
    const command = flag(milestone.flag);
    events.push(command);
    assert.equal(replay(events, definition).counters.doom, index + 1);
    assert.equal(replay([...events, flag(milestone.flag)], definition).counters.doom, index + 1, 'repeated scene does not add Doom');
    const undo = event({type: 'action-corrected', correctedCommandId: command.commandId});
    assert.equal(replay([...events, undo], definition).counters.doom, before.counters.doom, 'undo rolls back that milestone');
    assert.equal(replay([...events, event({type: 'counter-changed', counter: 'doom', delta: 1})], definition).counters.doom, index + 1, 'retired failure increments do not affect story Doom');
  }
  assert.equal(replay(events, definition).counters.doom, 5);
  assert.equal(replay(events, definition).flags['netak-bad-ending'], undefined, 'fifth Doom is not defeat');
  const expectation = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};
  const loaded = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(journal.createStoredGallerySessionEnvelope(events, expectation))), expectation);
  assert.ok(loaded.ok);
  assert.equal(replay(loaded.events, definition).counters.doom, 5);
  const exit = action('closed-bar', 'continue-1-guest-bungalows');
  const stas = action('closed-bar', 'receive-stas-bungalow-pass');
  const troupe = action('closed-bar', 'receive-troupe-bungalow-passes');
  const freed = [seed, flag('dance-troupe-freed')];
  assert.equal(allowed(exit.conditions, replay(freed, definition)), false);
  assert.equal(allowed(troupe.conditions, replay(freed, definition)), true, 'old freed save can claim missing passes');
  let passes = apply(apply(freed, stas.outcome), troupe.outcome);
  assert.equal(allowed(exit.conditions, replay(passes, definition)), true);
  assert.equal(allowed(troupe.conditions, replay(passes, definition)), false, 'cannot claim four twice');
  assert.equal(replay(passes, definition).inventoryState['stas-bungalow-pass'].quantity, 1);
  assert.equal(replay(passes, definition).inventoryState['troupe-bungalow-passes'].quantity, 4);
  for (const quantity of [0, 3]) {
    const partial = [...passes, event({type: 'item-changed', itemId: 'troupe-bungalow-passes', acquired: quantity > 0, ...(quantity > 0 ? {quantity} : {})})];
    assert.equal(allowed(exit.conditions, replay(partial, definition)), false, 'one Stas + fewer than four troupe passes cannot exit');
  }
  const olva = action('bungalow-courtyard', 'continue-2-groom-tunnel');
  const wrongPasses = apply(freed, olva.outcome);
  assert.equal(replay(wrongPasses, definition).inventoryState['guest-bungalow-pass'].quantity, 1);
  assert.equal(allowed(exit.conditions, replay(wrongPasses, definition)), false, 'Olva pass does not replace bar district passes');
  const openBedroom = action('bedroom-reveal', 'open-bedroom-door');
  const four = [seed, ...definition.doomMilestones.slice(0, 4).map(m => flag(m.flag))];
  const bedroom = apply(four, openBedroom.outcome);
  assert.equal(replay(bedroom, definition).counters.doom, 5);
  assert.equal(replay(apply(bedroom, action('bedroom-reveal', 'continue-1-igor-unboxing').outcome), definition).counters.doom, 5);
  const guide = await readFile('content/campaigns/penisuela-session-preview-guide.md', 'utf8');
  const canonical = JSON.parse(await readFile('content/campaigns/penisuela-gallery-gameplay.json', 'utf8'));
  const snapshot = JSON.parse(await readFile('docs/campaigns/penisuela/gameplay.json', 'utf8'));
  for (const key of Object.keys(canonical)) assert.deepEqual(snapshot[key], canonical[key], `gameplay snapshot ${key}`);
  const current = new Set([...canonical.storyTruth.currentRouteSceneIds, ...canonical.storyTruth.badEndingSceneIds]);
  for (const scene of preview.scenes.filter(s => current.has(s.id))) {
    for (const view of [scene, ...(scene.interactionViews ?? [])]) assert.ok(!view.readAloud || guide.includes(view.readAloud), `guide contains ${scene.id}/${view.id} narration`);
  }
  assert.deepEqual(JSON.parse(await readFile('docs/campaigns/penisuela/dialogue.json', 'utf8')), JSON.parse(await readFile('content/campaigns/penisuela-dialogue.json', 'utf8')));
  const bank = JSON.parse(await readFile('content/campaigns/penisuela-dialogue.json', 'utf8'));
  const {evaluateDialoguePresetConditions} = await server.ssrLoadModule('/src/entities/campaign-session/model/dialoguePresets.ts');
  for (const preset of bank.presets) {
    const result = evaluateDialoguePresetConditions(preset, replay([seed], definition), null);
    if (preset.characterId === 'last-take-module') assert.equal(result.available, false, 'retired boss presets require explicit legacy context');
  }
  console.log('Story sync PASS: five milestones, no failure penalty, no automatic defeat, undo/reload, 1+4 passes, separate Olva pass, legacy claim, fifth Doom on reveal, canonical/guide parity.');
} finally { await server.close(); }
