import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true}});
try {
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes, penisuelaSessionPreview: preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const {getStoryActionAvailability: available, getStoryCheckSettings: settings} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
  const {getGroomTunnelViewId: view} = await server.ssrLoadModule('/src/entities/campaign-session/model/groomTunnel.ts');
  const {replayGalleryEvents: replay, resolveCheck} = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const {createCombatActionUsageEvent} = await server.ssrLoadModule('/src/features/run-combat/model/combatCommands.ts');
  const {resolveDiceSelection} = await server.ssrLoadModule('/src/shared/lib/dice/diceSelection.ts');
  const scene = definition.storyScenes.find((s) => s.id === 'groom-tunnel');
  const get = (id) => scene.actions.find((a) => a.id === id);
  assert.equal(heroes.length, 5);
  assert.ok(scene.actions.every((a) => !a.kind.startsWith('combat')));
  const publicScene = preview.scenes.find((s) => s.id === scene.id);
  for (const image of [publicScene.background, ...publicScene.interactionViews.map((v) => v.background)]) await access(image);
  assert.equal(new Set(publicScene.interactionViews.map((v) => v.id)).size, 6);
  let serial = 0;
  const append = (events, commandId, inputs) => [...events, ...inputs.map((e) => ({...e, id: `groom-test-${++serial}`, commandId, sceneScopeId: scene.id}))];
  const state = (events) => replay(events, definition);
  const arrival = [journal.createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId:'groom-seed', commandId:'groom-seed-command'})];
  const apply = (events, action, success = true) => {
    assert.ok(available(action, state(events), definition), `${action.id} should be available`);
    const outcome = success ? action.outcome : action.failureOutcome;
    const resource = definition.combatActions.find((a) => a.id === action.requirements?.resourceActionId);
    return append(events, action.id, [
      {type:'story-action-resolved',sceneId:scene.id,actionId:action.id,result:action.kind==='check' ? success?'success':'failure':'automatic'},
      ...(resource ? [createCombatActionUsageEvent(resource)] : []),
      ...Object.entries(outcome.flags ?? {}).map(([flag,value])=>({type:'flag-changed',flag,value})),
    ]);
  };
  const bubs = get('groom-tunnel-bubsilda-balance-passage');
  const scan = get('groom-prop-jam-lena-scan');
  const hammer = get('groom-prop-jam-thorin-hammer');
  const exit = get('continue-1-groom-preparation-room');
  const bypass = get('groom-tunnel-lena-hidden-passage');
  const checks = scene.actions.filter(action => action.kind === 'check');
  assert.equal(checks.length, 8, 'all obstacle approaches require a check');
  for (const action of checks) {
    assert.equal(action.check.dc, 8, `${action.id} is an easy check`);
    assert.ok(action.failureOutcome, `${action.id} remains playable on failure`);
  }
  assert.deepEqual(bubs.check.stats, ['dexterity']);
  assert.deepEqual(get('groom-door-linda-inside-release').check.stats, ['dexterity']);
  const enter = get('groom-tunnel-enter');
  assert.equal(view(state(arrival).flags), 'exterior');
  assert.equal(available(enter, state(arrival), definition), true);
  for (const action of [bubs, bypass, get('groom-tunnel-custom-passage')]) {
    assert.equal(available(action, state(arrival), definition), false, 'interior actions require entering the door');
  }
  const seed = apply(arrival, enter);
  assert.equal(available(enter, state(seed), definition), false, 'entering is not repeated');
  for (const key of ['heroHp', 'counters', 'resourceUses', 'inventoryState']) {
    assert.deepEqual(state(seed)[key], state(arrival)[key], `entering preserves ${key}`);
  }
  const undoEntry = append(seed, 'undo-entry', [{type: 'action-corrected', correctedCommandId: enter.id}]);
  assert.equal(view(state(undoEntry).flags), 'exterior', 'undo returns outside');
  assert.equal(available(enter, state(undoEntry), definition), true);
  for (const [flag, expected] of [
    ['groom-tunnel-passage-open', 'main-open'], ['groom-door-reached', 'door'],
    ['groom-door-open', 'linda-flight'], ['groom-prop-jam-reached', 'prop-jam'],
    ['groom-prop-jam-cleared', 'cleared'], ['groom-access-completed', 'cleared'],
  ]) {
    const legacy = state(append(arrival, `legacy-${flag}`, [{type: 'flag-changed', flag, value: true}]));
    assert.equal(view(legacy.flags), expected, 'old progress does not return outside');
    assert.equal(available(enter, legacy, definition), false);
  }
  assert.equal(view(state(seed).flags),'entry');
  assert.equal(available(exit,state(seed),definition),false);
  let main = seed;
  for (const id of [bubs.id,'groom-tunnel-approach-door','groom-door-linda-inside-release','groom-door-follow-linda']) main=apply(main,get(id));
  assert.equal(view(state(main).flags),'prop-jam');
  assert.deepEqual(state(main).resourceUses,state(seed).resourceUses,'passive abilities consume no uses');
  assert.equal(settings(hammer.check,state(main),'thorin-pukoshchit','strength').dc,8);
  const scanned=apply(main,scan);
  const helped=settings(hammer.check,state(scanned),'thorin-pukoshchit','strength');
  assert.deepEqual(helped,{dc:4,modifier:-2,advantage:true});
  assert.equal(available(scan,state(scanned),definition),false);
  assert.equal(state(scanned).resourceUses['golovach-lena-ability-video-surveillance'],1);
  const undo=append(scanned,'undo-scan',[{type:'action-corrected',correctedCommandId:scan.id}]);
  assert.equal(available(scan,state(undo),definition),true);
  assert.equal(settings(hammer.check,state(undo),'thorin-pukoshchit','strength').dc,8);
  const failedScan=apply(main,scan,false);
  assert.equal(settings(hammer.check,state(failedScan),'thorin-pukoshchit','strength').dc,8);
  assert.equal(available(hammer,state(failedScan),definition),true);
  for (const success of [true,false]) {
    const cleared=apply(scanned,hammer,success);
    assert.equal(view(state(cleared).flags),'cleared');
    assert.equal(available(exit,state(cleared),definition),true);
    assert.deepEqual(state(cleared).heroHp,state(main).heroHp);
    assert.deepEqual(state(cleared).counters,state(main).counters);
    assert.equal(Boolean(state(cleared).flags['groom-tunnel-noisy-entry']),!success);
  }
  const side=apply(seed,bypass,false);
  assert.equal(view(state(side).flags),'door');
  let sideJam=apply(side,get('groom-door-linda-inside-release'));
  sideJam=apply(sideJam,get('groom-door-follow-linda'));
  assert.equal(available(scan,state(sideJam),definition),false,'subviews never refresh the shared location charge');
  assert.equal(available(hammer,state(sideJam),definition),true);
  const dead=structuredClone(state(main));dead.heroHp['thorin-pukoshchit']=0;
  assert.equal(available(hammer,dead,definition),false);
  const unarmed=structuredClone(state(main));unarmed.inventoryState['worker-hammer'].ownerId='linda';
  assert.equal(available(hammer,unarmed,definition),false);
  const noPendant=structuredClone(state(main));noPendant.inventoryState['camera-pendant'].quantity=0;
  assert.equal(available(scan,noPendant,definition),false);
  const lena=heroes.find((h)=>h.id==='golovach-lena');
  const s=settings(bypass.check,state(seed),lena.id,'intelligence');
  assert.equal(s.modifier,1);
  for(const [rolls,expected] of [[[1],false],[[20],true],[[6],false],[[7],true]]) {
    assert.equal(resolveCheck({id:bypass.id,dc:s.dc,successText:'yes',failureText:'no'},{...lena,stats:{...lena.stats,intelligence:s.modifier}},'intelligence',rolls).success,expected);
  }
  assert.deepEqual(resolveDiceSelection([5,19],'1d20','highest'),{value:19,rolls:[5,19]});
  const expectation={campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};
  const enteredSave = journal.createStoredGallerySessionEnvelope(seed, expectation);
  const enteredReload = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(enteredSave)), expectation);
  assert.equal(enteredReload.ok, true);
  assert.equal(view(state(enteredReload.events).flags), 'entry', 'reload keeps the opened entrance');
  const stored=journal.createStoredGallerySessionEnvelope(scanned,expectation);
  const loaded=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(stored)),expectation);
  assert.equal(loaded.ok,true);
  assert.deepEqual(JSON.parse(JSON.stringify(state(loaded.events))),JSON.parse(JSON.stringify(state(scanned))));
  const doorReady = apply(seed, get('groom-tunnel-custom-passage'));
  for (const action of checks) {
    const base = action.id.startsWith('groom-prop-jam-') ? main : action.id.startsWith('groom-door-') ? doorReady : seed;
    const failed = state(apply(base, action, false));
    if (action.id !== scan.id) {
      for (const [flag, value] of Object.entries(action.outcome.flags)) assert.equal(failed.flags[flag], value);
      assert.equal(failed.flags['groom-tunnel-noisy-entry'], true);
    } else {
      assert.equal(failed.flags['groom-prop-jam-scanned'], true);
      assert.ok(!failed.flags['groom-prop-jam-weak-point']);
    }
    for (const key of ['heroHp', 'counters']) assert.deepEqual(failed[key], state(base)[key]);
  }
  const oldAutomatic = append(arrival, 'legacy-bubs', [
    {type: 'story-action-resolved', sceneId: scene.id, actionId: bubs.id, result: 'automatic'},
    {type: 'flag-changed', flag: 'groom-tunnel-passage-open', value: true},
  ]);
  const oldSave = journal.createStoredGallerySessionEnvelope(oldAutomatic, expectation);
  const oldReload = journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(oldSave)), expectation);
  assert.equal(oldReload.ok, true, 'old automatic solutions remain loadable after conversion to checks');
  assert.equal(view(state(oldReload.events).flags), 'main-open');
  const guide=await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8');
  for (const camera of [publicScene, ...publicScene.interactionViews]) assert.ok(guide.includes(camera.readAloud));
  const meeting = definition.storyScenes.find((s) => s.id === 'groom-preparation-room');
  const talk = meeting.actions.find((a) => a.id === 'continue-1-kreed-disclosure');
  assert.equal(meeting.actions.length, 1, 'the meeting has no rescue or price choices');
  for (const legacyFlags of [{}, {'rescue-price-required':true,'bridge-groom-preparation-room-kreed-rescue-result-resolved':true}]) {
    let before = append(seed, 'legacy-kreed-state', Object.entries(legacyFlags).map(([flag,value])=>({type:'flag-changed',flag,value})));
    assert.ok(available(talk,state(before),definition), 'new and partially completed legacy saves can talk');
    const met = [...before,
      {id:'kreed-talk-action',commandId:'kreed-talk',sceneScopeId:meeting.id,type:'story-action-resolved',sceneId:meeting.id,actionId:talk.id,result:'automatic'},
      ...Object.entries(talk.outcome.flags).map(([flag,value],i)=>({id:`kreed-talk-flag-${i}`,commandId:'kreed-talk',sceneScopeId:meeting.id,type:'flag-changed',flag,value}))];
    assert.equal(state(met).flags['kreed-rescued'],true);
    assert.equal(state(met).lastStoryAction.actionId,talk.id);
    assert.deepEqual(state(met).counters,state(before).counters);
    assert.deepEqual(state(met).resourceUses,state(before).resourceUses);
    assert.deepEqual(state(met).heroHp,state(before).heroHp);
    const undone=[...met,{id:'kreed-undo',commandId:'kreed-undo',type:'action-corrected',correctedCommandId:'kreed-talk'}];
    assert.equal(Boolean(state(undone).flags['kreed-rescued']),false);
    assert.ok(available(talk,state(undone),definition));
    const envelope=journal.createStoredGallerySessionEnvelope(met,expectation);
    const restored=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(envelope)),expectation);
    assert.equal(restored.ok,true);assert.equal(state(restored.events).flags['kreed-rescued'],true);
  }
  const meetingView=preview.scenes.find((s)=>s.id===meeting.id);
  assert.ok(guide.includes(meetingView.readAloud));
  assert.ok(guide.includes(meetingView.interactionViews.find((v)=>v.id==='noisy-arrival').readAloud));
  await access(meetingView.background);
  console.log('Kreed hideout PASS: direct conversation, legacy partial save, no price/HP/resources, undo and persistence.');
  console.log('Groom passage PASS: exterior door, seven art states, eight easy checks with fail-forward, shared resource/undo, DC bonus, advantage, criticals, old saves and no HP/Doom price.');
} finally { await server.close(); }
