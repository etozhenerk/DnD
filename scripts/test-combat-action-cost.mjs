import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false}});
try {
  const load = (path) => server.ssrLoadModule(path);
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes} = await load('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents: replay} = await load('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await load('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const cmd = await load('/src/features/run-combat/model/combatCommands.ts');
  const {createCombatArenaView} = await load('/src/features/run-combat/model/createCombatArenaView.ts');
  const {getCombatActionCost} = await load('/src/features/run-combat/model/combatActionCost.ts');
  const {getCombatSavingThrowPresentation} = await load('/src/entities/combat/model/savingThrowPresentation.ts');
  const encounter = definition.encounters.find((entry) => entry.id === 'prop-room-winding-carriers');
  const enemyId = encounter.units[0].id;
  const actions = definition.combatActions;
  const additional = actions.filter((action) => ['bonus', 'movement'].includes(cmd.getCombatActionActivation(action)));
  assert.deepEqual(additional.map((action) => action.id).sort(), ['linda-flight', 'linda-tiny-size']);

  function fixture(actor) {
    let serial = 0;
    const log = [journal.createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId: 'seed', commandId: 'seed'})];
    const state = () => replay(log, definition);
    const context = () => ({...state(), definition, heroes});
    const apply = (events) => {
      assert.ok(events);
      const commandId = `c-${++serial}`;
      log.push(...events.map((event) => ({...event, id: `e-${++serial}`, commandId})));
    };
    const view = () => createCombatArenaView({...context(), encounter, actions, heroTokens: {}, fallbackEnemyToken: '', requestedEnemyTargetId: enemyId, requestedHeroTargetId: actor});
    const select = (action) => apply(action.source === 'item'
      ? cmd.createEquipCombatItemCommand(context(), action.id)
      : cmd.createSelectCombatActionCommand(context(), action.id));
    const undo = () => apply([{type: 'action-corrected', correctedCommandId: log.at(-1).commandId}]);
    const persisted = () => {
      const expected = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};
      const stored = journal.createStoredGallerySessionEnvelope(log, expected);
      assert.ok(stored);
      const result = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(stored)), expected);
      assert.equal(result.ok, true);
      assert.deepEqual(JSON.parse(JSON.stringify(replay(result.events, definition))), JSON.parse(JSON.stringify(state())));
    };
    apply([{type: 'combat-started', encounterId: encounter.id, initiativeOrder: [actor, enemyId]}]);
    return {state, context, apply, view, select, undo, persisted};
  }

  for (const id of ['bubsilda-grandaxin', 'bubsilda-ice-heart', 'lena-creative-crisis', 'thorin-work-until-pulse-drops']) {
    const action = actions.find((entry) => entry.id === id);
    const f = fixture(action.characterId);
    f.select(action);
    const before = f.view().actions.find((entry) => entry.id === id);
    assert.equal(before.cost.turnLabel, 'Завершает ход');
    assert.equal(before.cost.badgeLabel, '1/1');
    assert.match(before.cost.limitLabel, id === 'bubsilda-ice-heart' ? /за кампанию/u : /за бой/u);
    f.apply(cmd.createUseCombatActionCommand(f.context(), id, undefined, 3));
    if (id === 'bubsilda-grandaxin') {
      assert.equal(f.state().combat.pendingSavingThrow.kind, 'action-healing');
      assert.match(getCombatSavingThrowPresentation(f.state().combat.pendingSavingThrow).outcome, /ход завершится/u);
      assert.equal(f.state().combat.turnIndex, 0, 'finish the healing die before ending the turn');
      assert.equal(cmd.createHeroAttackCommand(f.context(), action.characterId, enemyId, 10), null);
      f.apply(cmd.createResolveCombatSavingThrowCommand(f.context(), 3));
    }
    assert.equal(f.state().combat.turnIndex, 1, id);
    assert.equal(cmd.createHeroAttackCommand(f.context(), action.characterId, enemyId, 10), null, 'no extra attack');
    f.persisted();
    f.undo();
    if (id === 'bubsilda-grandaxin') {
      assert.equal(f.state().combat.pendingSavingThrow.kind, 'action-healing');
      f.apply(cmd.createResolveCombatSavingThrowCommand(f.context(), 3));
    } else {
      assert.equal(f.view().actions.find((entry) => entry.id === id).cost.badgeLabel, '1/1');
      f.apply(cmd.createUseCombatActionCommand(f.context(), id, undefined, 3));
    }
    f.apply(cmd.createEnemyAttackCommand(f.context(), action.characterId, 1));
    const spent = f.view().actions.find((entry) => entry.id === id);
    assert.equal(spent.cost.badgeLabel, '0/1');
    assert.equal(spent.disabled, true);
    assert.equal(cmd.createSelectCombatActionCommand(f.context(), id), null);
    f.persisted();
  }

  const linda = fixture('linda');
  for (const action of additional) {
    linda.select(action);
    assert.equal(linda.view().actions.find((entry) => entry.id === action.id).cost.turnLabel, 'Ход продолжается');
    linda.apply(cmd.createUseCombatActionCommand(linda.context(), action.id));
    assert.equal(linda.state().combat.turnIndex, 0);
    assert.equal(linda.view().actions.find((entry) => entry.id === action.id).cost.badgeLabel, '0/1');
  }
  linda.apply(cmd.createHeroAttackCommand(linda.context(), 'linda', enemyId, 1));
  linda.apply(cmd.createEnemyAttackCommand(linda.context(), 'linda', 1));
  for (const action of additional) assert.equal(linda.view().actions.find((entry) => entry.id === action.id).cost.badgeLabel, '1/1');
  linda.persisted();

  const thorin = fixture('thorin-pukoshchit');
  assert.equal(thorin.view().actions.find((entry) => entry.id === 'thorin-helping-stick').cost.badgeLabel, '1/1');
  thorin.apply([{type: 'turn-advanced'}]);
  thorin.apply(cmd.createEnemyAttackCommand(thorin.context(), 'linda', 10 - encounter.attack.bonus, undefined, true));
  const spentReaction = thorin.view().actions.find((entry) => entry.id === 'thorin-helping-stick').cost;
  assert.equal(spentReaction.badgeLabel, '0/1');
  assert.equal(spentReaction.turnLabel, 'Не расходует ход');
  assert.match(spentReaction.limitLabel, /Реакция: 1 раз за бой/u);

  const sample = actions.find((action) => action.id === 'lambert-double-shot');
  for (const [scope, label] of Object.entries({turn: 'ход', round: 'раунд', battle: 'бой', location: 'локацию', campaign: 'кампанию'})) {
    const cost = getCombatActionCost({...sample, uses: {scope, max: 2}}, 'attack', 1);
    assert.equal(cost.limitLabel, `2 раза за ${label}`);
    assert.equal(cost.badgeLabel, '1/2');
    assert.match(cost.hint, /После применения: 0 из 2/u);
  }
  assert.equal(getCombatActionCost(sample, 'passive', 0), undefined, 'permanent passives must not show a fake spendable charge');
  console.log('PASS: four skills/items end the turn after all rolls; Linda flight and size keep it; visible limits, counters, scope labels, resource recovery, persistence and undo.');
} finally {
  await server.close();
}
