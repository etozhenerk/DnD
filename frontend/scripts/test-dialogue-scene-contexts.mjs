import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false}});
try {
  const {getDialogueSceneContexts: contexts} = await server.ssrLoadModule('/src/entities/campaign-session/model/dialoguePresets.ts');
  const {penisuelaSessionPreview: preview, penisuelaDialogueBank: bank} = await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const hall = preview.sceneBlocks.find(block => block.id === 'hall');
  const greeting = bank.presets.find(preset => preset.id === 'pussy-sultan-first-appearance');
  for (const sceneId of hall.sceneIds) {
    assert.ok(contexts(sceneId).has(sceneId));
    assert.ok(greeting.sceneIds.some(id => contexts(sceneId).has(id)), `${sceneId}: hall dialogue bank is reachable`);
  }
  assert.ok(contexts('hotel-overload-search').has('hotel-overload'));
  assert.ok(contexts('closed-bar-device').has('closed-bar'));
  assert.ok(!contexts('groom-tunnel').has('hotel-gallery'), 'dialogue does not leak to unrelated locations');
  console.log('Dialogue contexts PASS: current hall subroutes, search, bar views and unrelated-location isolation.');
} finally { await server.close(); }
