import assert from 'node:assert/strict';
import {
  applyCombatEvent,
  createCombatState,
  getCombatAttackRollMode,
  getCombatHeroAc,
  getPendingDamageRoll,
  getPendingDamageRange,
  resolvePendingDamage,
} from '../src/entities/combat/model/combatRules.ts';
import type {
  CombatActionDefinition,
  CombatDefinition,
  CombatEncounterDefinition,
  CombatEvent,
  CombatEventInput,
  CombatHeroSource,
  CombatState,
} from '../src/entities/combat/model/types.ts';
import {
  createApplyCombatDamageCommand,
  createEnemyAttackCommand,
  createHeroAttackCommand,
  createResolveCombatSavingThrowCommand,
  createUseCombatActionCommand,
  resolveAlliedCombatSavingThrowReactions,
  type CombatCommandContext,
} from '../src/features/run-combat/model/combatCommands.ts';

const heroes: CombatHeroSource[] = [
  {
    id: 'golovach-lena',
    name: 'Лена',
    hp: 20,
    maxHp: 20,
    ac: 12,
    stats: {strength: 2, dexterity: 1, constitution: 2, wisdom: 0, intelligence: 1, charisma: 0},
  },
  {
    id: 'thorin-pukoshchit',
    name: 'Торин',
    hp: 20,
    maxHp: 20,
    ac: 12,
    stats: {strength: 2, dexterity: 0, constitution: 2, wisdom: 1, intelligence: 0, charisma: 0},
  },
  {
    id: 'linda',
    name: 'Линда',
    hp: 18,
    maxHp: 18,
    ac: 12,
    stats: {strength: 0, dexterity: 3, constitution: 1, wisdom: 2, intelligence: 0, charisma: 1},
  },
  {
    id: 'lambert',
    name: 'Ламберт',
    hp: 16,
    maxHp: 16,
    ac: 13,
    stats: {strength: 0, dexterity: 3, constitution: 1, wisdom: 1, intelligence: 3, charisma: 0},
  },
];

const encounter: CombatEncounterDefinition = {
  id: 'combat-regression-fixture',
  name: 'Тестовый бой',
  hp: 20,
  ac: 12,
  initiative: 1,
  units: [
    {id: 'enemy-one', name: 'Враг один', hp: 20, ac: 11, initiative: 1},
    {id: 'enemy-two', name: 'Враг два', hp: 20, ac: 14, initiative: 1},
  ],
  attack: {
    id: 'enemy-blade',
    name: 'Удар клинком',
    bonus: 2,
    damage: '1d6',
    range: 'melee',
    damageType: 'physical',
  },
  weakness: {
    stats: ['intelligence'],
    dc: 12,
    reducedAc: 8,
    text: 'Слабость',
  },
  heroAttacks: heroes.map((hero) => ({
    characterId: hero.id,
    name: hero.id === 'lambert' ? 'Выстрел из лука' : 'Удар',
    bonus: 5,
    damage: '1d8+3',
    range: hero.id === 'lambert' ? 'ranged' : 'melee',
    damageType: 'physical',
  })),
  victoryText: 'Тестовые враги побеждены.',
};

const dragonbornArmour: CombatActionDefinition = {
  id: 'lena-dragonborn-armour',
  sourceId: 'dragonborn-armour',
  encounterIds: [encounter.id],
  characterId: 'golovach-lena',
  source: 'item',
  name: 'Драконорождённая броня',
  description: '+2 AC в ближнем бою, −1 холода',
  activation: 'passive',
  target: 'self',
  resolution: 'automatic',
  effects: [{type: 'passive', label: 'Броня'}],
  uses: {scope: 'battle', max: 1},
};

const buldakBreath: CombatActionDefinition = {
  id: 'lena-buldak-breath',
  sourceId: 'buldak-breath',
  encounterIds: [encounter.id],
  characterId: 'golovach-lena',
  source: 'ability',
  name: 'Дыхание Бульдаг',
  description: 'Огненная линия',
  activation: 'action',
  target: 'enemy',
  resolution: 'automatic',
  effects: [{
    type: 'area-damage',
    damage: '2d6+3',
    damageType: 'fire',
    maxTargets: 2,
    savingThrow: {
      stat: 'dexterity',
      dc: 13,
      halfOnSuccess: true,
      failureStatus: 'burning',
    },
  }],
  uses: {scope: 'battle', max: 1},
};

