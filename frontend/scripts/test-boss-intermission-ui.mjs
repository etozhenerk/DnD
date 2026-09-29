import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false}, plugins: [{
  name: 'boss-intermission-hooks', enforce: 'pre',
  transform(code, id) {
    if (id.includes('/src/')) return code.replaceAll("from 'react'", "from '/scripts/helpers/scene-component-harness.mjs'")
      .replaceAll("from 'react-router-dom'", "from '/scripts/helpers/scene-router-harness.mjs'");
  },
}]});
const storage = new Map(), previousWindow = globalThis.window, previousDocument = globalThis.document;
globalThis.window = {location: {pathname: '/campaign/penisuela/play/last-take-boss'}, localStorage: {
  getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
}, addEventListener() {}, removeEventListener() {}};
globalThis.document = {addEventListener() {}, removeEventListener() {}};
try {
  const load = path => server.ssrLoadModule(path);
  const {penisuelaSessionPreview: preview, penisuelaGalleryGameplay: definition} = await load('/src/entities/campaign-session/model/playableData.ts');
  const {AndreyBossAdventure} = await load('/src/widgets/campaign-scene/ui/AndreyBossAdventure/AndreyBossAdventure.tsx');
  const {resetComponent, renderComponent, elements, setContext} = await load('/scripts/helpers/scene-component-harness.mjs');
  const {CampaignPresentationContext} = await load('/src/features/navigate-campaign-scene/model/campaignPresentation.ts');
  const {navigations} = await load('/scripts/helpers/scene-router-harness.mjs');
  const portals = [];
  setContext(CampaignPresentationContext, {updateDoom() {}, enterPortal: target => portals.push(target)});
  const scene = preview.scenes.find(item => item.id === 'last-take-boss');
  let tree, controller;
  const draw = () => {tree = renderComponent(() => AndreyBossAdventure({campaignId: 'penisuela', campaignScenes: preview.scenes, scene})); controller = tree.props.itemController;};
  const node = name => elements(tree.props.interactiveContent).find(item => item.type?.name === name);
  const movie = () => elements(tree.props.interactiveContent).find(item => item.type?.name === 'CombatSkillVideoOverlay' && item.props.ariaLabel.includes('Превращение'));
  const deathMovie = () => elements(tree.props.interactiveContent).find(item => item.type?.name === 'CombatSkillVideoOverlay' && item.props.ariaLabel.includes('Гибель'));
  const reload = () => {resetComponent(); draw();};
  const image = () => tree.props.scene.background.split('/').at(-1);
  reload();
  tree.props.masterActions.find(action => action.id === 'start-andrey-battle').onSelect(); draw();
  assert.equal(controller.state.combat.encounterId, 'andrey-dark-elf');
  assert.equal(tree.props.soundtrackEncounterId, undefined, 'Active combat chooses its own music');
  controller.manualAdjustParticipant('andrey-dark-elf', 'hp', 0); draw();
  node('SceneCombatPanel').props.onCombatResolved(); draw();
  assert.equal(controller.state.combat.encounterId, 'andrey-dark-elf', 'First victory must stay in the shared victory modal');
  assert.equal(movie().props.cue, null);
  assert.equal(node('SceneTextPanel'), undefined);
  reload();
  assert.equal(controller.state.combat.enemies['andrey-dark-elf'].hp, 0, 'Reload retains unconfirmed victory');
  node('SceneCombatPanel').props.onContinue(); draw();
  assert.equal(controller.state.combat, null);
  assert.equal(image(), 'andrey-kneeling.png');
  assert.equal(tree.props.soundtrackEncounterId, 'andrey-dark-elf', 'Kneeling scene retains the battle playlist');
  assert.equal(movie().props.cue, null);
  assert.equal(node('SceneTextPanel').props.primaryAction.label, 'Перейти ко второй фазе');
  assert.equal(node('SceneTextPanel').props.collapsible, false, 'The required continuation remains visible');
  const hp = {...controller.state.heroHp};
  reload();
  assert.equal(image(), 'andrey-kneeling.png'); assert.equal(movie().props.cue, null);
  movie().props.onComplete(); draw(); assert.equal(controller.state.combat, null, 'A stale video callback cannot bypass the button');
  const begin = node('SceneTextPanel').props.primaryAction.onSelect;
  begin(); begin(); draw();
  assert.equal(controller.state.combat, null); assert.equal(movie().props.cue.id, 'andrey-transformation');
  assert.equal(tree.props.soundtrackEncounterId, 'andrey-dark-elf', 'Transformation retains the same battle playlist');
  assert.equal(controller.state.events.filter(event => event.type === 'flag-changed' && event.flag === 'andrey-transformation-started').length, 1);
  reload(); assert.equal(movie().props.cue.id, 'andrey-transformation');
  const end = movie().props.onComplete; end(); end(); draw();
  assert.equal(controller.state.combat.encounterId, 'andrey-dragon');
  assert.equal(tree.props.soundtrackEncounterId, undefined, 'Dragon combat takes over music routing');
  assert.equal(controller.state.combat.enemies['andrey-dragon'].hp, definition.encounters.find(item => item.id === 'andrey-dragon').hp);
  assert.deepEqual(controller.state.heroHp, hp);
  assert.equal(controller.state.events.filter(event => event.type === 'combat-started' && event.encounterId === 'andrey-dragon').length, 1);
  const secondFightStorage = new Map(storage);
  tree.props.onMasterStepBack(); draw();
  assert.equal(controller.state.combat, null); assert.equal(image(), 'andrey-kneeling.png'); assert.equal(movie().props.cue, null);
  tree.props.onMasterStepBack(); draw();
  assert.equal(controller.state.combat.encounterId, 'andrey-dark-elf'); assert.equal(controller.state.combat.enemies['andrey-dark-elf'].hp, 0);
  tree.props.onMasterStepBack(); draw(); assert.ok(controller.state.combat.enemies['andrey-dark-elf'].hp > 0);
  console.log('PASS: victory modal → kneeling scene → explicit button → movie → dragon; reload at every stage, guarded callbacks, preserved HP and staged undo.');

  storage.clear(); for (const [key,value] of secondFightStorage) storage.set(key,value); reload();
  controller.manualAdjustParticipant('andrey-dragon', 'hp', 0); draw();
  node('SceneCombatPanel').props.onCombatResolved(); draw();
  assert.equal(controller.state.combat.encounterId, 'andrey-dragon', 'Second victory also waits for confirmation');
  assert.equal(deathMovie().props.cue, null); assert.equal(portals.length, 0); assert.equal(navigations.length, 0);
  reload(); assert.equal(controller.state.combat.enemies['andrey-dragon'].hp, 0, 'Reload retains the second victory modal');
  const confirm = node('SceneCombatPanel').props.onContinue; confirm(); confirm(); draw();
  assert.equal(controller.state.combat, null);
  assert.equal(deathMovie().props.cue.id, 'andrey-death');
  assert.equal(image(), 'andrey-dragon-dead.png', 'Dead dragon is already underneath the movie, including its fade/skip');
  assert.equal(deathMovie().props.playbackRate, 1);
  assert.equal(portals.length, 0, 'Death movie must finish before the portal');
  assert.equal(navigations.length, 0);
  assert.deepEqual(controller.state.heroHp, hp);
  reload(); assert.equal(deathMovie().props.cue.id, 'andrey-death', 'Reload resumes the pending death movie');
  const deathEnd = deathMovie().props.onComplete; deathEnd(); deathEnd(); draw();
  assert.deepEqual(portals, ['/campaign/penisuela/play/villa-after-andrey']);
  assert.equal(image(), 'andrey-dragon-dead.png', 'The portal covers the dead dragon, never the living combat artwork');
  assert.equal(node('SceneTextPanel'), undefined, 'Portal shows the aftermath artwork without a narration panel');
  assert.equal(navigations.length, 0, 'Navigation belongs to the shared portal midpoint');
  assert.equal(controller.state.events.filter(event => event.type === 'flag-changed' && event.flag === 'andrey-death-video-finished').length, 1);
  assert.equal(deathMovie().props.cue, null);
  draw(); assert.equal(portals.length, 1, 'Re-render does not replay the portal');
  reload(); assert.equal(portals.length, 1, 'Reload after the movie does not replay the portal');
  assert.deepEqual(navigations, ['/campaign/penisuela/play/villa-after-andrey']);
  tree.props.onMasterStepBack(); draw();
  assert.equal(controller.state.combat.enemies['andrey-dragon'].hp, 0, 'Undo confirmation restores the victory modal');
  assert.equal(controller.state.flags['andrey-boss-defeated'], undefined);
  assert.equal(controller.state.flags['andrey-death-video-finished'], undefined);
  tree.props.onMasterStepBack(); draw(); assert.ok(controller.state.combat.enemies['andrey-dragon'].hp > 0);
  console.log('PASS: second victory modal → death movie → shared portal → ruined villa; no early transition, double callbacks, reload and staged undo.');

  // Verify that the shared presenter keeps the portal over the route change.
  resetComponent();
  const {CampaignPresentation} = await load('/src/features/navigate-campaign-scene/ui/CampaignPresentation/CampaignPresentation.tsx');
  const drawPresentation = () => renderComponent(() => CampaignPresentation({children: null}));
  let presentation = drawPresentation();
  const enterPortal = presentation.props.value.enterPortal;
  enterPortal('/campaign/penisuela/play/villa-after-andrey');
  enterPortal('/wrong-target');
  presentation = drawPresentation();
  const portal = elements(presentation).find(item => item.type?.name === 'PortalTransition');
  assert.ok(portal); assert.equal(navigations.length, 1);
  portal.props.onCovered();
  assert.equal(navigations.at(-1), '/campaign/penisuela/play/villa-after-andrey');
  assert.ok(elements(drawPresentation()).some(item => item.type?.name === 'PortalTransition'), 'Portal persists across the covered route change');
  portal.props.onComplete();
  assert.ok(!elements(drawPresentation()).some(item => item.type?.name === 'PortalTransition'));
} finally {
  globalThis.window = previousWindow; globalThis.document = previousDocument; await server.close();
}
