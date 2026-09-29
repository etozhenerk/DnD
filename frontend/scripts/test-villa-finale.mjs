import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
try {
  const {penisuelaGalleryGameplay:def,penisuelaGalleryHeroes:heroes,penisuelaSessionPreview:preview}=await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents:replay}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const {getStoryActionAvailability:available}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
  const {getCampaignItemSkin:skin,getCampaignCombatPresentation:presentation}=await server.ssrLoadModule('/src/entities/campaign-session/model/itemSkins.ts');
  const {createBossSequenceEvents:boss,getBossUndoScope:undoScope}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/bossSequenceCommands.ts');
  const act=(scene,id)=>def.storyScenes.find(s=>s.id===scene).actions.find(a=>a.id===id);
  const gift=act('igor-unboxing','exchange-alexis-certificate-for-birkin');
  const explosion=act('igor-unboxing','continue-1-wedding-reminder');
  const reveal=act('andrey-villa-breach','reveal-andrey-plan');
  const appearance=act('andrey-villa-breach','show-andrey-appearance');
  const teleport=act('andrey-villa-breach','andrey-teleport-to-arena');
  const exit=act('last-take-boss','continue-after-andrey-victory');
  let serial=0;
  const wrap=(events,commandId,sceneScopeId='igor-unboxing')=>events.map(e=>({...e,id:`villa-event-${++serial}`,commandId,sceneScopeId}));
  const seed=journal.createGallerySessionStartedEvent({definition:def,heroes,existingInventory:[],eventId:'seed',commandId:'seed'});
  let events=[seed];
  let state=replay(events,def);
  assert.equal(available(gift,state,def),false,'no certificate, no gift');
  assert.equal(available(explosion,state,def),true,'gift is optional');
  assert.equal(available(teleport,state,def),false,'confession precedes teleport');
  assert.equal(available(exit,state,def),false,'no ending before victory');
  events.push(...wrap([{type:'item-changed',itemId:'alexis-fashion-expert-certificate',acquired:true},{type:'item-charge-changed',itemId:'seven-job-bag',change:{mode:'set',value:0}}],'fixture'));
  state=replay(events,def);
  assert.equal(available(gift,state,def),true,'exhausted bag can receive cosmetic gift');
  const bagBefore=structuredClone(state.inventoryState['seven-job-bag']);
  assert.equal(bagBefore.charges,0);
  assert.equal(available(gift,{...state,inventoryState:{...state.inventoryState,'seven-job-bag':{...bagBefore,ownerId:'linda'}}},def),false,'Thorin must own the bag');
  assert.equal(available(gift,{...state,heroHp:{...state.heroHp,'thorin-pukoshchit':0}},def),false);
  // Replay the actual canonical outcome through the same journal event types used by story commands.
  function outcomeEvents(action,sceneId) {
    return [{type:'story-action-resolved',sceneId,actionId:action.id,result:'automatic'},
      ...Object.entries(action.outcome.flags??{}).map(([flag,value])=>({type:'flag-changed',flag,value})),
      ...(action.outcome.inventory?.remove??[]).map(itemId=>({type:'item-changed',itemId,acquired:false})),
      ...(action.outcome.clues??[]).map(clueId=>({type:'clue-revealed',clueId}))];
  }
  events.push(...wrap(outcomeEvents(gift,'igor-unboxing'),'gift'));
  const gifted=replay(events,def);
  assert.ok(!gifted.inventory.includes('alexis-fashion-expert-certificate'));
  assert.deepEqual(gifted.inventoryState['seven-job-bag'],bagBefore);
  assert.deepEqual(gifted.heroHp,state.heroHp);assert.deepEqual(gifted.resourceUses,state.resourceUses);
  assert.deepEqual(gifted.counters,state.counters);assert.equal(gifted.flags['thorin-seven-job-bag-upgraded'],undefined);
  assert.equal(available(gift,gifted,def),false,'no duplicate exchange');
  assert.ok(skin(def,gifted.flags,'seven-job-bag'));assert.equal(skin(def,{},'seven-job-bag'),undefined);
  const shown=presentation(def,gifted.flags);
  for (const original of def.combatActions) {
    const changed=shown.combatActions.find(a=>a.id===original.id);
    if(original.source==='item'&&original.sourceId==='seven-job-bag') {
      assert.match(changed.name,/Birkin/u);assert.ok(changed.artwork);
      const {name,artwork,...mechanics}=changed;const {name:oldName,artwork:oldArt,...oldMechanics}=original;
      assert.deepEqual(mechanics,oldMechanics,'skin must not change combat mechanics');
    } else assert.deepEqual(changed,original);
  }
  const expected={campaignId:def.campaignId,definitionId:def.id,definitionVersion:def.version};
  const loaded=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(journal.createStoredGallerySessionEnvelope(events,expected))),expected);
  assert.ok(loaded.ok);assert.deepEqual(replay(loaded.events,def).inventoryState,gifted.inventoryState);
  const undone=replay([...events,...wrap([{type:'action-corrected',correctedCommandId:'gift'}],'undo-gift')],def);
  assert.ok(undone.inventory.includes('alexis-fashion-expert-certificate'));assert.equal(skin(def,undone.flags,'seven-job-bag'),undefined);
  assert.deepEqual(undone.inventoryState['seven-job-bag'],bagBefore);
  events.push(...wrap(outcomeEvents(explosion,'igor-unboxing'),'explosion'));
  assert.equal(explosion.nextSceneId,'andrey-villa-breach');assert.equal(available(gift,replay(events,def),def),false);
  assert.equal(available(reveal,replay(events,def),def),false,'empty room precedes appearance and confession');
  assert.equal(available(appearance,replay(events,def),def),true);
  events.push(...wrap(outcomeEvents(appearance,'andrey-villa-breach'),'appearance','andrey-villa-breach'));
  const appeared=replay(JSON.parse(JSON.stringify(events)),def);
  assert.equal(appeared.flags['andrey-appeared'],true,'appearance survives reload');
  assert.equal(available(appearance,appeared,def),false,'appearance is one-shot');
  assert.equal(available(reveal,appeared,def),true);
  const beforeAppearance=replay([...events,...wrap([{type:'action-corrected',correctedCommandId:'appearance'}],'undo-appearance')],def);
  assert.ok(!beforeAppearance.flags['andrey-appeared']);
  assert.equal(available(reveal,beforeAppearance,def),false,'undo restores empty-room gate');
  assert.equal(available(appearance,{...beforeAppearance,flags:{...beforeAppearance.flags,'andrey-plan-revealed':true}},def),false,'legacy confession does not replay appearance');
  events.push(...wrap(outcomeEvents(reveal,'andrey-villa-breach'),'reveal','andrey-villa-breach'));
  state=replay(events,def);assert.equal(available(teleport,state,def),true);assert.equal(available(reveal,state,def),false);
  events.push(...wrap(outcomeEvents(teleport,'andrey-villa-breach'),'teleport','andrey-villa-breach'));
  events.push(...wrap(boss(def,replay(events,def),heroes,'start',()=>10),'teleport','andrey-villa-breach'));
  state=replay(events,def);assert.equal(state.combat.encounterId,def.bossSequence.firstEncounterId);
  assert.equal(undoScope(events,'last-take-boss'),'andrey-villa-breach');
  const turnEdit=[...events,...wrap([{type:'flag-changed',flag:'qa-battle-action',value:true}],'temporary-battle-action','last-take-boss')];
  assert.equal(undoScope(turnEdit,'last-take-boss'),'last-take-boss');
  const undoTurn=[...turnEdit,...wrap([{type:'action-corrected',correctedCommandId:'temporary-battle-action'}],'undo-turn','last-take-boss')];
  assert.equal(undoScope(undoTurn,'last-take-boss'),'andrey-villa-breach','after undoing battle actions the teleport remains undoable');
  assert.equal(state.flags['andrey-hostages-captured'],true);assert.equal(available(teleport,state,def),false);
  assert.deepEqual(state.inventoryState['seven-job-bag'],bagBefore);assert.deepEqual(state.heroHp,gifted.heroHp);
  const undoneTeleport=replay([...events,...wrap([{type:'action-corrected',correctedCommandId:'teleport'}],'undo-teleport','last-take-boss')],def);
  assert.equal(undoneTeleport.combat,null);assert.ok(!undoneTeleport.flags['andrey-arena-entered']);assert.ok(!undoneTeleport.flags['andrey-hostages-captured']);
  assert.equal(available(teleport,undoneTeleport,def),true);
  assert.equal(available(exit,{...state,combat:null,flags:{...state.flags,'andrey-boss-defeated':true,'andrey-death-video-finished':true}},def),true,'new route has a post-battle exit without legacy consent flags');
  assert.equal(new Set(preview.scenes.map(s=>s.id)).size,preview.scenes.length);
  assert.equal(new Set(def.storyScenes.map(s=>s.id)).size,def.storyScenes.length);
  for (const sceneId of ['igor-unboxing','andrey-villa-breach']) {
    const scene=preview.scenes.find(s=>s.id===sceneId);
    assert.equal((await readFile(scene.background)).subarray(1,4).toString(),'PNG','published scene is present without draft dependencies');
    assert.ok((await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8')).includes(scene.readAloud));
  }
  console.log('Villa PASS: optional gift, exhausted bag, owner guard, consumption, cosmetic-only skin, replay, undo, confession, teleport, battle startup and approved assets.');
} finally {await server.close();}
