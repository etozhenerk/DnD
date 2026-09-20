import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
try {
  const load = path => server.ssrLoadModule(path);
  const {penisuelaGalleryGameplay:definition,penisuelaGalleryHeroes:heroes} = await load('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents:replay} = await load('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await load('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const cmd = await load('/src/features/run-combat/model/combatCommands.ts');
  const rules = await load('/src/entities/combat/model/combatRules.ts');
  const {createNpcDecisionView:npcView} = await load('/src/features/navigate-campaign-scene/model/npcDecision.ts');
  const {createCombatArenaView:arenaView} = await load('/src/features/run-combat/model/createCombatArenaView.ts');
  function fixture(action) {
    let serial=0,log=[journal.createGallerySessionStartedEvent({definition,heroes,existingInventory:[],eventId:'seed',commandId:'seed'})];
    const state=()=>replay(log,definition),ctx=()=>({...state(),definition,heroes});
    const apply=events=>{assert.ok(events,'valid command');const commandId=`c-${++serial}`;log.push(...events.map(e=>({...e,id:`e-${++serial}`,commandId})));};
    const active=()=>state().combat.initiativeOrder[state().combat.turnIndex];
    const turnTo=id=>{for(let n=0;active()!==id&&n<50;n++)apply([{type:'turn-advanced'}]);assert.equal(active(),id);};
    const persist=()=>{const expectation={campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};const envelope=journal.createStoredGallerySessionEnvelope(log,expectation);const restored=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(envelope)),expectation);assert.equal(restored.ok,true);assert.deepEqual(JSON.parse(JSON.stringify(replay(restored.events,definition))),JSON.parse(JSON.stringify(state())));};
    const undo=()=>apply([{type:'action-corrected',correctedCommandId:log.at(-1).commandId}]);
    const encounter=definition.encounters.find(e=>e.id===action.encounterIds[0]);
    apply([{type:'combat-started',encounterId:encounter.id,initiativeOrder:[action.characterId,...heroes.map(h=>h.id),...encounter.units.filter(u=>u.id!==action.characterId&&u.kind!=='object').map(u=>u.id)]}]);
    const view=()=>arenaView({...ctx(),encounter,actions:definition.combatActions,heroTokens:{},fallbackEnemyToken:'',requestedEnemyTargetId:action.characterId,requestedHeroTargetId:'bubsilda'});
    const npc=()=>npcView({actorId:action.characterId,definition,heroes,state:state()});
    return {state,ctx,apply,active,turnTo,persist,undo,encounter,view,npc};
  }
  const mobSkills=definition.combatActions.filter(a=>/^(carrier-trip|vip-pacify|arcane-access-denied|bungalow-frost-circle)-/u.test(a.id));
  assert.equal(mobSkills.length,12);
  for(const action of mobSkills) {
    const f=fixture(action),initial=f.state();
    assert.ok(f.npc().options.some(o=>o.actionId===action.id));
    assert.ok(f.npc().options.some(o=>o.actionId===f.encounter.attack.id));
    assert.equal(f.view().actions.find(a=>a.id===action.id).cost.badgeLabel,'1/1');
    f.apply(cmd.createSelectCombatActionCommand(f.ctx(),action.id));
    f.apply(cmd.createSelectCombatActionCommand(f.ctx(),action.id)); // explicit return to base attack
    assert.equal(f.view().active.attackName,f.encounter.attack.name);
    assert.equal(f.state().resourceUses[cmd.getCombatActionResourceKey(action)]??0,0);
    f.apply(cmd.createEnemyAttackCommand(f.ctx(),'linda',1)); // basic miss cannot spend a skill
    assert.equal(f.state().resourceUses[cmd.getCombatActionResourceKey(action)]??0,0);
    f.turnTo(action.characterId);f.apply(cmd.createSelectCombatActionCommand(f.ctx(),action.id));
    if(action.activation==='attack') {
      assert.notEqual(f.view().active.attackName,f.encounter.attack.name);
      f.apply(cmd.createEnemyAttackCommand(f.ctx(),'bubsilda',20));
      f.apply(cmd.createApplyCombatDamageCommand(f.ctx(),rules.getPendingDamageRange(f.state().combat.pendingAttack).min).events);
    } else {
      for(const invalid of [undefined,0,99,1.5])assert.equal(cmd.createUseCombatActionCommand(f.ctx(),action.id,'bubsilda',invalid),null);
      f.apply(cmd.createUseCombatActionCommand(f.ctx(),action.id,'bubsilda',action.id.startsWith('arcane')?6:10));
    }
    assert.equal(f.active(),action.characterId,'save is part of the enemy turn');
    assert.equal(cmd.createEnemyAttackCommand(f.ctx(),'linda',10),null,'no extra attack during saves');
    let saves=0;
    while(f.state().combat.pendingSavingThrow) {
      f.persist();const before=f.state().heroHp; const target=f.state().combat.pendingSavingThrow.targetId;
      f.apply(cmd.createResolveCombatSavingThrowCommand(f.ctx(),1));saves++;
      const after=f.state().heroHp;
      if(action.id.startsWith('bungalow')) assert.equal(before[target]-after[target],target==='bubsilda'?6:target==='golovach-lena'?11:12);
      f.undo();assert.deepEqual(f.state().heroHp,before);assert.equal(f.state().combat.pendingSavingThrow.targetId,target);
      f.apply(cmd.createResolveCombatSavingThrowCommand(f.ctx(),1));
    }
    assert.equal(saves,action.activation==='attack'?1:action.id.startsWith('arcane')?2:5);
    assert.notEqual(f.active(),action.characterId);
    assert.ok(!(f.state().combat.conditions.bubsilda??[]).includes('prone'));
    if(action.id.startsWith('bungalow'))assert.equal(f.state().combat.statuses.find(s=>s.kind==='heat-charge')?.amount,2);
    f.turnTo(action.characterId);
    assert.equal(cmd.createSelectCombatActionCommand(f.ctx(),action.id),null);
    assert.equal(f.view().actions.find(a=>a.id===action.id).cost.badgeLabel,'0/1');
    assert.ok(!f.npc().options.some(o=>o.actionId===action.id));
    assert.ok(f.npc().options.some(o=>o.actionId===f.encounter.attack.id));
    f.persist();assert.notDeepEqual(f.state().heroHp,initial.heroHp);
  }
  // Cold saves: halve on success, halve resistance, then armour; heat survives into the fire action.
  const cold=mobSkills.find(a=>a.id==='bungalow-frost-circle-a');const f=fixture(cold);
  f.apply(cmd.createSelectCombatActionCommand(f.ctx(),cold.id));f.apply(cmd.createUseCombatActionCommand(f.ctx(),cold.id,'bubsilda',10));
  while(f.state().combat.pendingSavingThrow)f.apply(cmd.createResolveCombatSavingThrowCommand(f.ctx(),20));
  assert.equal(f.state().heroHp.bubsilda,38-3);assert.equal(f.state().heroHp['golovach-lena'],42-5);
  f.turnTo('golovach-lena');
  const fire=f.view().actions.find(a=>a.name==='Дыхание Бульдаг');
  assert.equal(fire.rollExpression,'2d6+5');assert.match(fire.effectLabel,/жар \+2 учтён/);
  f.apply(cmd.createHeroAttackCommand(f.ctx(),'golovach-lena',cold.characterId,20));
  assert.ok(!f.state().combat.statuses.some(s=>s.kind==='heat-charge'));
  assert.equal(f.state().combat.pendingAttack.damageExpression,'1d10+5');
  // Canonical sandbox uses the actual enemies, skills and limits, not weaker copies.
  const {combatSandboxDefinition:sandbox}=await load('/src/widgets/combat-sandbox/model/combatSandboxFixture.ts');
  assert.deepEqual(sandbox.encounters,definition.encounters);assert.deepEqual(sandbox.combatActions,definition.combatActions);
  console.log('PASS: 12 enemy skills, base/skill choice, usage, NPC options, attack/save ordering, cold passives and heat, immunity, persistence, undo, canonical sandbox.');
} finally {await server.close();}