const definition: CombatDefinition = {
  combatActions: [dragonbornArmour, buldakBreath],
  encounters: [encounter],
};

let eventSequence = 0;
function event(input: CombatEventInput): CombatEvent {
  eventSequence += 1;
  return {
    ...input,
    id: `combat-regression-${eventSequence}`,
    commandId: `combat-regression-command-${eventSequence}`,
  } as CombatEvent;
}

function apply(
  combat: CombatState,
  heroHp: Record<string, number>,
  input: CombatEventInput,
) {
  const result = applyCombatEvent(combat, heroHp, event(input), definition);
  assert.ok(result.combat, `event ${input.type} must keep combat active`);
  return {combat: result.combat, heroHp: result.heroHp};
}

function applyMany(
  combat: CombatState,
  heroHp: Record<string, number>,
  inputs: CombatEventInput[],
) {
  return inputs.reduce(
    (state, input) => apply(state.combat, state.heroHp, input),
    {combat, heroHp},
  );
}

function context(
  combat: CombatState,
  heroHp: Record<string, number> = Object.fromEntries(heroes.map((hero) => [hero.id, hero.hp])),
): CombatCommandContext {
  return {
    combat,
    definition,
    heroes,
    heroHp,
    inventoryState: {},
    resourceUses: {},
    participantConditions: {},
  };
}

// Exposed weakness is consumed by the first successful hit and restores each unit's own AC.
{
  const initial = createCombatState(encounter, ['golovach-lena', 'enemy-one', 'enemy-two'], definition);
  const exposed = apply(initial, context(initial).heroHp, {
    type: 'combat-weakness-exposed',
    text: 'Слабость раскрыта.',
  });
  assert.equal(exposed.combat.enemies['enemy-one'].ac, 8);
  assert.equal(exposed.combat.enemies['enemy-two'].ac, 8);
  const attackEvents = createHeroAttackCommand(context(exposed.combat, exposed.heroHp), 'golovach-lena', 'enemy-one', 10);
  assert.ok(attackEvents);
  assert.ok(attackEvents.some((candidate) => candidate.type === 'combat-weakness-cleared'));
  const restored = applyMany(exposed.combat, exposed.heroHp, attackEvents);
  assert.equal(restored.combat.weaknessExposed, false);
  assert.equal(restored.combat.enemies['enemy-one'].ac, 11);
  assert.equal(restored.combat.enemies['enemy-two'].ac, 14);
}

// A critical hit rolls the normal pool once and doubles the entire total.
{
  const attack = {
    actorId: 'golovach-lena',
    actorName: 'Лена',
    targetId: 'enemy-one',
    targetName: 'Враг',
    attackName: 'Удар',
    natural: 20,
    bonus: 5,
    total: 25,
    targetAc: 11,
    critical: true,
    damageExpression: '1d8+3',
    bonusDamageDice: [
      {expression: '1d6', label: 'Пикирование'},
      {expression: '2d4', label: 'Резонанс'},
    ],
  };
  const pendingDamage = getPendingDamageRoll(attack);
  assert.ok(pendingDamage);
  assert.deepEqual(
    pendingDamage.dice.map(({count, sides}) => [count, sides]),
    [[1, 8], [1, 6], [2, 4]],
  );
  assert.equal(pendingDamage.modifier, 3);
  assert.equal(pendingDamage.multiplier, 2);
  assert.deepEqual(getPendingDamageRange(attack), {min: 4, max: 22});
  assert.equal(resolvePendingDamage(attack, 11)?.amount, 28, 'Bonus dice and flat modifier are doubled together');
  assert.equal(resolvePendingDamage({...attack, critical: false}, 11)?.amount, 14);
  assert.equal(resolvePendingDamage(attack, 23), null, 'A critical does not enlarge the raw input range');
  assert.equal(resolvePendingDamage({...attack, damageExpression: '1d8-20', bonusDamageDice: []}, 5)?.amount, 0);
}

// Prone grants advantage to both melee and ranged attacks.
{
  const combat = createCombatState(encounter, ['golovach-lena', 'enemy-one'], definition);
  combat.conditions['enemy-one'] = ['prone'];
  assert.equal(getCombatAttackRollMode(combat, 'golovach-lena', 'enemy-one', 'melee'), 'advantage');
  assert.equal(getCombatAttackRollMode(combat, 'lambert', 'enemy-one', 'ranged'), 'advantage');
}

