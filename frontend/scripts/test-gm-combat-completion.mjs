import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{name:'gm-completion-hooks',enforce:'pre',transform(code,id){if(id.endsWith('/useGallerySession.ts'))return code.replace("from 'react'","from '/scripts/helpers/gallery-hook-harness.mjs'");}}]});
const storage=new Map();const previousWindow=globalThis.window;
globalThis.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
try {
 const load=p=>server.ssrLoadModule(p);
 const {penisuelaGalleryGameplay:definition,penisuelaGalleryHeroes:heroes,penisuelaSessionPreview:preview}=await load('/src/entities/campaign-session/model/playableData.ts');
 const {useGallerySession}=await load('/src/features/navigate-campaign-scene/model/useGallerySession.ts');
 const {resetHooks,renderHook}=await load('/scripts/helpers/gallery-hook-harness.mjs');
 const {readGallerySessionEvents,writeGallerySessionEvents}=await load('/src/features/navigate-campaign-scene/model/gallerySessionStorage.ts');
 const {createClearCombatCommand}=await load('/src/features/run-combat/model/combatCommands.ts');
 const expectation={campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};
 let controller;const draw=()=>controller=renderHook(()=>useGallerySession(definition,heroes,preview.scenes.map(s=>s.id),{sceneScopeId:'pussy-audience'}));
 const reload=()=>{resetHooks();draw();};const fresh=()=>{storage.clear();reload();};
 const add=event=>{const id=`fixture-${crypto.randomUUID()}`;writeGallerySessionEvents(expectation,[...controller.state.events,{...event,id,commandId:id}]);reload();};
 let cases=0;
 for(const encounter of definition.encounters){
  for(const pending of ['none','attack','save']){
   fresh();add({type:'combat-started',encounterId:encounter.id,initiativeOrder:[...heroes.map(h=>h.id),...(encounter.units??[{id:encounter.id}]).filter(e=>e.kind!=='object').map(e=>e.id)]});assert.ok(controller.state.combat,encounter.id);
   const enemy=Object.values(controller.state.combat.enemies).find(e=>e.kind!=='object');
   if(pending==='attack'){
    assert.ok(controller.manualSetInitiative(controller.state.combat.initiativeOrder,heroes[0].id,1));draw();
    controller.heroAttack(heroes[0].id,enemy.id,20);draw();assert.ok(controller.state.combat.pendingAttack,encounter.id);
   } else if(pending==='save')add({type:'combat-saving-throw-requested',savingThrow:{kind:'on-hit',sourceActorId:enemy.id,sourceName:enemy.name,targetId:heroes[0].id,targetName:heroes[0].name,stat:'constitution',modifier:0,dc:12,failureConditions:['stunned'],duration:'next-turn'}});
   for(const target of Object.values(controller.state.combat.enemies).filter(e=>e.kind!=='object'&&!e.summonedBy)){assert.ok(controller.manualAdjustParticipant(target.id,'hp',0));draw();}
   assert.equal(controller.state.combat.pendingAttack,null,`${encounter.id}: pending damage released`);
   assert.equal(controller.state.combat.pendingSavingThrow,null,`${encounter.id}: pending save released`);
   reload();assert.ok(createClearCombatCommand(controller.state.combat));
   assert.equal(controller.clearCombat('gallery'),true);draw();assert.equal(controller.state.combat,null);
   if(encounter.id==='hotel-vip-guards'){
    assert.ok(controller.state.flags['pussy-guards-defeated']);assert.ok(controller.state.flags['pussy-bar-passes-issued']);
    assert.equal(controller.state.inventoryState['pussy-sultan-bar-passes'].quantity,3);
   }
   if(encounter.id==='prop-room-winding-carriers')assert.ok(controller.state.flags['prop-room-carriers-defeated']);
   const count=controller.state.events.length;assert.equal(controller.clearCombat('gallery'),false);draw();assert.equal(controller.state.events.length,count);
   reload();assert.equal(controller.state.combat,null);cases++;
  }
 }
 console.log(`PASS: ${cases} GM victories across ${definition.encounters.length} encounters: pending attack/save, HP=0, reload, completion and no repeated reward.`);
 for(const pending of ['attack','save']){
  fresh();const encounter=definition.encounters.find(e=>e.defeatFallback);
  add({type:'combat-started',encounterId:encounter.id,initiativeOrder:[...heroes.map(h=>h.id),...(encounter.units??[{id:encounter.id}]).filter(e=>e.kind!=='object').map(e=>e.id)]});
  const enemy=Object.values(controller.state.combat.enemies).find(e=>e.kind!=='object');
  if(pending==='attack'){controller.manualSetInitiative(controller.state.combat.initiativeOrder,heroes[0].id,1);draw();controller.heroAttack(heroes[0].id,enemy.id,20);draw();assert.ok(controller.state.combat.pendingAttack);}
  else add({type:'combat-saving-throw-requested',savingThrow:{kind:'on-hit',sourceActorId:enemy.id,sourceName:enemy.name,targetId:heroes[0].id,targetName:heroes[0].name,stat:'constitution',modifier:0,dc:12,failureConditions:['stunned'],duration:'next-turn'}});
  for(const hero of heroes){controller.manualAdjustParticipant(hero.id,'hp',0);draw();}
  assert.equal(controller.state.combat.pendingAttack,null);assert.equal(controller.state.combat.pendingSavingThrow,null);reload();
  assert.ok(controller.resolveCombatDefeatFallback(),`party defeat during ${pending}`);draw();
  assert.ok(controller.state.flags[`combat-defeat-fallback-${encounter.id}`]);
 }
 console.log('PASS: manual party defeat during an attack or saving throw reaches its canonical recovery.');
} finally {globalThis.window=previousWindow;await server.close();}
