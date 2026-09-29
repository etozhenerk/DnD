import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
try {
 const {penisuelaGalleryGameplay:d,penisuelaGalleryHeroes:heroes,penisuelaSessionPreview:p}=await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
 const {resolveCheck,replayGalleryEvents:replay}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
 const j=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
 const {getStoryActionAvailability:available,getStoryCheckSettings:settings}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
 const scene=d.storyScenes.find(s=>s.id==='graywise-door-trust'),check=scene.actions.find(a=>a.kind==='check'),exit=scene.actions.find(a=>a.kind==='automatic');
 const retry=scene.actions.find(a=>a.id==='ask-egor-for-graywise-trust');
 assert.equal(scene.actions.length,3,'Party check, NPC check, entrance');
 assert.equal(retry.check.npcActor.id,'egor-kreed');
 assert.ok(retry.check.dc < check.check.dc);
 const seed=[j.createGallerySessionStartedEvent({definition:d,heroes,existingInventory:[],eventId:'gray-seed',commandId:'gray-seed'})];
 const state=events=>replay(events,d),before=state(seed);
 assert.equal(available(exit,before,d),false);
 const guide=await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8');
 for(const id of ['post-kreed-route','graywise-door-trust']) {
  const s=p.scenes.find(s=>s.id===id);await access(s.background);assert.ok(guide.includes(s.readAloud));
  for(const v of s.interactionViews??[]){await access(v.background);assert.ok(guide.includes(v.readAloud));}
 }
 assert.equal(heroes.length,5);
 for(const hero of heroes){
  const config=settings(check.check,before,hero.id,'charisma');
  for(const [roll,success] of [[1,false],[20,true],[12-config.modifier-1,false],[12-config.modifier,true]]){
   assert.equal(resolveCheck({id:check.id,dc:config.dc,successText:'yes',failureText:'no'},{...hero,stats:{...hero.stats,charisma:config.modifier}},'charisma',[roll]).success,success);
  }
 }
 const apply=(events,action,success,commandId)=>{
  assert.equal(available(action,state(events),d),true);
  const outcome=success?action.outcome:action.failureOutcome;
  assert.deepEqual(Object.keys(outcome),['flags'],'No HP, resources or Doom');
  const actor=action.check.npcActor??heroes[0];
  const roll=resolveCheck({id:action.id,dc:action.check.dc,successText:action.resolution,failureText:action.failureResolution},actor,'charisma',[success?20:1]);
  const inputs=[{type:'roll-entered',result:roll},{type:'story-action-resolved',sceneId:scene.id,actionId:action.id,result:success?'success':'failure'},...Object.entries(outcome.flags).map(([flag,value])=>({type:'flag-changed',flag,value}))];
  return [...events,...inputs.map((e,i)=>({...e,id:`${commandId}-${i}`,commandId,sceneScopeId:scene.id}))];
 };
 const undo=(events,commandId)=>[...events,{id:`undo-${commandId}`,commandId:`undo-${commandId}`,type:'action-corrected',correctedCommandId:commandId,sceneScopeId:scene.id}];
 const partySuccess=state(apply(seed,check,true,'party-success'));
 assert.equal(available(exit,partySuccess,d),true);assert.equal(available(retry,partySuccess,d),false);
 assert.equal(available(retry,before,d),false);
 const failed=apply(seed,check,false,'party-failure'),afterFailure=state(failed);
 assert.equal(Boolean(afterFailure.flags['graywise-door-opened']),false);
 assert.equal(available(exit,afterFailure,d),false);assert.equal(available(check,afterFailure,d),false);assert.equal(available(retry,afterFailure,d),true);
 const altered=structuredClone(afterFailure);altered.participantTemporaryModifiers['egor-kreed']=100;
 assert.deepEqual(settings(retry.check,altered,'egor-kreed','charisma'),{dc:8,modifier:0,advantage:false});
 for(const [roll,success] of [[1,false],[7,false],[8,true],[20,true]])assert.equal(resolveCheck({id:retry.id,dc:8,successText:'yes',failureText:'no'},retry.check.npcActor,'charisma',[roll]).success,success);
 for(const success of [true,false]){
  const events=apply(failed,retry,success,'egor-check'),after=state(events);
  assert.equal(after.lastRoll.heroId,'egor-kreed');assert.equal(after.lastRoll.dc,8);assert.equal(after.lastRoll.modifier,0);
  assert.equal(after.flags['graywise-door-opened'],true);assert.equal(after.flags['graywise-met'],true);
  assert.equal(after.flags['graywise-privacy-ally'],success);assert.equal(after.flags['graywise-trust-failed'],!success);
  assert.equal(available(retry,after,d),false);assert.equal(available(exit,after,d),true);
  for(const key of ['heroHp','resourceUses','counters','heroSources'])assert.deepEqual(after[key],before[key]);
  const expectation={campaignId:d.campaignId,definitionId:d.id,definitionVersion:d.version};
  for(const snapshot of [failed,events]){
   const loaded=j.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(j.createStoredGallerySessionEnvelope(snapshot,expectation))),expectation);
   assert.equal(loaded.ok,true);assert.deepEqual(state(loaded.events).flags,state(snapshot).flags);
  }
  const backToFailure=state(undo(events,'egor-check'));
  assert.equal(Boolean(backToFailure.flags['graywise-door-opened']),false);assert.equal(available(retry,backToFailure,d),true);
  const initial=state(undo(undo(events,'egor-check'),'party-failure'));
  assert.equal(available(check,initial,d),true);assert.equal(available(retry,initial,d),false);
 }
 console.log('Grey Wiese PASS: party failure keeps door closed; Egor NPC DC 8, no party modifiers, both outcomes, actor journal, undo, persistence, no costs and art/guide links.');
} finally {await server.close();}
