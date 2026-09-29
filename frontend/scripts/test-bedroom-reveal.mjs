import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true}});
try {
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes, penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents: replay} = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const {getStoryActionAvailability: available} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
  const story = definition.storyScenes.find(scene => scene.id === 'bedroom-reveal');
  const scene = preview.scenes.find(scene => scene.id === story.id);
  const approach = story.actions.find(action => action.id === 'approach-bedroom-door');
  const open = story.actions.find(action => action.id === 'open-bedroom-door');
  const exit = story.actions.find(action => action.id === 'continue-1-igor-unboxing');
  assert.equal(approach.kind, 'automatic');
  assert.equal(open.kind, 'automatic');
  assert.equal(exit.id, 'continue-1-igor-unboxing');
  assert.equal(open.nextSceneId, scene.id);
  assert.equal(exit.nextSceneId, 'igor-unboxing');
  const seed = [journal.createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId: 'seed', commandId: 'seed'})];
  const tour = replay(seed, definition);
  assert.equal(available(approach, tour, definition), true);
  assert.equal(available(open, tour, definition), false, 'Do not skip the existing closed-door shot');
  assert.equal(available(exit, tour, definition), false);
  const approachEvents = [...seed, {id: 'approach', commandId: 'approach', sceneScopeId: scene.id, type: 'story-action-resolved', sceneId: scene.id, actionId: approach.id, result: 'automatic'}, ...Object.entries(approach.outcome.flags).map(([flag, value], index) => ({id: `approach-flag-${index}`, commandId: 'approach', sceneScopeId: scene.id, type: 'flag-changed', flag, value}))];
  const before = replay(approachEvents, definition);
  assert.equal(available(approach, before, definition), false);
  assert.equal(before.counters.doom, tour.counters.doom, 'Approaching the door must not light the fifth milestone');
  assert.equal(Boolean(before.flags['igor-revealed']), false);
  for (const key of ['heroHp', 'resourceUses', 'inventory']) assert.deepEqual(before[key], tour[key]);
  assert.equal(available(open, before, definition), true);
  assert.equal(available(exit, before, definition), false, 'Do not skip first visual reveal');
  assert.doesNotMatch(scene.readAloud + scene.alt, /Игорь|Румянец/);
  const events = [...approachEvents, {id: 'open', commandId: 'open', sceneScopeId: scene.id, type: 'story-action-resolved', sceneId: scene.id, actionId: open.id, result: 'automatic'}, ...Object.entries(open.outcome.flags).map(([flag, value], index) => ({id: `flag-${index}`, commandId: 'open', sceneScopeId: scene.id, type: 'flag-changed', flag, value}))];
  const after = replay(events, definition);
  assert.equal(after.flags['bedroom-door-revealed'], true);
  assert.equal(after.flags['igor-revealed'], true, 'Angel reveal activates the fifth milestone when the door opens');
  assert.equal(after.counters.doom, 1, 'isolated scene contributes exactly one milestone');
  assert.equal(available(open, after, definition), false);
  assert.equal(available(exit, after, definition), true);
  for (const key of ['heroHp', 'resourceUses', 'inventory']) assert.deepEqual(after[key], before[key]);
  const expectation = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};
  const loaded = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(journal.createStoredGallerySessionEnvelope(events, expectation))), expectation);
  assert.equal(loaded.ok, true);
  assert.deepEqual(replay(loaded.events, definition).flags, after.flags);
  const undone = replay([...events, {id: 'undo', commandId: 'undo', type: 'action-corrected', correctedCommandId: 'open', sceneScopeId: scene.id}], definition);
  assert.equal(available(open, undone, definition), true);
  assert.equal(available(exit, undone, definition), false);
  assert.equal(undone.flags['graywise-tour-finished'], true, 'Undo opening restores the closed-door shot');
  const undoApproach = replay([...approachEvents, {id: 'undo-approach', commandId: 'undo-approach', type: 'action-corrected', correctedCommandId: 'approach', sceneScopeId: scene.id}], definition);
  assert.equal(available(approach, undoApproach, definition), true);
  assert.equal(available(open, undoApproach, definition), false);
  const legacy = {...before, flags: {'igor-revealed': true}};
  assert.equal(available(open, legacy, definition), false);
  assert.equal(available(approach, legacy, definition), false);
  assert.equal(available(exit, legacy, definition), true);
  const guide = await readFile('content/campaigns/penisuela-session-preview-guide.md', 'utf8');
  for (const view of [scene, ...scene.interactionViews]) {
    await access(view.background);
    assert.ok(guide.includes(view.readAloud));
  }
  for (const [draft, canonical] of [['bedroom-door-closed-v1.png', 'bedroom-door-closed.png'], ['bedroom-live-reveal-v8.png', 'bedroom-live-reveal.png']]) {
    assert.deepEqual(await readFile(`art-drafts/${draft}`), await readFile(`assets/concepts/campaigns/penisuela/scenes/${canonical}`));
  }
  assert.deepEqual(await readFile('docs/campaigns/penisuela/art-drafts/graywise-villa-tour-v5.png'), await readFile(scene.background));
  console.log('Bedroom PASS: tour → existing closed door → reveal; no premature milestone, costs or skipping; persistence, undo, legacy state, approved images and guide.');
} finally {
  await server.close();
}
