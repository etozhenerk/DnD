import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
try {
 const load=p=>server.ssrLoadModule(p);
 const {penisuelaGalleryGameplay:definition,penisuelaGalleryHeroes:heroes}=await load('/src/entities/campaign-session/model/data.ts');
 const {replayGalleryEvents:replay}=await load('/src/entities/campaign-session/model/gallerySession.ts');
 const journal=await load('/src/entities/campaign-session/model/gallerySessionJournal.ts');
 const cmd=await load('/src/features/run-combat/model/combatCommands.ts');
 const encounter=definition.encounters.find(e=>e.id==='andrey-dark-elf');
 let serial=0,log=[];
 const apply=events=>{assert.ok(events);const commandId=`c-${++serial}`;log.push(...events.map(e=>({...e,id:`e-${++serial}`,commandId})));};
 const state=()=>replay(log,definition);
 const ctx=()=>({...state(),definition,heroes});
 const start=actor=>{log=[journal.createGallerySessionStartedEvent({definition,heroes,existingInventory:[],eventId:'seed',commandId:'seed'})];apply([{type:'combat-started',encounterId:encounter.id,initiativeOrder:[actor,...heroes.map(h=>h.id).filter(id=>id!==actor),...(actor===encounter.id?[]:[encounter.id])]}]);};
 const persisted=()=>{const expected={campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};const stored=journal.createStoredGallerySessionEnvelope(log,expected);assert.ok(stored);const parsed=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(stored)),expected);assert.equal(parsed.ok,true);assert.deepEqual(JSON.parse(JSON.stringify(replay(parsed.events,definition))),JSON.parse(JSON.stringify(state())));};
 start('bubsilda');apply(cmd.createSelectCombatActionCommand(ctx(),'bubsilda-grandaxin'));apply(cmd.createUseCombatActionCommand(ctx(),'bubsilda-grandaxin',undefined,8));
 assert.equal(state().combat.pendingSavingThrow.kind,'action-healing');persisted();
 const pending=state();apply(cmd.createResolveCombatSavingThrowCommand(ctx(),5));assert.equal(state().combat.pendingSavingThrow,null);persisted();
 apply([{type:'action-corrected',correctedCommandId:log.at(-1).commandId}]);assert.deepEqual(state().combat,pending.combat);persisted();
 start(encounter.id);apply([{type:'combat-status-applied',status:{id:'wind',kind:'wind-guard',sourceActorId:'linda',targetId:'linda',charges:2}}]);
 apply(cmd.createEnemyAttackCommand(ctx(),'linda',20));assert.equal(state().combat.pendingSavingThrow.kind,'enemy-attack-reroll');persisted();
 apply(cmd.createResolveCombatSavingThrowCommand(ctx(),1));assert.equal(state().combat.pendingSavingThrow,null);assert.equal(state().combat.pendingAttack,null);persisted();
 // The inspiration reroll works on a saving throw and is consumed once, with undo support.
 start(encounter.id);apply([{type:'combat-status-applied',status:{id:'inspired-linda',kind:'inspired',sourceActorId:'golovach-lena',targetId:'linda',charges:1}}]);
 apply(cmd.createSelectCombatActionCommand(ctx(),'netak-mirrors'));apply(cmd.createUseCombatActionCommand(ctx(),'netak-mirrors','linda'));
 apply(cmd.createResolveCombatSavingThrowCommand(ctx(),20,1));assert.ok(!state().combat.statuses.some(s=>s.id==='inspired-linda'));assert.equal(state().combat.attackModifiers.find(m=>m.targetIds.includes('linda')).amount,2);persisted();
 apply([{type:'action-corrected',correctedCommandId:log.at(-1).commandId}]);assert.ok(state().combat.statuses.some(s=>s.id==='inspired-linda'));assert.equal(state().combat.pendingSavingThrow.targetId,'linda');persisted();
 // Historical stand-up events remain readable but cannot revive the retired penalty.
 start('linda');apply([{type:'combat-status-applied',status:{id:'legacy-movement',kind:'movement-spent',sourceActorId:'linda',targetId:'linda',charges:1}}]);
 assert.ok(!state().combat.statuses.some(s=>s.kind==='movement-spent'));persisted();
 apply(cmd.createSelectCombatActionCommand(ctx(),'linda-flight'));apply(cmd.createUseCombatActionCommand(ctx(),'linda-flight'));
 assert.ok(state().combat.stances.linda.includes('airborne'));persisted();
 console.log('PASS: schema validation, replay, save/load and undo for explicit Grandaxin healing, defensive attack rerolls, inspiration on saves, and retired stand-up status compatibility.');
}finally{await server.close();}
