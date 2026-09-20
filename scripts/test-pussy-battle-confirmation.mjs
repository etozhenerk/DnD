import assert from 'node:assert/strict';
import {createServer} from 'vite';

// Exercise the real session controller, including its saved journal, without a browser.
const hooksId = '\0pussy-confirmation-hooks';
const server = await createServer({
  appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false},
  plugins: [{
    name: 'pussy-confirmation-test-hooks', enforce: 'pre',
    resolveId(id) {if (id === 'pussy-confirmation-hooks') return hooksId;},
    load(id) {
      if (id !== hooksId) return;
      return `let slots = [], cursor = 0;
        export function reset() { slots = []; cursor = 0; }
        export function render(fn) { cursor = 0; return fn(); }
        export function useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
          return [slots[i], next => {slots[i] = typeof next === 'function' ? next(slots[i]) : next;}]; }
        export function useMemo(fn) { return fn(); }
        export function useCallback(fn) { return fn; }
        export function useEffect() {}`;
    },
    transform(code, id) {
      if (id.endsWith('/useGallerySession.ts')) return code.replace("from 'react'", "from 'pussy-confirmation-hooks'");
    },
  }],
});

const previousWindow = globalThis.window;
const storage = new Map();
globalThis.window = {localStorage: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
}};
try {
  const {useGallerySession} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/useGallerySession.ts');
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes, penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const hooks = await server.ssrLoadModule('pussy-confirmation-hooks');
  const draw = () => hooks.render(() => useGallerySession(definition, heroes, preview.scenes.map(scene => scene.id), {sceneScopeId: 'pussy-audience'}));
  let controller = draw();
  assert.equal(controller.resolveSceneCheck('earn-pussy-trust', 'lambert', 'charisma', [1]).success, false);
  controller = draw();
  const initialCount = controller.state.counters.preFinalCombats;
  assert.equal(controller.resolveSceneCheck('intimidate-pussy', 'lambert', 'charisma', [1]).success, false);
  controller = draw();
  assert.equal(controller.state.flags['pussy-guards-summoned'], true);
  assert.equal(controller.state.combat, null, 'failed intimidation waits for Accept battle');
  assert.equal(controller.state.counters.preFinalCombats, initialCount);

  hooks.reset();
  controller = draw();
  assert.equal(controller.state.flags['pussy-guards-summoned'], true, 'reload preserves the pending encounter');
  assert.equal(controller.state.combat, null);
  controller.startCombat('hotel-vip-guards');
  controller = draw();
  assert.equal(controller.state.combat.encounterId, 'hotel-vip-guards');
  assert.equal(Object.keys(controller.state.combat.enemies).length, 3);
  assert.equal(controller.state.counters.preFinalCombats, initialCount + 1);
  controller.startCombat('hotel-vip-guards');
  controller = draw();
  assert.equal(controller.state.counters.preFinalCombats, initialCount + 1, 'already active battle cannot start twice');

  controller.undoLastAction();
  controller = draw();
  assert.equal(controller.state.combat, null, 'undo battle returns to pending confirmation');
  assert.equal(controller.state.flags['pussy-guards-summoned'], true);
  assert.equal(controller.state.counters.preFinalCombats, initialCount);
  controller.undoLastAction();
  controller = draw();
  assert.notEqual(controller.state.flags['pussy-guards-summoned'], true, 'undo failed check removes confirmation');
  assert.equal(controller.state.flags['pussy-trust-refused'], true);
  assert.equal(controller.resolveSceneCheck('intimidate-pussy', 'thorin-pukoshchit', 'charisma', [20]).success, true);
  controller = draw();
  assert.equal(controller.state.flags['pussy-intimidated'], true);
  assert.notEqual(controller.state.flags['pussy-guards-summoned'], true);
  assert.equal(controller.state.combat, null);
  assert.equal(controller.state.inventoryState['pussy-sultan-bar-passes'].quantity, 3);
  console.log('PASS: failed intimidation waits, reload, accept battle, one counter increment, undo battle/check, successful intimidation.');
} finally {
  globalThis.window = previousWindow;
  await server.close();
}
