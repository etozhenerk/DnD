import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  root: projectRoot,
  server: {middlewareMode: true},
});

try {
  const rules = await server.ssrLoadModule('/src/entities/final-boss/model/finalBossRules.ts');
  const conditionRules = await server.ssrLoadModule('/src/entities/campaign-session/model/conditionRules.ts');
  const definition = JSON.parse(readFileSync(
    new URL('../content/campaigns/penisuela-final-boss.json', import.meta.url),
    'utf8',
  ));

  assert.equal(rules.getFinalBossPhase(definition, 125).number, 1);
  assert.equal(rules.getFinalBossPhase(definition, 86).number, 1);
  assert.equal(rules.getFinalBossPhase(definition, 85).number, 2);
  assert.equal(rules.getFinalBossPhase(definition, 45).number, 3);
  assert.equal(rules.getFinalBossPhase(definition, 0).number, 3);
  assert.equal(rules.capFinalBossDamage(definition, 125, 99), 40);
  assert.equal(rules.capFinalBossDamage(definition, 85, 99), 40);
  assert.equal(rules.capFinalBossDamage(definition, 45, 99), 45);

  const initiative = rules.resolveFinalBossInitiative([
    {id: 'alpha', name: 'Альфа', modifier: 2},
    {id: 'beta', name: 'Бета', modifier: 4},
    {id: 'last-take-module', name: 'Последний дубль', modifier: 4},
  ], {
    alpha: 12,
    beta: 10,
    'last-take-module': 10,
  });
  assert.deepEqual(initiative?.order, ['beta', 'last-take-module', 'alpha']);
  assert.equal(initiative?.entries.find((entry) => entry.id === 'alpha')?.natural, 12);
  assert.equal(rules.resolveFinalBossInitiative([
    {id: 'alpha', name: 'Альфа', modifier: 2},
  ], {alpha: 0}), null);

  assert.equal(rules.getFinalBossEffectiveAttackBonus(6, 6, 9, -1), 8);
  assert.equal(rules.getFinalBossRuntimeAttackBonus(definition, 1), 6);
  assert.equal(rules.getFinalBossRuntimeAttackBonus(definition, 2), 6);
  assert.equal(rules.getFinalBossRuntimeAttackBonus(definition, 3), 6);
  assert.equal(rules.getFinalBossEffectiveAttackBonus(
    6,
    rules.getFinalBossRuntimeAttackBonus(definition, 3),
    6,
  ), 6);
  assert.equal(rules.getFinalBossEffectiveHeroAttackBonus(6, 9, 2, -2), 9);
  assert.equal(rules.getFinalBossEffectiveHeroAttackBonus(6, undefined, 2, -2), 6);
  assert.equal(rules.resolveFinalBossAttackRoll(12, 6, 19)?.hit, false);
  assert.equal(rules.resolveFinalBossAttackRoll(12, 6, 18)?.hit, true);
  assert.deepEqual(rules.resolveFinalBossAttackRoll(1, 99, 10), {
    natural: 1,
    bonus: 99,
    total: 100,
    targetAc: 10,
    critical: false,
    hit: false,
  });
  assert.deepEqual(rules.resolveFinalBossAttackRoll(20, -20, 99), {
    natural: 20,
    bonus: -20,
    total: 0,
    targetAc: 99,
    critical: true,
    hit: true,
  });
  assert.equal(rules.resolveFinalBossAttackRoll(21, 6, 15), null);

  assert.deepEqual(rules.getFinalBossDamageRange('1d8+3'), {min: 1, max: 8});
  assert.deepEqual(rules.getFinalBossDamageRange('1d8+3', true), {min: 1, max: 8});
  assert.equal(rules.resolveFinalBossDamageRoll('1d8+3', false, 5)?.amount, 8);
  assert.equal(rules.resolveFinalBossDamageRoll('1d8+3', true, 5)?.amount, 16);
  assert.equal(rules.resolveFinalBossDamageRoll('1d8+3', true, 9), null);
  assert.equal(rules.resolveFinalBossDamageRoll('1d8+3', false, 9), null);

  assert.equal(rules.resolveFinalBossSavingThrow(1, 99, 13)?.success, false);
  assert.equal(rules.resolveFinalBossSavingThrow(20, -99, 13)?.success, true);
  assert.equal(rules.resolveFinalBossSavingThrow(10, 3, 13)?.success, true);
  assert.equal(rules.resolveFinalBossSavingThrow(10, 2, 13)?.success, false);

  assert.deepEqual(conditionRules.resolveNextFormalActionConditions(['shamed']), {
    blocked: false,
    rollModifier: -2,
    consumedConditionIds: ['shamed'],
  });
  assert.deepEqual(conditionRules.resolveNextFormalActionConditions(['assigned-role']), {
    blocked: true,
    rollModifier: 0,
    consumedConditionIds: ['assigned-role'],
  });
  assert.equal(conditionRules.getParticipantConditionRule('frightened').effect, 'no-mechanical-effect');
  assert.equal(conditionRules.getParticipantConditionRule('custom-condition').effect, 'no-mechanical-effect');

  const director = definition.plans.find((plan) => plan.id === 'director');
  assert.ok(director);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, director, 45, 4, 8)?.dc, 12);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, director, 44, 4, 8)?.dc, 12);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, director, 44, 3, 8)?.success, false);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, director, 44, -99, 20)?.success, true);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, director, 44, 99, 1)?.success, false);

  const standard = definition.plans.find((plan) => plan.id === 'standard');
  const physical = definition.plans.find((plan) => plan.id === 'physical');
  assert.ok(standard && physical);
  assert.equal(rules.isFinalBossPlanAvailable(standard, {
    flags: {'groom-voice-key': true, 'bride-voice-key': true, 'couple-trust': true},
    counters: {timePressure: 0, preFinalCombats: 0},
  }), true);
  assert.equal(rules.isFinalBossPlanAvailable(standard, {
    flags: {'groom-voice-key': true, 'bride-voice-key': false, 'couple-trust': true},
    counters: {timePressure: 0, preFinalCombats: 0},
  }), false);
  assert.equal(rules.isFinalBossPlanAvailable(physical, {
    flags: {},
    counters: {timePressure: 99, preFinalCombats: 99},
  }), true);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, standard, 125, 2, 10)?.success, true);
  assert.equal(rules.resolveFinalBossPlanCheck(definition, physical, 125, 99, 20), null);
  assert.deepEqual(rules.getFinalBossEndingOutcome(standard), {
    endingFlag: 'final-standard-reset',
    endingId: 'wedding',
  });
  assert.deepEqual(rules.getFinalBossEndingOutcome(director), {
    endingFlag: 'final-director-cut',
    endingId: 'director',
  });
  assert.deepEqual(rules.getFinalBossEndingOutcome(physical), {
    endingFlag: 'final-physical-shutdown',
    endingId: 'shutdown',
  });

  console.log('Final boss production fixtures: 51/51 passed');
} finally {
  await server.close();
}
