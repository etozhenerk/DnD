import assert from 'node:assert/strict';
import {penisuelaGalleryGameplay as definition, penisuelaGalleryHeroes as heroes} from '../src/entities/campaign-session/model/data';
import * as rules from '../src/entities/combat/model/combatRules';
import * as cmd from '../src/features/run-combat/model/combatCommands';
import {createCombatArenaView} from '../src/features/run-combat/model/createCombatArenaView';
import {getCombatSavingThrowPresentation} from '../src/entities/combat/model/savingThrowPresentation';
import {getDamageRoll, getRawDiceRange} from '../src/shared/lib/dice/diceExpression';
import type {CombatActionDefinition, CombatEventInput, CombatEvent} from '../src/entities/combat/model/types';

let serial = 0;
const standard = definition.encounters.find(e => e.id === 'hotel-arcane-guards') ?? definition.encounters[0];
function fixture(action?: CombatActionDefinition): cmd.CombatCommandContext {
  const encounter = action ? definition.encounters.find(e => action.encounterIds.includes(e.id)
    && (heroes.some(h => h.id === action.characterId) || e.id === action.characterId || e.units?.some(u => u.id === action.characterId || u.releaseAlly?.id === action.characterId)))! : standard;
  assert.ok(encounter, action?.id);
  const actor = action?.characterId ?? heroes[0].id;
  const enemies = encounter.units?.filter(e => e.kind !== 'object').map(e => e.id) ?? [encounter.id];
  const combat = rules.createCombatState(encounter, [...new Set([actor,...heroes.map(h => h.id),...enemies])], definition);
  for (const enemy of Object.values(combat.enemies)) enemy.hp = enemy.maxHp = 200;
  const guest = encounter.units?.find(u => u.releaseAlly?.id === actor)?.releaseAlly;
  if (guest) combat.allies[actor] = {...guest, maxHp:guest.hp, initiative:0, ownerId:actor, expiresAfterRound:99, remainingTurns:1};
  const ctx = {combat, definition, heroes, heroHp:Object.fromEntries(heroes.map(h => [h.id,h.maxHp - 12])), resourceUses:{}, participantConditions:{}, inventoryState:Object.fromEntries(definition.combatActions.filter(a => a.source === 'item').map(a => [a.sourceId,{ownerId:a.characterId,quantity:1,charges:20,maxCharges:20,chargeScope:'campaign' as const}]))};
  if (action && cmd.getCombatActionActivation(action) !== 'passive') {
    if (action.source === 'item') commit(ctx,cmd.createEquipCombatItemCommand(ctx,action.id));
    else commit(ctx,cmd.createSelectCombatActionCommand(ctx,action.id));
  }
  return ctx;
}
function commit(ctx:cmd.CombatCommandContext, events:CombatEventInput[] | null) {
  assert.ok(events,'Command must resolve');
  for (const event of events) {
    const result = rules.applyCombatEvent(ctx.combat,ctx.heroHp,{...event,id:`audit-${++serial}`,commandId:`audit-${serial}`} as CombatEvent,ctx.definition);
    assert.ok(result.combat);ctx.combat=result.combat;ctx.heroHp=result.heroHp;
    if(event.type==='combat-action-used')ctx.resourceUses[event.resourceKey]=(ctx.resourceUses[event.resourceKey]??0)+1;
  }
}
function arena(ctx:cmd.CombatCommandContext, targetId=Object.keys(ctx.combat.enemies)[0]) {
  return createCombatArenaView({...ctx,actions:definition.combatActions,encounter:definition.encounters.find(e=>e.id===ctx.combat.encounterId)!,heroTokens:{},fallbackEnemyToken:'',requestedEnemyTargetId:targetId,requestedHeroTargetId:'linda'})!;
}
let actionCases=0, passiveCases=0, pendingRolls=0;
const oldRandom = Math.random;
Math.random=()=>{throw new Error('No combat command may hide a dice roll');};
try {
  for (const action of definition.combatActions) {
    if (!action.encounterIds.length) { assert.equal(cmd.getCombatActionActivation(action), 'passive'); continue; }
    const initial = fixture(action);
    if(cmd.getCombatActionActivation(action)==='passive') {
      for(const effect of action.effects) if(effect.type==='apply-status') assert.ok(initial.combat.statuses.some(s=>s.kind===effect.status&&s.targetId===action.characterId),action.id);
      assert.equal(cmd.createUseCombatActionCommand(initial,action.id),null);
      passiveCases++;continue;
    }
    const view = arena(initial);
    const actionView = view.actions.find(a=>a.id===action.id)!;
    assert.ok(actionView,action.id);
    const dice=actionView.rollExpression?getDamageRoll(actionView.rollExpression):null;
    const range=dice?getRawDiceRange(dice):null;
    const values=action.effects.some(e=>e.type==='roll-table')&&range?Array.from({length:range.max-range.min+1},(_,i)=>i+range.min):[range?.min,range?.max];
    for(const roll of [...new Set(values)]) {
      const ctx=fixture(action);
      const enemy=Object.values(ctx.combat.enemies).find(e=>e.kind!=='object')!;
      const target=ctx.combat.enemies[action.characterId]?'linda':action.target==='ally'?heroes.find(h=>h.id!==action.characterId)!.id:enemy.id;
      const before=structuredClone(ctx);
      const events=cmd.getCombatActionActivation(action)==='attack'
        ? ctx.combat.enemies[action.characterId]?cmd.createEnemyAttackCommand(ctx,target,15):cmd.createHeroAttackCommand(ctx,action.characterId,target,15)
        : cmd.createUseCombatActionCommand(ctx,action.id,target,roll);
      assert.ok(events,`${action.id}, roll ${roll}`);
      assert.equal(events.filter(e=>e.type==='combat-action-used').length,1,action.id);
      commit(ctx,events);
      if(ctx.combat.pendingAttack) commit(ctx,cmd.createApplyCombatDamageCommand(ctx,rules.getPendingDamageRange(ctx.combat.pendingAttack)!.min)!.events);
      for(let n=0;ctx.combat.pendingSavingThrow&&n<20;n++) {
        const save=ctx.combat.pendingSavingThrow;
        assert.equal(ctx.combat.initiativeOrder[ctx.combat.turnIndex],save.sourceActorId,action.id);
        assert.ok(getCombatSavingThrowPresentation(save).source);
        assert.ok(arena(ctx).selectedTarget,`${action.id}: pending roll has an actual target`);
        commit(ctx,cmd.createResolveCombatSavingThrowCommand(ctx,getRawDiceRange(getDamageRoll(save.rollExpression??'1d20')!).min));
        pendingRolls++;
      }
      assert.equal(ctx.combat.pendingSavingThrow,null,`${action.id}: queue settles`);
      assert.notDeepEqual(ctx,before,`${action.id}: effect changes state`);
      assert.equal(ctx.resourceUses[cmd.getCombatActionResourceKey(action)],1,action.id);
      assert.equal(cmd.isCombatActionSourceAvailable(action,{...ctx,resourceUses:{[cmd.getCombatActionResourceKey(action)]:action.uses.max}}),false);
      const reloaded = {...ctx, combat: JSON.parse(JSON.stringify(ctx.combat))};
      assert.deepEqual(arena(reloaded), arena(ctx), `${action.id}: restored state presents the same effects`);
      actionCases++;
    }
  }
  // Prone: every attack benefits; standing up is automatic and free.
  const prone=fixture();const enemy=Object.keys(prone.combat.enemies)[0];
  prone.combat.conditions.linda=['prone'];
  assert.equal(rules.getCombatAttackRollMode(prone.combat,enemy,'linda','melee'),'advantage');
  assert.equal(rules.getCombatAttackRollMode(prone.combat,enemy,'linda','ranged'),'advantage');
  prone.combat.turnIndex=prone.combat.initiativeOrder.indexOf('linda')-1;
  commit(prone,[{type:'turn-advanced'}]);
  assert.ok(!prone.combat.conditions.linda.includes('prone'));
  assert.ok(!prone.combat.statuses.some(s=>s.kind==='movement-spent'));
  assert.equal(arena(prone).actions.find(a=>a.id==='linda-flight')!.disabled,false);
  assert.ok(cmd.createSelectCombatActionCommand(prone,'linda-flight'));
  const legacy=structuredClone(prone);
  legacy.combat.statuses.push({id:'old-stand-up',kind:'movement-spent',targetId:'linda',sourceActorId:'linda',charges:1});
  assert.equal(arena(legacy).actions.find(a=>a.id==='linda-flight')!.disabled,false);
  assert.ok(!arena(legacy).active.effects!.some(e=>e.id==='status-old-stand-up'));
  commit(legacy,cmd.createSelectCombatActionCommand(legacy,'linda-flight'));
  commit(legacy,cmd.createUseCombatActionCommand(legacy,'linda-flight'));
  assert.ok(legacy.combat.stances.linda.includes('airborne'));
  assert.ok(cmd.createHeroAttackCommand(prone,'linda',enemy,10));
  for(const participant of ['linda',enemy,'test-summon']) {
    const fallen=fixture();
    fallen.combat.allies['test-summon']={id:'test-summon',name:'Питахайиноид',ownerId:'linda',hp:10,maxHp:10,ac:11,initiative:0,expiresAfterRound:99,remainingTurns:3,attack:{name:'Укус',bonus:4,damage:'1d4+2'}};
    fallen.combat.initiativeOrder=[heroes[0].id,participant];
    fallen.combat.conditions[participant]=['prone'];
    for(const hero of heroes) for(const range of ['melee','ranged'] as const) {
      assert.equal(rules.getCombatAttackRollMode(fallen.combat,hero.id,participant,range),'advantage');
    }
    commit(fallen,[{type:'turn-advanced'}]);
    assert.equal(fallen.combat.initiativeOrder[fallen.combat.turnIndex],participant,'fallen participant keeps its turn');
    assert.ok(!fallen.combat.conditions[participant].includes('prone'));
    assert.ok(!fallen.combat.statuses.some(s=>s.kind==='movement-spent'));
    assert.equal(rules.getCombatAttackRollMode(fallen.combat,'lambert',participant,'ranged'),'normal');
  }
  // Disadvantage cancels advantage, and affects the next attack only.
  prone.combat.conditions.linda=['attack-disadvantage'];
  assert.equal(rules.getCombatAttackRollMode(prone.combat,'linda',enemy),'disadvantage');
  prone.combat.conditions[enemy]=['prone'];
  assert.equal(rules.getCombatAttackRollMode(prone.combat,'linda',enemy),'normal');
  commit(prone,cmd.createHeroAttackCommand(prone,'linda',enemy,1));
  assert.ok(!prone.combat.conditions.linda.includes('attack-disadvantage'));
  // A miss preserves a next-hit bonus; heat only fuels fire.
  const miss=fixture();const actor=miss.combat.initiativeOrder[0];
  miss.combat.statuses.push({id:'bonus',kind:'bonus-damage',targetId:actor,sourceActorId:actor,charges:1});
  commit(miss,cmd.createHeroAttackCommand(miss,actor,enemy,1));assert.ok(miss.combat.statuses.some(s=>s.id==='bonus'));
  // Team bonuses survive the first ally's roll for everyone else.
  const team=fixture();team.combat.attackModifiers.push({id:'team',sourceActorId:actor,targetIds:heroes.map(h=>h.id),amount:2,consumeOnAttack:true});
  commit(team,cmd.createHeroAttackCommand(team,actor,enemy,1));
  assert.equal(team.combat.attackModifiers[0].targetIds.length,heroes.length-1);
  // Jammed prevents secondary tail effects; the attack itself still deals damage.
  const tail=fixture(definition.combatActions.find(a=>a.id==='netak-retake')!);
  tail.combat.statuses.push({id:'jam',kind:'jammed',targetId:'andrey-dragon',sourceActorId:'lambert',charges:2});
  commit(tail,cmd.createEnemyAttackCommand(tail,'linda',15));assert.equal(tail.combat.pendingAttack!.onHitSavingThrow,undefined);
  // Wind uses a visible second d20, charges remain until the reroll is submitted.
  const wind=fixture();wind.combat.turnIndex=wind.combat.initiativeOrder.indexOf(enemy);
  wind.combat.statuses.push({id:'wind',kind:'wind-guard',sourceActorId:'linda',targetId:'linda',charges:2});
  commit(wind,cmd.createEnemyAttackCommand(wind,'linda',20));
  assert.equal(wind.combat.pendingSavingThrow?.kind,'enemy-attack-reroll');assert.equal(wind.combat.statuses.find(s=>s.id==='wind')!.charges,2);
  commit(wind,cmd.createResolveCombatSavingThrowCommand(wind,1));assert.equal(wind.combat.pendingAttack,null);assert.equal(wind.combat.statuses.find(s=>s.id==='wind')!.charges,1);
  // Compulsory targets shown before rolling match the command.
  const force=fixture();force.combat.turnIndex=force.combat.initiativeOrder.indexOf(enemy);
  force.combat.statuses.push({id:'challenge',kind:'beast-challenge',sourceActorId:'thorin-pukoshchit',targetId:enemy,charges:1});
  assert.equal(arena(force).selectedTargetId,'thorin-pukoshchit');
  assert.equal(arena(force).attackRollMode,'disadvantage');
  commit(force,cmd.createEnemyAttackCommand(force,'linda',10));
  // A shared double-shot roll must still beat each target's own AC.
  const doubleAction=definition.combatActions.find(a=>a.effects.some(e=>e.type==='replace-attack'&&e.splitAgainstMultiple))!;
  for (const [firstAc,secondAc] of [[5,30],[30,5],[5,5]]) {
    const shot=fixture(doubleAction);const targets=Object.values(shot.combat.enemies).slice(0,2);
    assert.equal(targets.length,2);targets[0].ac=firstAc;targets[1].ac=secondAc;
    commit(shot,cmd.createHeroAttackCommand(shot,doubleAction.characterId,targets[0].id,10));
    const pending=shot.combat.pendingAttack!;assert.ok(pending);
    assert.equal(pending.targetId,targets[firstAc===30?1:0].id);
    assert.equal(pending.secondaryTargetId,firstAc===5&&secondAc===5?targets[1].id:undefined);
    commit(shot,cmd.createApplyCombatDamageCommand(shot,rules.getPendingDamageRange(pending)!.min)!.events);
    assert.equal(shot.combat.enemies[targets[0].id].hp<200,firstAc===5);
    assert.equal(shot.combat.enemies[targets[1].id].hp<200,secondAc===5);
  }
  // Summons use shared attack buffs and target markers, including their consumption.
  const summon=fixture();const summonId='audit-summon';
  summon.combat.allies[summonId]={id:summonId,name:'Питахайиноид',ownerId:'linda',hp:10,maxHp:10,ac:11,initiative:0,expiresAfterRound:99,remainingTurns:1,attack:{name:'Укус',bonus:4,damage:'1d4+2'}};
  summon.combat.initiativeOrder.unshift(summonId);
  summon.combat.attackModifiers.push({id:'summon-buff',sourceActorId:'linda',targetIds:[summonId],amount:2,consumeOnAttack:true});
  summon.combat.statuses.push({id:'summon-marker',kind:'resonance',targetId:enemy,sourceActorId:'linda',charges:1});
  commit(summon,cmd.createSummonedAllyAttackCommand(summon,summonId,enemy,15));
  assert.equal(summon.combat.pendingAttack?.bonus,6);
  assert.equal(summon.combat.pendingAttack?.bonusDamageDice?.[0].expression,'1d4');
  assert.ok(!summon.combat.statuses.some(s=>s.id==='summon-marker'));
  assert.ok(!summon.combat.attackModifiers.some(s=>s.id==='summon-buff'));
  // Cleansing removes formal negative statuses as well as condition strings.
  const cleanse=fixture(definition.combatActions.find(a=>a.id==='thorin-work-until-pulse-drops')!);
  cleanse.combat.statuses.push({id:'cleanse-burning',kind:'burning',targetId:'thorin-pukoshchit',sourceActorId:enemy,charges:1,amount:3});
  cleanse.combat.conditions['thorin-pukoshchit']=['attack-disadvantage'];
  commit(cleanse,cmd.createUseCombatActionCommand(cleanse,'thorin-work-until-pulse-drops','thorin-pukoshchit'));
  assert.ok(!cleanse.combat.statuses.some(s=>s.id==='cleanse-burning'));
  assert.deepEqual(cleanse.combat.conditions['thorin-pukoshchit'],[]);
  // No recursion when the last participant disappears or all HP are zero.
  const empty=fixture();Object.values(empty.combat.enemies).forEach(e=>e.hp=0);Object.keys(empty.heroHp).forEach(id=>empty.heroHp[id]=0);
  commit(empty,[{type:'turn-advanced'}]);
  console.log(`PASS: ${actionCases} canonical skill cases, ${passiveCases} passive entries, ${pendingRolls} explicit follow-up rolls; prone, disadvantage, group modifiers, miss resources, jam, visible rerolls, forced targets, empty initiative.`);
} finally {Math.random=oldRandom;}