// Thorin's helping stick protects another ally, never Thorin himself.
{
  const base = createCombatState(encounter, ['enemy-one', 'thorin-pukoshchit', 'linda'], definition);
  base.statuses.push({
    id: 'thorin-helping-reaction',
    kind: 'helping-reaction',
    sourceActorId: 'thorin-pukoshchit',
    targetId: 'thorin-pukoshchit',
    charges: 1,
  });
  const selfAttack = createEnemyAttackCommand(context(base), 'thorin-pukoshchit', 10);
  assert.ok(selfAttack);
  const selfResolution = selfAttack.find((candidate) => candidate.type === 'combat-attack-resolved');
  assert.equal(selfResolution?.type === 'combat-attack-resolved' && selfResolution.hit, true);
  assert.equal(selfAttack.some((candidate) => candidate.type === 'combat-status-removed'), false);

  const withoutHelp = createEnemyAttackCommand(context(base), 'linda', 10)!;
  assert.ok(withoutHelp.some(e=>e.type==='combat-attack-resolved'&&e.hit));
  assert.ok(!withoutHelp.some(e=>e.type==='combat-status-removed'));
  const allyAttack = createEnemyAttackCommand(context(base), 'linda', 10, undefined, true);
  assert.ok(allyAttack);
  const allyResolution = allyAttack.find((candidate) => candidate.type === 'combat-attack-resolved');
  assert.equal(allyResolution?.type === 'combat-attack-resolved' && allyResolution.hit, false);
  assert.equal(allyAttack.some((candidate) => candidate.type === 'combat-status-removed'), true);

  const selfSave = resolveAlliedCombatSavingThrowReactions(context(base), 'thorin-pukoshchit', 10, 0, 12);
  assert.ok(selfSave);
  assert.equal(selfSave.success, false);
  assert.equal(selfSave.events.length, 0);
  const withoutSaveHelp = resolveAlliedCombatSavingThrowReactions(context(base), 'linda', 10, 0, 12)!;
  assert.equal(withoutSaveHelp.success,false);
  assert.equal(withoutSaveHelp.events.length,0);
  const allySave = resolveAlliedCombatSavingThrowReactions(context(base), 'linda', 10, 0, 12, true);
  assert.ok(allySave);
  assert.equal(allySave.success, true);
  assert.equal(allySave.events.length, 1);
}

