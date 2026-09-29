import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {createServer} from 'vite';
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
try {
 const {penisuelaGalleryGameplay:d,penisuelaGalleryHeroes:heroes,penisuelaSessionPreview:preview}=await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
 const {createBossSequenceEvents:create}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/bossSequenceCommands.ts');
 const {replayGalleryEvents:replay}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
 const {createStartCombatCommand:start}=await server.ssrLoadModule('/src/features/run-combat/model/combatCommands.ts');
 const {getStoryActionAvailability:available}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
 const journal=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
 let serial=0;
 const wrap=(events,cmd)=>events.map(e=>({...e,id:`event-${++serial}`,commandId:cmd,sceneScopeId:d.bossSequence.sceneId}));
 const seed=()=>journal.createGallerySessionStartedEvent({definition:d,heroes,existingInventory:[],eventId:'seed',commandId:'seed'});
 const expectation={campaignId:d.campaignId,definitionId:d.id,definitionVersion:d.version};
 for(const encounterId of [d.bossSequence.firstEncounterId,d.bossSequence.secondEncounterId]){
  const enc=d.encounters.find(e=>e.id===encounterId);
  const log=[seed(),...wrap([start(enc,heroes,()=>10),{type:'flag-changed',flag:'thorin-birkin-received',value:true},
   ...(encounterId===d.bossSequence.secondEncounterId?[{type:'flag-changed',flag:'andrey-phase-one-defeated',value:true},{type:'flag-changed',flag:'andrey-transformation-finished',value:true}]:[])],'start')];
  const before=replay(log,d);
  assert.deepEqual(create(d,before,heroes,'defeat'),[],'cannot force defeat of living party');
  for(const hero of heroes.slice(0,-1))log.push(...wrap([{type:'combat-damage-resolved',targetId:hero.id,amount:999,text:'Герой без сознания.'}],`down-${hero.id}`));
  // Linda's one-time survival keeps her at 1 HP on the first lethal hit.
  for(const hero of heroes.slice(0,-1))if(replay(log,d).heroHp[hero.id]>0)log.push(...wrap([{type:'combat-damage-resolved',targetId:hero.id,amount:999,text:'Повторный удар после спасения.'}],`second-down-${hero.id}`));
  assert.deepEqual(create(d,replay(log,d),heroes,'defeat'),[],'last standing hero can continue');
  const last=heroes.at(-1);
  log.push(...wrap([{type:'combat-damage-resolved',targetId:last.id,amount:999,text:'Последний герой падает.'}],'last-hit'));
  const down=replay(log,d);
  const pending={...down,combat:{...down.combat,pendingSavingThrow:{}}};
  assert.deepEqual(create(d,pending,heroes,'defeat'),[],'wait for outstanding save');
  assert.deepEqual(create(d,{...down,combat:{...down.combat,pendingAttack:{}}},heroes,'defeat'),[],'wait for damage resolution');
  const additions=create(d,down,heroes,'defeat');
  assert.ok(additions.length);assert.ok(!additions.some(e=>e.type==='combat-damage-resolved'),'never kill the winning boss or free cages');
  log.push(...wrap(additions,'last-hit'));
  const state=replay(log,d);
  assert.equal(state.combat,null);assert.equal(state.selectedEnding,'netak-wedding');
  for(const h of heroes)assert.equal(state.heroHp[h.id],1);
  assert.equal(state.flags['andrey-bad-ending'],true);assert.equal(state.flags['andrey-hostages-captured'],true);
  assert.equal(state.flags['thorin-birkin-received'],true);assert.deepEqual(state.inventoryState,before.inventoryState);
  for(const f of ['andrey-boss-defeated','andrey-death-video-finished','crisis-resolved'])assert.ok(!state.flags[f]);
  for(const cmd of ['start','first-victory','start-transformation','video-ended','finish','death-video-ended','defeat'])assert.deepEqual(create(d,state,heroes,cmd),[],cmd+' cannot run after defeat');
  for(const id of ['last-take-boss','villa-after-andrey','couple-voice-reset'])assert.ok(d.storyScenes.find(s=>s.id===id).actions.every(a=>!available(a,state,d)),'happy exits blocked');
  const villa=d.storyScenes.find(s=>s.id==='bad-ending-villa').actions[0];
  const wedding=d.storyScenes.find(s=>s.id==='bad-ending-netak-wedding').actions[0];
  assert.equal(available(villa,before,d),false);assert.equal(available(villa,state,d),true);
  assert.equal(villa.nextSceneId,'bad-ending-netak-wedding');assert.equal(available(wedding,state,d),false);
  log.push(...wrap([{type:'story-action-resolved',sceneId:'bad-ending-villa',actionId:villa.id,result:'automatic'},...Object.entries(villa.outcome.flags).map(([flag,value])=>({type:'flag-changed',flag,value}))],'broadcast'));
  assert.equal(available(wedding,replay(log,d),d),true);assert.equal(wedding.nextSceneId,'bad-ending-magical-prison');
  const stored=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(journal.createStoredGallerySessionEnvelope(log,expectation))),expectation);
  assert.ok(stored.ok);assert.deepEqual(replay(stored.events,d).flags,replay(log,d).flags);assert.equal(replay(stored.events,d).selectedEnding,'netak-wedding');
  const undone=replay([...log.filter(e=>e.commandId!=='broadcast'),...wrap([{type:'action-corrected',correctedCommandId:'last-hit'}],'undo')],d);
  assert.equal(undone.combat.encounterId,encounterId);assert.equal(undone.combat.enemies[encounterId].hp,enc.hp);
  assert.equal(undone.heroHp[last.id],before.heroHp[last.id]);assert.ok(!undone.flags['andrey-bad-ending']);assert.equal(undone.selectedEnding,null);
  // A saved old fallback (already healed/cleared) migrates without replaying victory clips.
  const legacy={...state,selectedEnding:null,flags:{'andrey-defeat-fallback':true},combat:null};
  assert.ok(create(d,legacy,heroes,'defeat').some(e=>e.type==='ending-selected'));
 }
 const guide=await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8');
 for(const id of ['bad-ending-villa','bad-ending-netak-wedding','bad-ending-magical-prison']){
  assert.equal(preview.scenes.filter(s=>s.id===id).length,1);assert.equal(d.storyScenes.filter(s=>s.id===id).length,1);
  const scene=preview.scenes.find(s=>s.id===id);await access(scene.background);assert.ok(guide.includes(scene.readAloud));
 }
 assert.deepEqual(d.storyScenes.find(s=>s.id==='bad-ending-magical-prison').actions,[],'no reset at ending');
 console.log('Netak bad ending PASS: both phases, last standing hero, pending rolls, living winning boss, captive guests, 1 HP recovery, preserved skin/inventory, no happy branch/videos, montage, reload, atomic undo, legacy fallback, scene assets and guide.');
}finally{await server.close();}
