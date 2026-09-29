import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true}});
try {
  const raw = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const ui = await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const {createPlayableCampaign} = await server.ssrLoadModule('/src/entities/campaign-session/model/playableCampaign.ts');
  const {replayGalleryEvents} = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const truth = raw.penisuelaGalleryGameplay.storyTruth;
  const active = new Set(ui.penisuelaSessionPreview.scenes.map(s => s.id));
  const retired = [...truth.legacySceneIds, ...truth.deferredSceneIds];
  assert.equal(active.size, truth.currentRouteSceneIds.length + (truth.optionalSceneIds?.length ?? 0) + truth.badEndingSceneIds.length + Object.keys(truth.compatibilityAliases).length);
  for (const id of retired) {
    assert.ok(!active.has(id), `${id} is absent from the router and GM scene picker`);
    assert.ok(raw.penisuelaSessionPreview.scenes.some(s => s.id === id), 'source retained for saved history');
  }
  assert.ok(!('penisuelaSceneRedirects' in ui), 'retired URL redirects are removed');
  assert.ok(!('interfaceRedirects' in truth), 'canonical data has no retired URL redirect map');
  for (const id of ['artists-dressing-room', 'groom-hypothesis', 'dressing-room-double-fight', 'stage-module-shutdown', 'prokhor-shift-hook', 'prokhor-shift-resolution', 'rail-kraken-fight', 'corp-de-ballet-fight', 'bar-module-shutdown', 'ceremony-villa']) {
    assert.ok(!active.has(id), `${id} is not a playable URL`);
  }
  for (const scene of ui.penisuelaSessionPreview.scenes) {
    assert.ok(!scene.exit || active.has(scene.exit.nextSceneId));
  }
  for (const scene of ui.penisuelaGalleryGameplay.storyScenes) {
    assert.ok(active.has(scene.id));
    for (const action of scene.actions) {
      assert.ok(active.has(action.nextSceneId), `${scene.id}/${action.id}`);
      assert.ok(!action.failureNextSceneId || active.has(action.failureNextSceneId));
    }
  }
  for (const preset of ui.penisuelaDialogueBank.presets) {
    assert.ok(!truth.retiredDialogueCharacterIds.includes(preset.characterId));
    assert.ok(!truth.retiredDialoguePresetIds.includes(preset.id));
    assert.ok(Array.isArray(preset.effects) && Array.isArray(preset.reveals), 'all rendered dialogue must have valid effect lists');
    assert.ok(preset.sceneIds.length);
    assert.ok(preset.sceneIds.every(id => active.has(id) || id === 'tavern-invitation'), preset.id);
  }
  assert.deepEqual(truth.interfaceCounterIds, ['doom', 'kreed-evidence-count', 'preFinalCombats']);
  const olva = ui.penisuelaGalleryGameplay.storyScenes.find(s => s.id === 'bungalow-courtyard');
  for (const id of ['continue-1-couples-session-entry', 'continue-2-groom-tunnel']) {
    const action = olva.actions.find(a => a.id === id);
    assert.equal(action.nextSceneId, id === 'continue-1-couples-session-entry' ? 'guest-bungalows' : 'olva-passes-handoff');
    if (id === 'continue-1-couples-session-entry') assert.equal(action.outcome.inventory, undefined, 'Keys are handed over after the verdict');
    else assert.equal(action.outcome.inventory.quantities['guest-bungalow-pass'], 1);
  }
  assert.equal(olva.actions.find(a => a.id === 'begin-olva-consultation').nextSceneId, 'olva-date-rehearsal');
  const start = journal.createGallerySessionStartedEvent({definition: raw.penisuelaGalleryGameplay, heroes: raw.penisuelaGalleryHeroes, existingInventory: ['guest-bungalow-pass'], eventId: 'seed', commandId: 'seed'});
  const events = [start,
    {type: 'manual-adjustment', adjustment: {kind: 'scene', sceneId: 'final-choice'}, label: 'Old scene', reason: 'Old save', id: 'old-scene', commandId: 'old-scene'},
    {type: 'flag-changed', flag: 'thorin-birkin-received', value: true, id: 'skin', commandId: 'skin'},
    {type: 'story-action-resolved', sceneId: 'last-take-boss', actionId: 'continue-2-post-crisis-orientation-director', result: 'automatic', id: 'old-action', commandId: 'old-action'},
  ];
  assert.deepEqual(replayGalleryEvents(events, ui.penisuelaGalleryGameplay), replayGalleryEvents(events, raw.penisuelaGalleryGameplay), 'presentation filtering must preserve old saves, inventory and outcomes');
  const uiAgain = createPlayableCampaign(ui.penisuelaSessionPreview, ui.penisuelaGalleryGameplay, ui.penisuelaDialogueBank);
  assert.deepEqual(uiAgain.preview, ui.penisuelaSessionPreview, 'projection is idempotent');
  for (const file of ['src/pages/campaign-play/ui/CampaignPlayPage/CampaignPlayPage.tsx', 'src/widgets/campaign-scene/ui/GameMasterConsole/DialoguePresetConsole.tsx']) {
    const source = await readFile(file, 'utf8');
    assert.ok(source.includes('model/playableData'), `${file} must consume the current presentation data`);
  }
  const page = await readFile('src/pages/campaign-play/ui/CampaignPlayPage/CampaignPlayPage.tsx', 'utf8');
  assert.ok(!page.includes('penisuelaSceneRedirects'), 'page does not restore retired URLs');
  assert.ok(page.includes('if (!scene) return <Navigate replace to="/not-found" />;'), 'unknown scenes show Not found');
  console.log(`Active interface PASS: ${active.size} scenes, no legacy URL redirects; exits/actions/failures/dialogue contain no retired scenes, Olva optional, saved history intact.`);
} finally { await server.close(); }