// Turn-start damage shares the normal temp-HP/survival pipeline and can end or skip a turn.
{
  const withTempHp = createCombatState(encounter, ['enemy-one', 'linda'], definition);
  withTempHp.statuses.push(
    {
      id: 'linda-burning',
      kind: 'burning',
      sourceActorId: 'golovach-lena',
      targetId: 'linda',
      charges: 1,
      amount: 2,
      expiresAtTurnStartOf: 'linda',
    },
    {
      id: 'linda-temp-hp',
      kind: 'temporary-hp',
      sourceActorId: 'linda',
      targetId: 'linda',
      charges: 1,
      amount: 4,
    },
    {
      id: 'linda-survival',
      kind: 'survival-instinct',
      sourceActorId: 'linda',
      targetId: 'linda',
      charges: 1,
    },
  );
  const absorbed = apply(withTempHp, {...context(withTempHp).heroHp, linda: 2}, {type: 'turn-advanced'});
  assert.equal(absorbed.heroHp.linda, 2);
  assert.equal(absorbed.combat.statuses.find((status) => status.id === 'linda-temp-hp')?.amount, 2);
  assert.ok(absorbed.combat.statuses.some((status) => status.id === 'linda-survival'));
  assert.equal(absorbed.combat.statuses.some((status) => status.id === 'linda-burning'), false);

  const lethal = createCombatState(encounter, ['enemy-one', 'linda'], definition);
  lethal.conditions.linda = ['blinded'];
  lethal.statuses.push(
    {
      id: 'linda-burning-lethal',
      kind: 'burning',
      sourceActorId: 'golovach-lena',
      targetId: 'linda',
      charges: 1,
      amount: 5,
      expiresAtTurnStartOf: 'linda',
    },
    {
      id: 'linda-temp-hp-lethal',
      kind: 'temporary-hp',
      sourceActorId: 'linda',
      targetId: 'linda',
      charges: 1,
      amount: 2,
    },
    {
      id: 'linda-survival-lethal',
      kind: 'survival-instinct',
      sourceActorId: 'linda',
      targetId: 'linda',
      charges: 1,
    },
  );
  const survived = apply(lethal, {...context(lethal).heroHp, linda: 2}, {type: 'turn-advanced'});
  assert.equal(survived.heroHp.linda, 1);
  assert.equal(survived.combat.statuses.some((status) => status.id === 'linda-survival-lethal'), false);
  assert.deepEqual(survived.combat.conditions.linda, []);

  const finalEnemy = createCombatState(encounter, ['golovach-lena', 'enemy-one'], definition);
  finalEnemy.enemies['enemy-one'].hp = 2;
  finalEnemy.enemies['enemy-two'].hp = 0;
  finalEnemy.statuses.push({
    id: 'enemy-one-burning-final',
    kind: 'burning',
    sourceActorId: 'golovach-lena',
    targetId: 'enemy-one',
    charges: 1,
    amount: 3,
    expiresAtTurnStartOf: 'enemy-one',
  });
  const victory = apply(finalEnemy, context(finalEnemy).heroHp, {type: 'turn-advanced'});
  assert.equal(victory.combat.enemies['enemy-one'].hp, 0);
  assert.ok(victory.combat.log.includes(encounter.victoryText!));

  const skipDeadEnemy = createCombatState(encounter, ['golovach-lena', 'enemy-one', 'enemy-two'], definition);
  skipDeadEnemy.enemies['enemy-one'].hp = 2;
  skipDeadEnemy.statuses.push({
    id: 'enemy-one-burning-skip',
    kind: 'burning',
    sourceActorId: 'golovach-lena',
    targetId: 'enemy-one',
    charges: 1,
    amount: 3,
    expiresAtTurnStartOf: 'enemy-one',
  });
  const skipped = apply(skipDeadEnemy, context(skipDeadEnemy).heroHp, {type: 'turn-advanced'});
  assert.equal(skipped.combat.enemies['enemy-one'].hp, 0);
  assert.equal(skipped.combat.initiativeOrder[skipped.combat.turnIndex], 'enemy-two');
}

// Dragonborn armour is contextual: melee AC +2 and incoming cold damage -1.
{
  const combat = createCombatState(encounter, ['enemy-one', 'golovach-lena'], definition);
  const lena = heroes.find((hero) => hero.id === 'golovach-lena')!;
  assert.ok(combat.statuses.some((status) => status.kind === 'dragonborn-armour'));
  assert.equal(getCombatHeroAc(combat, lena, 'melee'), lena.ac + 2);
  assert.equal(getCombatHeroAc(combat, lena, 'ranged'), lena.ac);
  combat.pendingAttack = {
    actorId: 'enemy-one',
    actorName: 'Враг',
    targetId: lena.id,
    targetName: lena.name,
    attackName: 'Ледяной удар',
    natural: 15,
    bonus: 2,
    total: 17,
    targetAc: lena.ac + 2,
    critical: false,
    damageExpression: '1d6',
    range: 'melee',
    damageType: 'cold',
  };
  const damage = createApplyCombatDamageCommand(context(combat), 4);
  assert.ok(damage);
  const damageEvent = damage.events.find((candidate) => candidate.type === 'combat-damage-resolved');
  assert.equal(damageEvent?.type === 'combat-damage-resolved' ? damageEvent.amount : null, 3);
  combat.pendingAttack = {...combat.pendingAttack, critical: true, natural: 20, damageExpression: '1d6+3'};
  const criticalDamage = createApplyCombatDamageCommand(context(combat), 4);
  assert.ok(criticalDamage);
  const criticalEvent = criticalDamage.events.find((candidate) => candidate.type === 'combat-damage-resolved');
  assert.equal(criticalEvent?.type === 'combat-damage-resolved' ? criticalEvent.amount : null, 13, 'Armour applies after (4 + 3) × 2');
  assert.match(criticalEvent!.text!, /\(4 \+ 3\) × 2 = 14/);
}

