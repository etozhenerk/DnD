import assert from 'node:assert/strict';
import {createServer} from 'vite';

// Exercise the real scene handlers and saved journal without mounting a browser.
const hooksId = '\0stas-pass-hooks';
const routerId = '\0stas-pass-router';
const server = await createServer({
  appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false},
  plugins: [{
    name: 'stas-pass-test-hooks', enforce: 'pre',
    resolveId(id) {
      if (id === 'stas-pass-hooks') return hooksId;
      if (id === 'stas-pass-router') return routerId;
    },
    load(id) {
      if (id === routerId) return `export const routes = [];
        const navigate = href => routes.push(href);
        export const useNavigate = () => navigate;
        export const useSearchParams = () => [new URLSearchParams('view=stas')];
        export const Navigate = () => null;`;
      if (id !== hooksId) return;
      return `let slots = [], cursor = 0, effects = [], dirty = true;
        const changed = (a,b) => !a || !b || a.length !== b.length || a.some((x,i) => !Object.is(x,b[i]));
        export function reset() {slots.forEach(slot => slot?.cleanup?.()); slots = []; cursor = 0; effects = [];}
        export function render(fn) {cursor = 0; dirty = false; return fn();}
        export function needsRender() {return dirty;}
        export function useState(initial) {const i = cursor++; if (!(i in slots)) slots[i] = {value: typeof initial === 'function' ? initial() : initial};
          return [slots[i].value, next => {const value = typeof next === 'function' ? next(slots[i].value) : next;
            if (!Object.is(value, slots[i].value)) {slots[i].value = value; dirty = true;}}];}
        export function useMemo(fn, deps) {const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = {value: fn(), deps}; return slots[i].value;}
        export function useCallback(fn, deps) {return useMemo(() => fn, deps);}
        export function useEffect(fn, deps) {const i = cursor++; if (changed(slots[i]?.deps, deps)) {const old = slots[i]; slots[i] = {deps};
          effects.push(() => {old?.cleanup?.(); slots[i].cleanup = fn();});}}
        export function flushEffects() {const pending = effects; effects = []; pending.forEach(fn => fn());}`;
    },
    transform(code, id) {
      if (['/useGallerySession.ts', '/ClosedBarAdventure.tsx', '/GuestBungalowsAdventure.tsx'].some(path => id.endsWith(path))) {
        return code.replace("from 'react'", "from 'stas-pass-hooks'")
          .replace("from 'react-router-dom'", "from 'stas-pass-router'");
      }
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
  const {ClosedBarAdventure} = await server.ssrLoadModule('/src/widgets/campaign-scene/ui/ClosedBarAdventure/ClosedBarAdventure.tsx');
  const {GuestBungalowsAdventure} = await server.ssrLoadModule('/src/widgets/campaign-scene/ui/GuestBungalowsAdventure/GuestBungalowsAdventure.tsx');
  const {penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const hooks = await server.ssrLoadModule('stas-pass-hooks');
  const {routes} = await server.ssrLoadModule('stas-pass-router');
  const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  const find = (tree, name) => walk(tree.props.interactiveContent).find(node => node.type?.name === name);
  const action = (tree, id) => tree.props.masterActions.find(item => item.id === id);
  const quantity = (tree, id) => tree.props.itemController.state.inventoryState[id]?.quantity ?? 0;
  let Component = ClosedBarAdventure, sceneId = 'closed-bar';
  const draw = () => {
    for (let i = 0; i < 20; i++) {
      const tree = hooks.render(() => Component({
        campaignId: preview.id, campaignScenes: preview.scenes,
        scene: preview.scenes.find(scene => scene.id === sceneId),
      }));
      hooks.flushEffects();
      if (!hooks.needsRender()) return tree;
    }
    assert.fail('Scene state did not settle');
  };

  let tree = draw();
  assert.equal(find(tree, 'InspectableArtifactDialog'), undefined);
  action(tree, 'receive-stas-bungalow-pass').onSelect(); tree = draw();
  const receipt = find(tree, 'InspectableArtifactDialog');
  assert.equal(receipt.props.title, 'Пропуск Станиса получен');
  assert.equal(receipt.props.artifact.id, 'stas-bungalow-pass');
  assert.ok(receipt.props.artifact.image);
  assert.equal(quantity(tree, 'stas-bungalow-pass'), 1);
  assert.equal(tree.props.itemController.state.flags['stas-bungalow-pass-received'], true);
  assert.equal(action(tree, 'receive-stas-bungalow-pass'), undefined);
  const grantEventCount = tree.props.itemController.state.events.length;
  receipt.props.onClose(); tree = draw();
  assert.equal(find(tree, 'InspectableArtifactDialog'), undefined);
  action(tree, 'show-stas-bungalow-pass').onSelect(); tree = draw();
  assert.ok(find(tree, 'InspectableArtifactDialog'));
  assert.equal(tree.props.itemController.state.events.length, grantEventCount, 'Reopening is not another grant');
  hooks.reset(); tree = draw();
  assert.equal(quantity(tree, 'stas-bungalow-pass'), 1, 'Grant survives reload');
  action(tree, 'show-stas-bungalow-pass').onSelect(); tree = draw();
  assert.ok(find(tree, 'InspectableArtifactDialog'), 'Previously received pass remains viewable');
  tree.props.onMasterStepBack(); tree = draw();
  assert.equal(quantity(tree, 'stas-bungalow-pass'), 0);
  assert.equal(find(tree, 'InspectableArtifactDialog'), undefined, 'Undo closes receipt');
  assert.ok(action(tree, 'receive-stas-bungalow-pass'));

  hooks.reset(); storage.clear(); Component = GuestBungalowsAdventure; sceneId = 'bungalow-courtyard';
  tree = draw();
  action(tree, 'story-continue-2-groom-tunnel').onSelect(); tree = draw();
  assert.equal(routes.at(-1), `/campaign/${preview.id}/play/olva-passes-handoff`);
  hooks.reset(); sceneId = 'olva-passes-handoff'; tree = draw();
  assert.equal(quantity(tree, 'guest-bungalow-pass'), 1);
  const exit = find(tree, 'SceneReturnButton');
  assert.equal(exit.props.children, 'Вернуться к развилке', 'Handoff has a visible exit');
  assert.ok(action(tree, 'olva-handoff-return-to-crossroads'));
  exit.props.onClick(); tree = draw();
  assert.equal(routes.at(-1), `/campaign/${preview.id}/play/guest-bungalows`);
  assert.equal(tree.props.itemController.state.lastStoryAction.actionId, 'continue-1-guest-bungalows');
  assert.equal(quantity(tree, 'guest-bungalow-pass'), 1, 'Exit preserves the received pass');
  const exitEventCount = tree.props.itemController.state.events.length;
  hooks.reset(); tree = draw();
  for (const navigate of [
    find(tree, 'SceneReturnButton').props.onClick,
    action(tree, 'olva-handoff-return-to-crossroads').onSelect,
    find(tree, 'SceneHotspotLayer').props.hotspots[0].onSelect,
  ]) {
    const previousRoutes = routes.length;
    navigate(); tree = draw();
    assert.equal(routes.length, previousRoutes + 1, 'All exits work when revisiting a completed handoff');
    assert.equal(routes.at(-1), `/campaign/${preview.id}/play/guest-bungalows`);
    assert.equal(tree.props.itemController.state.events.length, exitEventCount, 'Revisit does not duplicate the transition');
    assert.equal(quantity(tree, 'guest-bungalow-pass'), 1);
  }
  hooks.reset(); storage.clear(); tree = draw();
  assert.equal(tree.props.to, `/campaign/${preview.id}/play/bungalow-courtyard`, 'Handoff still requires Olivia’s pass');
  console.log('PASS: Stas receipt, close/reopen, reload and undo; Olivia visible exit, canonical transition, saved pass, all three exits after reload, access guard.');
} finally {
  globalThis.window = previousWindow;
  await server.close();
}
