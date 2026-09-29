import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({
  appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false},
  plugins: [{name: 'test-gallery-hook', enforce: 'pre', transform(code, id) {
    if (id.endsWith('/useGallerySession.ts')) {
      return code.replace("from 'react'", "from '/scripts/helpers/gallery-hook-harness.mjs'");
    }
  }}],
});
const storage = new Map();
globalThis.window = {localStorage: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}};

try {
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes,
    penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const {useGallerySession} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/useGallerySession.ts');
  const {resetHooks, renderHook} = await server.ssrLoadModule('/scripts/helpers/gallery-hook-harness.mjs');
  const {ensureSceneCheckpoint, restoreSceneCheckpoint} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/sceneCheckpointStorage.ts');
  const {resolveDanceTrackSelection} = await server.ssrLoadModule('/src/entities/campaign-session/model/dancePuzzleRules.ts');
  const puzzle = definition.dancePuzzle;
  const wrongTracks = puzzle.tracks.filter((track) => !track.correct);
  const correct = puzzle.tracks.find((track) => track.correct);
  const barBlock = preview.sceneBlocks.find((block) => block.id === 'bar');
  const render = () => renderHook(() => useGallerySession(definition, heroes,
    preview.scenes.map((scene) => scene.id), {sceneScopeId: 'closed-bar-device'}));
  let controller;
  const reload = () => { resetHooks(); controller = render(); };
  const fresh = () => { storage.clear(); reload(); };
  const pending = () => Boolean(controller.state.flags['dance-guard-wave-pending']);
  const freed = () => Boolean(controller.state.flags['dance-troupe-freed']);
  const reward = () => controller.state.inventoryState[puzzle.rewardItemId]?.quantity ?? 0;
  const waveCount = () => controller.state.events.filter((event) =>
    event.type === 'combat-started' && event.encounterId === puzzle.wrongTrackPenalty.encounterId).length;
  const startWave = () => {
    assert.equal(controller.startDanceGuardCombat(), true);
    controller = render();
    assert.equal(controller.state.combat.encounterId, puzzle.wrongTrackPenalty.encounterId);
    assert.equal(Object.keys(controller.state.combat.enemies).length, 4);
    assert.equal(pending(), false);
    assert.equal(controller.startDanceGuardCombat(), false, 'active battle cannot be started twice');
  };
  const finishWave = () => {
    for (const enemyId of Object.keys(controller.state.combat.enemies)) {
      assert.equal(controller.manualAdjustParticipant(enemyId, 'hp', 0), true);
      controller = render();
    }
    controller.clearCombat('gallery'); controller = render();
    assert.equal(controller.state.combat, null);
  };

  // Confirmation on a fresh run: success and rewards remain atomic, and a battle is mandatory.
  fresh();
  const entry = structuredClone(controller.state);
  ensureSceneCheckpoint(definition, preview.sceneBlocks, barBlock);
  controller.selectDanceTrack(correct.id); controller = render();
  assert.equal(freed(), true); assert.equal(pending(), true); assert.equal(reward(), 4);
  assert.equal(controller.state.counters.doom, 1);
  assert.equal(controller.state.flags[`dance-track-${correct.id}-rejected`], undefined);
  reload(); assert.equal(pending(), true, 'pending success battle survives reload');
  startWave(); reload();
  const activeEvents = controller.state.events.length;
  controller.selectDanceTrack(wrongTracks[0].id); controller = render();
  assert.equal(controller.state.events.length, activeEvents, 'track confirmation is blocked during combat');
  controller.undoLastAction(); controller = render();
  assert.equal(controller.state.combat, null); assert.equal(pending(), true); assert.equal(reward(), 4);
  controller.undoLastAction(); controller = render();
  assert.equal(freed(), false); assert.equal(pending(), false); assert.equal(reward(), 0);
  assert.equal(controller.state.counters.doom, 0, 'undo reverts success, rewards, Doom and pending battle together');
  reload(); assert.equal(pending(), false);
  controller.selectDanceTrack(correct.id); controller = render(); startWave(); finishWave();
  assert.equal(freed(), true); assert.equal(reward(), 4);
  const completedEvents = controller.state.events.length;
  controller.selectDanceTrack(correct.id); controller = render();
  assert.equal(controller.state.events.length, completedEvents, 'success cannot award or fight again');
  assert.equal(controller.startDanceGuardCombat(), false);

  // Full bar rollback removes battles, success and rewards and permits a fresh first attempt.
  assert.equal(restoreSceneCheckpoint(definition, preview.sceneBlocks, barBlock), true);
  reload();
  assert.deepEqual({...controller.state, events: []}, {...entry, events: []});
  controller.selectDanceTrack(correct.id); controller = render(); reload();
  assert.equal(freed(), true); assert.equal(pending(), true);

  // Each wrong track: two steps back restore an untried puzzle, including after reload.
  for (const track of wrongTracks) {
    fresh(); controller.selectDanceTrack(track.id); controller = render(); startWave();
    controller.undoLastAction(); controller = render();
    assert.equal(controller.state.combat, null); assert.equal(pending(), true);
    controller.undoLastAction(); controller = render();
    assert.equal(pending(), false);
    assert.equal(Boolean(controller.state.flags[`dance-track-${track.id}-rejected`]), false);
    reload(); controller.selectDanceTrack(correct.id); controller = render();
    assert.equal(pending(), true, 'an undone error does not suppress the first-try battle');
  }

  // Each individual wrong candidate and all wrong candidates suppress another battle on the correct answer.
  for (const mistakes of [...wrongTracks.map((track) => [track]), wrongTracks]) {
    fresh();
    for (const track of mistakes) {
      controller.selectDanceTrack(track.id); controller = render();
      assert.equal(freed(), false); assert.equal(reward(), 0); startWave(); finishWave();
    }
    reload();
    assert.equal(waveCount(), mistakes.length);
    controller.selectDanceTrack(correct.id); controller = render();
    assert.equal(freed(), true); assert.equal(pending(), false); assert.equal(reward(), 4);
    assert.equal(waveCount(), mistakes.length, 'correct after an error must not create another wave');
    assert.equal(controller.startDanceGuardCombat(), false);
    controller.undoLastAction(); controller = render();
    assert.equal(freed(), false); assert.equal(reward(), 0); assert.equal(pending(), false);
    controller.selectDanceTrack(correct.id); controller = render();
    assert.equal(pending(), false, 'undoing only the success preserves the earlier error');
  }

  // Defeat fallback also counts as having handled the incorrect song's guards.
  fresh(); controller.selectDanceTrack(wrongTracks[0].id); controller = render(); startWave();
  for (const hero of heroes) {
    controller.manualAdjustParticipant(hero.id, 'hp', 0); controller = render();
  }
  assert.equal(controller.resolveCombatDefeatFallback(), true); controller = render();
  controller.clearCombat('gallery'); controller = render();
  assert.equal(controller.state.combat, null);
  controller.selectDanceTrack(correct.id); controller = render();
  assert.equal(pending(), false); assert.equal(freed(), true);

  assert.equal(resolveDanceTrackSelection(puzzle, {}, 'missing-track').kind, 'blocked');
  const legacyPuzzle = {...puzzle, firstCorrectTrackCombat: undefined};
  assert.equal(resolveDanceTrackSelection(legacyPuzzle, {}, correct.id).summonGuards, false);
  console.log('Dance controller PASS: first-try success, each/all mistakes, victory/defeat, repeated confirmation, atomic undo, reload and whole-bar rollback.');
} finally {
  delete globalThis.window;
  await server.close();
}