// Buldak uses journalled, explicit damage/save/status rolls and never hides RNG in the command path.
{
  const initial = createCombatState(encounter, ['golovach-lena', 'enemy-one', 'enemy-two'], definition);
  initial.selectedActionIds = [buldakBreath.id];
  const originalRandom = Math.random;
  Math.random = () => {
    throw new Error('Buldak combat commands must not use hidden RNG');
  };
  try {
    assert.equal(
      createUseCombatActionCommand(context(initial), buldakBreath.id, 'enemy-one'),
      null,
      'damage roll is required before staging saves',
    );
    const useEvents = createUseCombatActionCommand(context(initial), buldakBreath.id, 'enemy-one', 7);
    assert.ok(useEvents);
    let staged = applyMany(initial, context(initial).heroHp, useEvents);
    assert.equal(staged.combat.pendingSavingThrow?.kind, 'area-damage-save');
    assert.equal(staged.combat.pendingSavingThrow?.targetId, 'enemy-one');
    assert.equal(staged.combat.pendingSavingThrow?.areaDamage?.damage, 10);
    assert.equal(createResolveCombatSavingThrowCommand(context(staged.combat, staged.heroHp)), null);

    const failedSave = createResolveCombatSavingThrowCommand(context(staged.combat, staged.heroHp), 5);
    assert.ok(failedSave);
    staged = applyMany(staged.combat, staged.heroHp, failedSave);
    assert.equal(staged.combat.enemies['enemy-one'].hp, 10);
    assert.equal(staged.combat.pendingSavingThrow?.kind, 'area-damage-status');
    assert.equal(staged.combat.pendingSavingThrow?.rollExpression, '1d4');

    const burningRoll = createResolveCombatSavingThrowCommand(context(staged.combat, staged.heroHp), 3);
    assert.ok(burningRoll);
    staged = applyMany(staged.combat, staged.heroHp, burningRoll);
    assert.equal(staged.combat.statuses.find((status) => status.targetId === 'enemy-one' && status.kind === 'burning')?.amount, 3);
    assert.equal(staged.combat.pendingSavingThrow?.kind, 'area-damage-save');
    assert.equal(staged.combat.pendingSavingThrow?.targetId, 'enemy-two');

    const successfulSave = createResolveCombatSavingThrowCommand(context(staged.combat, staged.heroHp), 20);
    assert.ok(successfulSave);
    staged = applyMany(staged.combat, staged.heroHp, successfulSave);
    assert.equal(staged.combat.enemies['enemy-two'].hp, 15);
    assert.equal(staged.combat.pendingSavingThrow, null);
    assert.equal(staged.combat.initiativeOrder[staged.combat.turnIndex], 'enemy-one');
    assert.equal(staged.combat.enemies['enemy-one'].hp, 7, 'staged burning resolves on target turn start');
  } finally {
    Math.random = originalRandom;
  }
}

// History is optional: keeping the first roll preserves its charge; only an actual reroll consumes it.
{
  const combat = createCombatState(encounter, ['lambert', 'enemy-two'], definition);
  combat.statuses.push({
    id: 'lambert-inspired',
    kind: 'inspired',
    sourceActorId: 'lambert',
    targetId: 'lambert',
    charges: 1,
  });
  const kept = createHeroAttackCommand(context(combat), 'lambert', 'enemy-two', 10);
  assert.ok(kept);
  const keptAttack = kept.find((candidate) => candidate.type === 'combat-attack-resolved');
  assert.equal(keptAttack?.type === 'combat-attack-resolved' && keptAttack.attack.rollMode, 'normal');
  assert.equal(kept.some((candidate) => candidate.type === 'combat-status-removed'), false);

  const rerolled = createHeroAttackCommand(context(combat), 'lambert', 'enemy-two', 15, 0, 10);
  assert.ok(rerolled);
  const rerolledAttack = rerolled.find((candidate) => candidate.type === 'combat-attack-resolved');
  assert.equal(rerolledAttack?.type === 'combat-attack-resolved' && rerolledAttack.attack.rerolledFrom, 10);
  assert.ok(rerolled.some((candidate) => (
    candidate.type === 'combat-status-removed' && candidate.statusId === 'lambert-inspired'
  )));
  assert.equal(
    createHeroAttackCommand(context({...combat, statuses: []}), 'lambert', 'enemy-two', 15, 0, 10),
    null,
    'journalled reroll provenance requires an available inspiration charge',
  );
}

console.log('Combat regressions passed: weakness, crit dice, prone range, helping stick, periodic damage, armour, Buldak staged rolls, optional History reroll.');
