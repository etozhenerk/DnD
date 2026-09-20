import assert from 'node:assert/strict';
import {penisuelaGalleryGameplay as definition, penisuelaGalleryHeroes as heroes} from '../src/entities/campaign-session/model/data';
import {createGallerySessionStartedEvent} from '../src/entities/campaign-session/model/gallerySessionJournal';
import {replayGalleryEvents, type GalleryEvent} from '../src/entities/campaign-session/model/gallerySession';
import {createSelectCombatActionCommand, createUseCombatActionCommand, createEnemyAttackCommand, createApplyCombatDamageCommand} from '../src/features/run-combat/model/combatCommands';

let serial = 0;
const seed = createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId: 'seed', commandId: 'seed'});
let events: GalleryEvent[] = [seed];
const append = (inputs: object[]) => {
  const commandId = `c-${++serial}`;
  events.push(...inputs.map(input => ({...input, id: `e-${++serial}`, commandId}) as GalleryEvent));
};
const state = () => replayGalleryEvents(events, definition);
const ctx = () => ({...state(), combat: state().combat!, definition, heroes});
const guards = definition.encounters.find(e => e.id === 'club-beat-guards')!.units!;
const start = () => append([{type: 'combat-started', encounterId: 'club-beat-guards', initiativeOrder: [...guards.map(g => g.id), ...heroes.map(h => h.id)]}]);
start();
const skills = guards.map(guard => definition.combatActions.find(a => a.characterId === guard.id && a.sourceId === 'beat-resonant-drop')!);
for (const skill of skills) {
  assert.ok(skill, 'Every beat guard must have the same simple skill');
  assert.deepEqual(skill.effects, skills[0].effects);
  assert.deepEqual(skill.uses, {scope: 'battle', max: 1});
  assert.equal(skill.skillVideo, undefined);
  assert.equal(state().combat!.initiativeOrder[state().combat!.turnIndex], skill.characterId);
  append(createSelectCombatActionCommand(ctx(), skill.id)!);
  for (const invalid of [undefined, 0, 5, 2.5]) assert.equal(createUseCombatActionCommand(ctx(), skill.id, undefined, invalid), null);
  const beforeHp = {...state().heroHp};
  const use = createUseCombatActionCommand(ctx(), skill.id, undefined, 4);
  assert.ok(use);
  append(use);
  for (const hero of heroes) assert.equal(state().heroHp[hero.id], beforeHp[hero.id] - 5);
  assert.equal(state().combat!.pendingSavingThrow, null, 'One shared damage roll, no saving throws');
}
for (let i = 0; i < heroes.length; i++) append([{type: 'turn-advanced'}]);
assert.equal(createSelectCombatActionCommand(ctx(), skills[0].id), null, 'Each guard spends its own one-use resource');
assert.deepEqual(replayGalleryEvents(JSON.parse(JSON.stringify(events)), definition).heroHp, state().heroHp);

// Confusion can redirect an attack into a stunned enemy; only the acting enemy must be able to act.
events = [seed];
start();
append([{type: 'combat-condition-changed', participantId: guards[1].id, condition: 'stunned', active: true},
  {type: 'combat-status-applied', status: {id: 'test-confusion', kind: 'confused', sourceActorId: 'lambert', targetId: guards[0].id, charges: 1}}]);
const redirected = createEnemyAttackCommand(ctx(), 'linda', 20);
assert.ok(redirected);
append(redirected);
assert.equal(state().combat!.pendingAttack!.targetId, guards[1].id);
const beforeHp = state().combat!.enemies[guards[1].id].hp;
const damage = createApplyCombatDamageCommand(ctx(), 2);
assert.ok(damage);
append(damage.events);
assert.ok(state().combat!.enemies[guards[1].id].hp < beforeHp);
console.log('PASS: identical simple skill for all four guards, one damage roll, no saves, independent uses, persistence; sarcasm can hit a stunned enemy.');
