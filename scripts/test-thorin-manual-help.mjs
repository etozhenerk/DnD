import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false}});
try {
  const load = (path) => server.ssrLoadModule(path);
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes} = await load('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents: replay} = await load('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await load('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const commands = await load('/src/features/run-combat/model/combatCommands.ts');
  const {getCombatHelpingReaction: preview} = await load('/src/features/run-combat/model/combatHelpingReaction.ts');
  const {getCombatHeroAc} = await load('/src/entities/combat/model/combatRules.ts');
  const encounter = definition.encounters.find((entry) => entry.id === 'andrey-dark-elf');
  let serial = 0;
  let log = [];
  const apply = (events) => {
    assert.ok(events);
    const commandId = `command-${++serial}`;
    log.push(...events.map((event) => ({...event, id: `event-${++serial}`, commandId})));
  };
  const state = () => replay(log, definition);
  const context = () => ({...state(), definition, heroes});
  const helping = () => state().combat.statuses.find((status) => status.kind === 'helping-reaction');
  const start = () => {
    log = [journal.createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId: 'seed', commandId: 'seed'})];
    apply([{type: 'combat-started', encounterId: encounter.id, initiativeOrder: [encounter.id, 'linda', 'thorin-pukoshchit']}]);
    assert.equal(helping()?.charges, 1);
  };
  const undo = () => apply([{type: 'action-corrected', correctedCommandId: log.at(-1).commandId}]);
  const persist = () => {
    const expected = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};
    const stored = journal.createStoredGallerySessionEnvelope(log, expected);
    assert.ok(stored);
    const parsed = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(stored)), expected);
    assert.equal(parsed.ok, true);
    assert.deepEqual(JSON.parse(JSON.stringify(replay(parsed.events, definition))), JSON.parse(JSON.stringify(state())));
  };
  const resolveAttack = (roll, help = false) => commands.createEnemyAttackCommand(context(), 'linda', roll, undefined, help);
  const pendingSave = () => apply([{type: 'combat-saving-throw-requested', savingThrow: {
    kind: 'enemy-skill', sourceActorId: encounter.id, sourceName: 'Нетак', targetId: 'linda', targetName: 'Линда',
    stat: 'dexterity', modifier: 0, dc: 12, failureConditions: ['prone'], duration: 'next-turn',
    enemySkill: {actionId: 'netak-mirrors', actionName: 'Проверка помощи', remainingTargetIds: [], damage: 8},
  }}]);

  start();
  const linda = heroes.find((hero) => hero.id === 'linda');
  const ac = getCombatHeroAc(state().combat, linda);
  const roll = ac - state().combat.enemies[encounter.id].attack.bonus;
  assert.ok(roll > 1 && roll < 20);
  const before = context();
  const snapshot = structuredClone(before);
  assert.match(preview(before, 'linda', roll).description, /станет промахом/u);
  assert.deepEqual(before, snapshot, 'preview must not mutate combat or consume charges');
  apply(resolveAttack(roll));
  assert.ok(state().combat.pendingAttack, 'without confirmation the attack still hits');
  assert.equal(helping().charges, 1);
  undo();
  apply(resolveAttack(roll, true));
  assert.equal(state().combat.pendingAttack, null);
  assert.equal(helping(), undefined);
  assert.equal(getCombatHeroAc(state().combat, linda), ac, 'AC boost applies to this attack only');
  persist();
  undo();
  assert.equal(helping().charges, 1);
  assert.equal(state().combat.turnIndex, 0);
  persist();

  for (const invalidRoll of [1, 20, roll - 1, roll + 2]) {
    assert.equal(preview(context(), 'linda', invalidRoll), undefined);
    assert.equal(resolveAttack(invalidRoll, true), null);
  }
  assert.equal(commands.createEnemyAttackCommand(context(), 'thorin-pukoshchit', roll, undefined, true), null);
  for (const blocked of [
    {...context(), heroHp: {...context().heroHp, 'thorin-pukoshchit': 0}},
    {...context(), combat: {...context().combat, conditions: {'thorin-pukoshchit': ['stunned']}}},
    {...context(), participantConditions: {'thorin-pukoshchit': ['downed']}},
    {...context(), combat: {...context().combat, statuses: []}},
  ]) assert.equal(preview(blocked, 'linda', roll), undefined);

  start();
  pendingSave();
  assert.match(preview(context(), 'linda', 10).description, /10 → 12/u);
  apply(commands.createResolveCombatSavingThrowCommand(context(), 10));
  assert.equal(helping().charges, 1);
  const hpWithoutHelp = state().heroHp.linda;
  undo();
  apply(commands.createResolveCombatSavingThrowCommand(context(), 10, undefined, true));
  assert.equal(helping(), undefined);
  assert.equal(state().heroHp.linda, hpWithoutHelp + 4, 'successful save halves damage');
  assert.ok(!state().combat.conditions.linda?.includes('prone'));
  persist();
  undo();
  assert.equal(helping().charges, 1);
  assert.equal(state().combat.pendingSavingThrow.targetId, 'linda');
  for (const invalidRoll of [1, 9, 12, 20]) assert.equal(preview(context(), 'linda', invalidRoll), undefined);

  // The final defensive reroll can be helped, but the first attack roll cannot bypass that reroll.
  start();
  apply([{type: 'combat-status-applied', status: {id: 'wind', kind: 'wind-guard', sourceActorId: 'linda', targetId: 'linda', charges: 2}}]);
  assert.equal(preview(context(), 'linda', roll), undefined);
  apply(resolveAttack(roll));
  assert.equal(state().combat.pendingSavingThrow.kind, 'enemy-attack-reroll');
  assert.ok(preview(context(), 'linda', roll + 1));
  apply(commands.createResolveCombatSavingThrowCommand(context(), roll + 1, undefined, true));
  assert.equal(state().combat.pendingAttack, null);
  assert.equal(helping(), undefined);
  persist();

  // Inspiration and manual assistance consume their own charges only when explicitly selected.
  start();
  pendingSave();
  apply([{type: 'combat-status-applied', status: {id: 'inspired', kind: 'inspired', sourceActorId: 'golovach-lena', targetId: 'linda', charges: 1}}]);
  assert.ok(preview(context(), 'linda', 10, 2));
  apply(commands.createResolveCombatSavingThrowCommand(context(), 10, 2, true));
  assert.equal(helping(), undefined);
  assert.ok(!state().combat.statuses.some((status) => status.id === 'inspired'));
  persist();
  undo();
  assert.equal(helping().charges, 1);
  assert.ok(state().combat.statuses.some((status) => status.id === 'inspired'));
  start();
  assert.equal(helping().charges, 1, 'a new battle restores the shared reaction charge');
  console.log('PASS: manual Thorin AC/save assistance, no automatic spending, preview purity, eligibility, defensive and inspiration rerolls, one shared battle charge, save/load and undo.');
} finally {
  await server.close();
}
