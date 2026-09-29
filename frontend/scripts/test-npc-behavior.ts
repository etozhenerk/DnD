import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  getNpcDecisionOptions,
  selectNpcDecision,
} from '../src/entities/combat/model/npcBehavior.ts';
import type {
  NpcBehaviorContext,
  NpcBehaviorDefinition,
  NpcBehaviorParticipant,
} from '../src/entities/combat/model/npcBehavior.ts';

const enemy: NpcBehaviorParticipant = {
  id: 'enemy',
  name: 'Противник',
  faction: 'enemy',
  hp: 20,
  maxHp: 20,
  ac: 12,
};
const heroes: NpcBehaviorParticipant[] = [
  {id: 'alpha', name: 'Альфа', faction: 'hero', hp: 8, maxHp: 20, ac: 14, threat: 2, stats: {wisdom: 1}},
  {id: 'beta', name: 'Бета', faction: 'hero', hp: 18, maxHp: 20, ac: 12, threat: 7, stats: {wisdom: 4}},
  {id: 'gamma', name: 'Гамма', faction: 'hero', hp: 12, maxHp: 20, ac: 10, threat: 4, stats: {wisdom: 2}},
];

function context(overrides: Partial<NpcBehaviorContext> = {}): NpcBehaviorContext {
  return {
    encounterId: 'fixture',
    actorId: enemy.id,
    round: 1,
    participants: [enemy, ...heroes],
    flags: {},
    resources: {},
    ...overrides,
  };
}

const attackProfile: NpcBehaviorDefinition = {
  id: 'attack-fixture',
  encounterId: 'fixture',
  actorIds: [enemy.id],
  actions: [{
    id: 'attack',
    name: 'Атака',
    category: 'attack',
    target: 'one-opponent',
    baseScore: 100,
    explanation: 'обычная атака',
  }],
  targetPriorities: [
    {rule: 'highest-threat', score: 50, explanation: 'наибольшая угроза'},
  ],
};

assert.deepEqual(
  selectNpcDecision(attackProfile, context()).targetIds,
  ['beta'],
  'attack should focus the highest explicit threat',
);

const noTargetDecision = selectNpcDecision(attackProfile, context({
  participants: [enemy, ...heroes.map((hero) => ({...hero, hp: 0}))],
}));
assert.equal(noTargetDecision.actionId, 'skip', 'no living legal target should produce skip');

const supportActor: NpcBehaviorParticipant = {
  id: 'supporter',
  name: 'Поддержка',
  faction: 'hero',
  hp: 10,
  maxHp: 10,
  ac: 10,
};
const woundedAllies = heroes.map((hero) => ({
  ...hero,
  conditions: hero.id === 'alpha' || hero.id === 'gamma' ? ['shamed'] : [],
}));
const supportProfile: NpcBehaviorDefinition = {
  id: 'support-fixture',
  encounterId: 'fixture',
  actorIds: [supportActor.id],
  actions: [{
    id: 'restore',
    name: 'Поддержать',
    category: 'support',
    target: 'one-ally',
    baseScore: 120,
    explanation: 'снять состояние',
    resourceId: 'assist',
    requiredTargetConditions: ['shamed'],
  }],
  targetPriorities: [
    {rule: 'required-condition', score: 60, explanation: 'есть состояние'},
    {rule: 'most-wounded-ally', score: 40, explanation: 'потеряно больше HP'},
  ],
};
const supportContext = context({
  actorId: supportActor.id,
  participants: [supportActor, ...woundedAllies],
  resources: {assist: 1},
});
assert.deepEqual(
  selectNpcDecision(supportProfile, supportContext).targetIds,
  ['alpha'],
  'support should choose the most wounded ally with the required condition',
);
assert.equal(
  selectNpcDecision(supportProfile, {...supportContext, resources: {assist: 0}}).actionId,
  'skip',
  'an exhausted support resource must make the action illegal',
);

const phaseProfile: NpcBehaviorDefinition = {
  id: 'phase-fixture',
  encounterId: 'fixture',
  actorIds: [enemy.id],
  actions: [
    {id: 'phase-one', name: 'Фаза 1', category: 'phase', target: 'one-opponent', baseScore: 140, explanation: 'первая фаза', phaseIds: ['one']},
    {id: 'phase-two', name: 'Фаза 2', category: 'phase', target: 'one-opponent', baseScore: 140, explanation: 'вторая фаза', phaseIds: ['two']},
  ],
  targetPriorities: [],
};
assert.equal(selectNpcDecision(phaseProfile, context({phaseId: 'two'})).actionId, 'phase-two');

