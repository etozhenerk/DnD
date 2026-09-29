import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
try {
  const {penisuelaGalleryGameplay:d,penisuelaGalleryHeroes:heroes}=await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const {resolveCheck,replayGalleryEvents:replay}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const {getStoryActionAvailability:available,getStoryCheckSettings:settings}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
  const {canEnterOlvaConsultation:canEnter}=await server.ssrLoadModule('/src/entities/campaign-session/model/olvaQuest.ts');
  const find=(scene,id)=>d.storyScenes.find(s=>s.id===scene).actions.find(a=>a.id===id);
  const accept=find('bungalow-courtyard','continue-1-couples-session-entry');
  const decline=find('bungalow-courtyard','continue-2-groom-tunnel');
  const enter=find('bungalow-courtyard','begin-olva-consultation');
  const invite=find('closed-bar','invite-stas-to-olva');
  const check=find('closed-bar','persuade-stas-to-consultation');
  const promise=find('closed-bar','promise-stas-a-voice');
  const table=find('olva-date-rehearsal','table-open');
  const seed=[journal.createGallerySessionStartedEvent({definition:d,heroes,existingInventory:[],eventId:'seed',commandId:'seed'})];
  const state=events=>replay(events,d);
  let serial=0;
  function apply(events,scene,action,success=true) {
    assert.ok(available(action,state(events),d), action.id);
    const commandId=`recruit-${++serial}`;
    const outcome=success?action.outcome:action.failureOutcome;
    const result=[{type:'story-action-resolved',sceneId:scene,actionId:action.id,result:action.kind==='check'?(success?'success':'failure'):'automatic'},
      ...Object.entries(outcome.flags??{}).map(([flag,value])=>({type:'flag-changed',flag,value})),
      ...(outcome.inventory?.acquire??[]).map(itemId=>({type:'item-changed',itemId,acquired:true}))];
    return [...events,...result.map((e,i)=>({...e,id:`${commandId}-${i}`,commandId,sceneScopeId:scene==='closed-bar'?'closed-bar-stas':scene}))];
  }
  const undo=events=>[...events,{id:`undo-${++serial}`,commandId:`undo-${serial}`,type:'action-corrected',correctedCommandId:events.at(-1).commandId}];
  for(const a of [invite,check,promise,enter,table]) assert.equal(available(a,state(seed),d),false,a.id);
  assert.equal(canEnter(state(seed)),false);
  const accepted=apply(seed,'bungalow-courtyard',accept);
  assert.equal(accept.nextSceneId,'guest-bungalows');
  assert.equal(canEnter(state(accepted)),false,'Acceptance alone cannot open table');
  assert.equal(available(accept,state(accepted),d),false,'No duplicate acceptance');
  const invited=apply(accepted,'closed-bar',invite);
  for(const hero of heroes) {
    const config=settings(check.check,state(invited),hero.id,'charisma');
    assert.equal(config.dc,hero.id==='lambert'?4:12,`${hero.id} recruitment DC`);
    for(const [roll,expected] of [[1,false],[20,true],[config.dc-config.modifier-1,false],[config.dc-config.modifier,true]]) {
      const result=resolveCheck({id:check.id,dc:config.dc,successText:check.resolution,failureText:check.failureResolution},{...hero,stats:{...hero.stats,charisma:config.modifier}},'charisma',[roll]);
      assert.equal(result.success,expected,`${hero.id}/${roll}`);
    }
  }
  for(const success of [true,false]) {
    const resolved=apply(invited,'closed-bar',check,success);
    assert.equal(available(check,state(resolved),d),false,'No repeated roll');
    assert.equal(canEnter(state(resolved)),success);
    assert.equal(available(promise,state(resolved),d),!success);
    const recruited=success?resolved:apply(resolved,'closed-bar',promise);
    assert.ok(canEnter(state(recruited)));assert.ok(available(enter,state(recruited),d));
    assert.equal(available(invite,state(recruited),d),false);assert.equal(available(promise,state(recruited),d),false);
    const entered=apply(recruited,'bungalow-courtyard',enter);
    const opened=apply(entered,'olva-date-rehearsal',table);
    assert.ok(canEnter(state(opened)));
    const expectation={campaignId:d.campaignId,definitionId:d.id,definitionVersion:d.version};
    for(const log of [accepted,invited,resolved,recruited,opened]) {
      const loaded=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(journal.createStoredGallerySessionEnvelope(log,expectation))),expectation);
      assert.ok(loaded.ok);assert.deepEqual(state(loaded.events).flags,state(log).flags);
    }
    assert.equal(canEnter(state(undo(recruited))),false,'Undo consent closes table');
    assert.ok(available(check,state(undo(resolved)),d),'Undo roll allows a new attempt');
    for(const field of ['heroHp','resourceUses','counters','inventory']) assert.deepEqual(state(recruited)[field],state(seed)[field],field);
    const checkpoint=[...opened,{id:`restart-${++serial}`,commandId:`restart-${serial}`,type:'scene-checkpoint-restored',eventCount:seed.length}];
    assert.equal(canEnter(state(checkpoint)),false);assert.equal(state(checkpoint).flags['olva-quest-accepted'],undefined,'Restart bungalow entry also rewinds recruitment in bar');
  }
  const declined=apply(seed,'bungalow-courtyard',decline);
  assert.ok(state(declined).inventory.includes('guest-bungalow-pass'));
  assert.equal(canEnter(state(declined)),false,'Keys do not imply Stas consent');
  assert.equal(available(decline,state(declined),d),false,'No duplicated keys');
  assert.ok(available(accept,state(declined),d),'Can reconsider after taking keys');
  for(const flag of ['olva-table-opened','olva-table-complete']) {
    const legacy={...state(seed),flags:{[flag]:true}};
    assert.ok(canEnter(legacy));assert.ok(available(enter,legacy,d));assert.equal(available(accept,legacy,d),false);
  }
  console.log('Olva recruitment PASS: locked entry, 5 heroes × 4 rolls, success/failure/assurance, undo, reload, block reset, optional keys, legacy table saves.');
} finally {await server.close();}
