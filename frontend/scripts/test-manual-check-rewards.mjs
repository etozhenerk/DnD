import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false}, plugins: [{
  name: 'manual-reward-hooks', enforce: 'pre',
  transform(code, id) {
    if (id.includes('/src/')) return code.replaceAll("from 'react'", "from '/scripts/helpers/scene-component-harness.mjs'")
      .replaceAll("from 'react-router-dom'", "from '/scripts/helpers/scene-router-harness.mjs'");
  },
}]});
const storage = new Map(), timers = new Map();
const previousWindow = globalThis.window, previousDocument = globalThis.document;
let timerId = 0;
globalThis.window = {location: {pathname: '/campaign/penisuela/play/pussy-audience'}, localStorage: {
  getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
}, setTimeout: fn => {timers.set(++timerId, fn); return timerId;}, clearTimeout: id => timers.delete(id), addEventListener() {}, removeEventListener() {}, dispatchEvent() {}};
globalThis.document = {addEventListener() {}, removeEventListener() {}};
try {
  const load = path => server.ssrLoadModule(path);
  const {penisuelaSessionPreview: preview, penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes} = await load('/src/entities/campaign-session/model/playableData.ts');
  const {useGallerySession} = await load('/src/features/navigate-campaign-scene/model/useGallerySession.ts');
  const {CampaignPresentation} = await load('/src/features/navigate-campaign-scene/ui/CampaignPresentation/CampaignPresentation.tsx');
  const {createManualCheckRewardObserver} = await load('/src/features/navigate-campaign-scene/model/manualCheckRewards.ts');
  const {writeGallerySessionEvents} = await load('/src/features/navigate-campaign-scene/model/gallerySessionStorage.ts');
  const {triggerCriticalRollEffect} = await load('/src/shared/lib/dice/criticalRollEffect.ts');
  const {resetComponent, renderComponent, elements} = await load('/scripts/helpers/scene-component-harness.mjs');
  const expectation = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};
  const sceneIds = preview.scenes.map(scene => scene.id);
  let tree, controller;
  const draw = async () => {
    for (let i = 0; i < 3; i++) {
      renderComponent(() => {tree = CampaignPresentation({children: null}); controller = useGallerySession(definition, heroes, sceneIds, {sceneScopeId: 'pussy-audience'});});
      await Promise.resolve();
    }
  };
  const notice = () => elements(tree).find(item => item.type?.name === 'ManualCheckRewardDialog');
  const dismiss = async () => {assert.ok(notice(), 'Reward must be visible'); notice().props.onClose(); await draw();};
  const expireCritical = async () => {for (const [id, fn] of timers) {timers.delete(id); fn();} await draw();};
  await draw();
  assert.equal(notice(), undefined, 'New session must not grant coins');
  const initial = controller.state.events;
  const inventory = [...controller.state.inventory];
  triggerCriticalRollEffect(20);
  await draw();
  await expireCritical();
  assert.equal(notice(), undefined, 'Rolling a digital 20 without confirming a check must not grant coins');
  triggerCriticalRollEffect(20);
  controller.resolveStoryActionCheck('pussy-audience', 'earn-pussy-trust', 'lambert', 'charisma', [20]);
  await draw();
  assert.equal(controller.state.lastRoll.success, true);
  assert.equal(notice(), undefined, 'Wait for the critical effect to finish');
  await expireCritical();
  assert.equal(notice().props.notice.text, definition.manualCheckReward.criticalSuccessText);
  assert.deepEqual(controller.state.inventory, inventory, 'Coin never enters inventory');
  const committed = controller.state.events;
  await dismiss();
  writeGallerySessionEvents(expectation, committed);
  await draw();
  assert.equal(notice(), undefined, 'Duplicate write/effect cannot replay a reward');
  resetComponent(); await draw();
  assert.equal(notice(), undefined, 'Reload must stay silent');
  controller.undoLastAction(); await draw();
  assert.equal(notice(), undefined, 'Undo cannot grant a coin');

  // Olivia's handoff no longer grants a coin; the bonus moved to the first outfit quest.
  assert.equal(controller.commitStoryAction('olva-date-rehearsal', 'table-claim-reward'), false);
  await draw(); assert.equal(notice(), undefined);
  controller.commitStoryOutcome({flags: {'olva-table-complete': true, 'olva-table-reward-shown': true}}); await draw();
  assert.equal(controller.commitStoryAction('olva-date-rehearsal', 'table-claim-reward'), true); await draw();
  assert.equal(notice(), undefined);
  assert.equal(controller.state.flags['olva-table-reward-claimed'], true);
  assert.equal(controller.commitStoryAction('olva-date-rehearsal', 'table-claim-reward'), false); await draw();
  assert.equal(notice(), undefined);
  controller.commitStoryOutcome({flags: {'alexis-room-resolved': true, 'alexis-style-stabilized': true}}); await draw();
  assert.equal(notice().props.notice.text, definition.manualCheckReward.questRewards[0].text);
  await dismiss();
  controller.commitStoryOutcome({flags: {'alexis-style-stabilized': true}}); await draw();
  assert.equal(notice(), undefined, 'Already completed outfit does not grant another quest coin');
  controller.startCombat('hotel-vip-guards'); await draw();
  assert.ok(controller.state.combat);
  const combatEvents = controller.state.events;

  let sequence = 0;
  const roll = (overrides = {}) => ({id: `test-roll-${++sequence}`, commandId: `test-command-${sequence}`, type: 'roll-entered', result: {
    checkId: 'calm-alexis', heroId: 'lambert', stat: 'charisma', rolls: [20], modifier: 3, total: 23, dc: 12, success: true, automatic: false, text: 'Успех', ...overrides,
  }});
  const expectReward = (event, count, base = initial) => {
    const observe = createManualCheckRewardObserver(base, definition);
    assert.equal(observe([...base, event]).notices.length, count);
  };
  expectReward(roll(), 1);
  expectReward(roll({rolls: [7, 20]}), 1);
  expectReward(roll({rolls: [20, 20]}), 1, initial);
  expectReward(roll({rolls: [17], total: 20}), 0);
  expectReward(roll({rolls: [], automatic: true, total: 12}), 0);
  expectReward(roll({rolls: [20], automatic: true}), 0);
  expectReward(roll({rolls: [1], total: 4, success: false}), 0);
  expectReward(roll(), 0, combatEvents);
  // A noncombat critical can itself start a fight; it still earns a coin.
  const combatStart = combatEvents.find(event => event.type === 'combat-started');
  assert.ok(combatStart);
  assert.equal(createManualCheckRewardObserver(initial, definition)([...initial, roll(), combatStart]).notices.length, 1);
  assert.equal(createManualCheckRewardObserver(initial, definition)([...initial, combatStart, roll()]).notices.length, 0);
  assert.equal(createManualCheckRewardObserver(committed, definition)(committed).notices.length, 0);

  // Two live events survive navigation and dismiss independently, even on repeated clicks.
  controller.resetSession(); await draw();
  const base = controller.state.events, first = roll(), second = roll();
  const events = [...base, first, second];
  writeGallerySessionEvents(expectation, events); await draw();
  assert.equal(notice().props.notice.id, first.id);
  const closeFirst = notice().props.onClose;
  closeFirst(); closeFirst(); await draw();
  assert.equal(notice().props.notice.id, second.id);
  await dismiss(); assert.equal(notice(), undefined);
  writeGallerySessionEvents(expectation, [...events, {id: 'nav', commandId: 'nav', type: 'scene-navigated', fromPath: '/campaign/penisuela/play/pussy-audience', toPath: '/campaign/penisuela/play/pussy-prop-room'}]);
  await draw(); assert.equal(notice(), undefined);
  assert.ok([...storage.keys()].every(key => !/coin|manual.reward/u.test(key)), 'No coin storage key');
  assert.ok(controller.state.events.every(event => !/coin|manual.reward/u.test(event.type)), 'No coin journal event');
  resetComponent();
  console.log('PASS: confirmed noncombat natural 20; advantage; total 20 and automatic exclusions; combat boundary; effect ordering; Alexis outfit bonus (no Olivia coin); queue/dedup/reload/undo; no coin inventory or persistence.');
} finally {
  globalThis.window = previousWindow; globalThis.document = previousDocument;
  await server.close();
}