const retreatProfile: NpcBehaviorDefinition = {
  id: 'retreat-fixture',
  encounterId: 'fixture',
  actorIds: [enemy.id],
  actions: [
    {id: 'attack', name: 'Атака', category: 'attack', target: 'one-opponent', baseScore: 100, explanation: 'атаковать'},
    {id: 'retreat', name: 'Отступить', category: 'retreat', target: 'none', baseScore: 300, explanation: 'критический запас HP', actorHpRatioLte: 0.25},
  ],
  targetPriorities: [],
};
assert.equal(
  selectNpcDecision(retreatProfile, context({participants: [{...enemy, hp: 4}, ...heroes]})).actionId,
  'retreat',
  'retreat must outrank attack below the declared HP threshold',
);

const controlProfile: NpcBehaviorDefinition = {
  id: 'control-fixture',
  encounterId: 'fixture',
  actorIds: [enemy.id],
  actions: [{id: 'control', name: 'Контроль', category: 'control', target: 'one-opponent', baseScore: 110, explanation: 'удержать канал'}],
  targetPriorities: [{rule: 'active-channel', score: 100, explanation: 'активный канал'}],
};
assert.deepEqual(
  selectNpcDecision(controlProfile, context({activeChannelTargetId: 'gamma'})).targetIds,
  ['gamma'],
  'control should focus the declared active channel',
);

const equalScoreProfile: NpcBehaviorDefinition = {
  id: 'tie-fixture',
  encounterId: 'fixture',
  actorIds: [enemy.id],
  actions: [
    {id: 'z-action', name: 'Z', category: 'attack', target: 'one-opponent', baseScore: 100, explanation: 'tie'},
    {id: 'a-action', name: 'A', category: 'attack', target: 'one-opponent', baseScore: 100, explanation: 'tie'},
  ],
  targetPriorities: [],
};
const tied = getNpcDecisionOptions(equalScoreProfile, context());
assert.equal(tied[0].actionId, 'a-action', 'equal action scores use stable action id');
assert.deepEqual(tied[0].targetIds, ['alpha'], 'equal target scores use stable target id');
assert.ok(tied[0].legalTargetIds.includes('gamma'), 'legal target list preserves manual target override');

const railProfile: NpcBehaviorDefinition = {
  id: 'rail-fixture',
  encounterId: 'fixture',
  actorIds: [enemy.id],
  actions: [{id: 'charge', name: 'Линия', category: 'phase', target: 'multiple-opponents', baseScore: 150, explanation: 'видимая линия', maxTargets: 4, leaveOneOpponentSafe: true}],
  targetPriorities: [],
};
assert.equal(
  selectNpcDecision(railProfile, context()).targetIds.length,
  heroes.length - 1,
  'telegraphed line must always leave one living opponent safe',
);

const galleryGameplay = JSON.parse(readFileSync(
  new URL('../content/campaigns/penisuela-gallery-gameplay.json', import.meta.url),
  'utf8',
)) as {npcBehaviors: NpcBehaviorDefinition[]};
const finalBoss = JSON.parse(readFileSync(
  new URL('../content/campaigns/penisuela-final-boss.json', import.meta.url),
  'utf8',
)) as {npcBehavior: NpcBehaviorDefinition};
const canonicalShow18 = galleryGameplay.npcBehaviors.find(
  (profile) => profile.id === 'universal-advice-algorithm-behavior',
);
assert.ok(canonicalShow18, 'canonical Show18 behavior profile must exist');
assert.deepEqual(
  selectNpcDecision(canonicalShow18, context({
    encounterId: 'universal-advice-algorithm',
    actorId: 'clickbait-mask',
    participants: [{...enemy, id: 'clickbait-mask'}, ...heroes],
    availableActionIds: ['urgent-conclusion'],
    previousTargetIds: ['alpha'],
  })).targetIds,
  ['beta'],
  'first-round Show18 target selection must avoid an already assigned hero',
);

const canonicalMirror = galleryGameplay.npcBehaviors.find(
  (profile) => profile.id === 'dressing-room-mirror-doubles-behavior',
);
assert.ok(canonicalMirror, 'canonical mirror-double behavior profile must exist');
assert.notEqual(
  selectNpcDecision(canonicalMirror, context({
    encounterId: 'dressing-room-mirror-doubles',
    actorId: 'dressing-room-mirror-double-a',
    participants: [{...enemy, id: 'dressing-room-mirror-double-a'}, ...heroes],
    availableActionIds: ['repeat-encore'],
    previousTargetIds: ['alpha'],
  })).targetIds[0],
  'alpha',
  'mirror double must switch the copied hero after a previous target is recorded',
);

assert.equal(
  selectNpcDecision(finalBoss.npcBehavior, context({
    encounterId: 'last-take-module',
    actorId: 'last-take-module',
    phaseId: 'moving-scenery',
    participants: [{...enemy, id: 'last-take-module'}, ...heroes],
    availableActionIds: ['moving-scenery'],
    activeChannelTargetId: 'gamma',
  })).actionId,
  'moving-scenery',
  'canonical boss profile must switch action with the active phase',
);

console.log('NPC behavior fixtures: 15/15 passed');
