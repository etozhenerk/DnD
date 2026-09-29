import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {access} from 'node:fs/promises';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
try {
 const {olvaQuest:q,getOlvaQuestView:view,canResolveOlvaVerdict:canFinish,OLVA_VOTERS:voters,olvaFlag:flag}=await server.ssrLoadModule('/src/entities/campaign-session/model/olvaQuest.ts');
 const {penisuelaGalleryGameplay:def,penisuelaGalleryHeroes:heroes}=await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
 const {replayGalleryEvents:replay}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
 const {createGallerySessionStartedEvent:start,createStoredGallerySessionEnvelope:store,parseStoredGallerySessionEnvelope:parse}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
 const {isGalleryStoryConditionMet:met}=await server.ssrLoadModule('/src/entities/campaign-session/model/galleryGameplay.ts');
 const story=def.storyScenes.find(s=>s.id===q.sceneId);
 for(const path of [q.background,q.tableBackground,q.reward.presentation.background,...q.endings.map(e=>e.background)])await access(path);
 assert.equal(q.exitSceneId,'guest-bungalows');assert.ok(def.storyScenes.some(s=>s.id===q.exitSceneId));assert.equal(q.evidence.length,15);assert.equal(new Set(story.actions.map(a=>a.id)).size,story.actions.length);
 for(const evidence of [...q.evidence,q.gift.evidence]) {
  assert.ok(evidence.documentPages.length>=1 && evidence.documentPages.length<=2,`${evidence.id}: a physical item has at most two sides`);
  assert.equal(evidence.documentPages.flatMap(page=>page.map(block=>block.text)).join('\n\n'),evidence.text,`${evidence.id}: all document text remains readable`);
 }
 let n=0; const evt=(e,commandId)=>({...e,id:`t-${++n}`,commandId});
 let events=[];const state=()=>replay(events,def);
 const seed=(gift=false)=>{events=[start({definition:def,heroes,existingInventory:gift?[q.gift.itemId]:[],eventId:'seed',commandId:'seed'}),evt({type:'flag-changed',flag:'olva-stas-recruited',value:true},'recruited')];};
 const run=id=>{const a=story.actions.find(a=>a.id===id);assert.ok(a,id);assert.ok(met(a.conditions,state()),`conditions: ${id}`);if(id.startsWith('table-finish-'))assert.ok(canFinish(state(),id));const cmd=`cmd-${++n}`;events.push(evt({type:'story-action-resolved',sceneId:q.sceneId,actionId:id,result:'automatic'},cmd));for(const [f,value]of Object.entries(a.outcome.flags??{}))events.push(evt({type:'flag-changed',flag:f,value},cmd));for(const itemId of a.outcome.inventory?.acquire??[])events.push(evt({type:'item-changed',itemId,acquired:true},cmd));for(const itemId of a.outcome.inventory?.remove??[])events.push(evt({type:'item-changed',itemId,acquired:false},cmd));for(const [itemId,change]of Object.entries(a.outcome.itemCharges??{}))events.push(evt({type:'item-charge-changed',itemId,change},cmd));return cmd;};
 seed();assert.equal(view(state()).readCount,0);assert.equal(view(state()).giftOnTable,false);
 // Removed cards remain valid history, without becoming new cards or votes.
 for(const id of ['gift','invitation','rules']) {
  assert.ok(!q.evidence.some(e=>e.id===id));
  assert.ok(!story.actions.some(a=>a.id===`table-read-${id}` || a.id.startsWith(`table-place-${id}-`)));
  events.push(evt({type:'story-action-resolved',sceneId:q.sceneId,actionId:`table-read-${id}`,result:'automatic'},`legacy-${id}`));
  events.push(evt({type:'flag-changed',flag:flag(`read-${id}`),value:true},`legacy-${id}`));
  events.push(evt({type:'flag-changed',flag:flag(`place-${id}-stas`),value:true},`legacy-${id}`));
 }
 const expectation={campaignId:def.campaignId,definitionId:def.id,definitionVersion:def.version};
 const restored=parse(JSON.parse(JSON.stringify(store(events,expectation))),expectation);
 assert.ok(restored.ok);
 assert.equal(view(replay(restored.events,def)).readCount,0);
 assert.equal(Object.keys(view(state()).placements).length,15);
 assert.ok(Object.values(view(state()).placements).every(side=>side==='middle'));
 seed();
 for(const e of q.evidence){
  run(`table-read-${e.id}`);
  for(const side of ['stas','middle','polina']) {
   const previous=view(state()).placements[e.id];
   const command=run(`table-place-${e.id}-${side}`);
   assert.equal(view(state()).placements[e.id],side);
   assert.equal(view(replay(JSON.parse(JSON.stringify(events)),def)).placements[e.id],side);
   events.push(evt({type:'action-corrected',correctedCommandId:command},`undo-${e.id}-${side}`));
   assert.equal(view(state()).placements[e.id],previous);
  }
  run(`table-place-${e.id}-polina`);
 }
 assert.equal(view(state()).readCount,15);assert.equal(view(state()).voted,0,'Evidence never casts votes');
 // Photographs use the same reversible placement commands and never cast votes.
 for(const id of ['fishing-photo','campus-photo']){
  const photo=q.evidence.find(e=>e.id===id);assert.equal(photo.kind,'photo');await access(photo.artwork);assert.ok(photo.artworkAlt);
  const beforeVotes=view(state()).votes;
  const command=run(`table-place-${id}-stas`);assert.equal(view(state()).placements[id],'stas');
  assert.equal(view(replay(JSON.parse(JSON.stringify(events)),def)).placements[id],'stas');
  events.push(evt({type:'action-corrected',correctedCommandId:command},'undo-'+id));
  assert.equal(view(state()).placements[id],'polina');assert.deepEqual(view(state()).votes,beforeVotes);
 }
 const move=run('table-place-receipt-stas');assert.equal(view(state()).placements.receipt,'stas');events.push(evt({type:'action-corrected',correctedCommandId:move},'undo-move'));assert.equal(view(state()).placements.receipt,'polina');
 assert.deepEqual(view(replay(JSON.parse(JSON.stringify(events)),def)).placements,view(state()).placements);
 seed(true);assert.equal(view(state()).evidence.length,15);run('table-offer-gift');assert.equal(view(state()).evidence.length,16);assert.equal(view(state()).giftIntroduction,false,'Putting item down does not reveal ending');run('table-read-womanizer');run('table-place-womanizer-stas');assert.equal(view(state()).placements.womanizer,'stas');assert.ok(state().inventory.includes(q.gift.itemId));run('table-reveal-compromise');assert.equal(view(state()).giftIntroduction,true);assert.equal(view(state()).voting,false);assert.equal(view(replay(JSON.parse(JSON.stringify(events)),def)).giftIntroduction,true);run('table-discuss');assert.equal(view(state()).giftIntroduction,false);run('table-reveal-compromise');run('table-vote');assert.equal(view(state()).giftIntroduction,false);assert.equal(view(state()).voting,true);run('table-withdraw-gift');assert.equal(view(state()).evidence.length,15);assert.ok(!met(story.actions.find(a=>a.id==='table-read-womanizer').conditions,state()));
 seed(true);run('table-offer-gift');run('table-vote');assert.ok(!canFinish(state(),'table-finish-polina'));
 for(const [i,h] of voters.entries())run(`table-vote-${h}-${['polina','polina','separate','separate','gift'][i]}`);
 assert.equal(view(state()).winner,null,'2-2-1 tie never chooses automatically');
 run(`table-vote-${voters[4]}-polina`);assert.equal(view(state()).winner.id,'polina');
 assert.ok(!canFinish(state(),'table-finish-separate'),'cannot confirm a losing side');
 for(const ending of q.endings){
  seed(ending.id==='gift');if(ending.id==='gift')run('table-offer-gift');run('table-vote');
  for(const h of voters)run(`table-vote-${h}-${ending.id}`);
  if(ending.id==='gift')assert.ok(state().inventory.includes(q.gift.itemId),'offering and voting do not consume item');
  const cmd=run(`table-finish-${ending.id}`);assert.ok(view(state()).complete);assert.ok(!state().inventory.includes(q.reward.id),'Verdict must not grant reward');assert.ok(!view(state()).rewardShown);assert.equal(view(state()).narration,ending.readAloud);assert.equal(state().counters.doom,0);
  assert.ok(!canFinish(state(),`table-finish-${ending.id}`),'reward cannot repeat');
  assert.equal(state().flags['olva-couple-together'],ending.id!=='separate');assert.equal(state().flags['olva-couple-separated'],ending.id==='separate');assert.equal(state().flags['olva-couple-compromise'],ending.id==='gift');if(ending.id==='gift')assert.ok(!state().inventory.includes(q.gift.itemId));
  const show=run('table-show-reward');assert.ok(view(state()).rewardShown);assert.ok(!state().inventory.includes(q.reward.id));
  const claim=run('table-claim-reward');assert.ok(view(state()).rewardClaimed);assert.ok(state().inventory.includes(q.reward.id));assert.ok(state().inventory.includes('guest-bungalow-pass'));assert.equal(state().inventoryState[q.reward.id].charges,1);assert.equal(state().inventoryState[q.reward.id].maxCharges,1);
  assert.ok(!met(story.actions.find(a=>a.id==='table-claim-reward').conditions,state()),'Cannot claim twice');
  assert.ok(view(replay(JSON.parse(JSON.stringify(events)),def)).rewardClaimed,'Reload preserves handoff');
  events.push(evt({type:'action-corrected',correctedCommandId:claim},'undo-claim'));assert.ok(!state().inventory.includes(q.reward.id));assert.ok(!state().inventory.includes('guest-bungalow-pass'));assert.ok(view(state()).rewardShown);
  events.push(evt({type:'action-corrected',correctedCommandId:show},'undo-show'));assert.ok(!view(state()).rewardShown);assert.ok(view(state()).complete);
  events.push(evt({type:'action-corrected',correctedCommandId:cmd},`undo-${ending.id}`));assert.ok(!view(state()).complete);assert.ok(!state().flags['olva-couple-separated']);assert.ok(!state().inventory.includes(q.reward.id));if(ending.id==='gift')assert.ok(state().inventory.includes(q.gift.itemId));
 }
 seed(true);run('table-offer-gift');run('table-vote');for(const h of voters)run(`table-vote-${h}-gift`);run('table-withdraw-gift');assert.equal(view(state()).voted,0);assert.ok(!canFinish(state(),'table-finish-gift'));assert.ok(state().inventory.includes(q.gift.itemId));
 seed(true);run('table-offer-gift');run('table-vote');for(const h of voters)run(`table-vote-${h}-separate`);run('table-finish-separate');assert.ok(state().inventory.includes(q.gift.itemId),'other ending retains gift');
 const fake={flags:{[flag('voting')]:true,[flag('gift-offered')]:true},inventory:[q.gift.itemId],combat:null};let combos=0;
 for(let i=0;i<243;i++){let x=i;const votes=[];const flags={...fake.flags};for(const h of voters){const id=q.endings[x%3].id;x=Math.floor(x/3);votes.push(id);flags[flag(`vote-${h}-${id}`)]=true;}const counts=q.endings.map(e=>votes.filter(v=>v===e.id).length),max=Math.max(...counts),tie=counts.filter(n=>n===max).length>1;assert.equal(Boolean(view({...fake,flags}).winner),!tie);combos++;}
 assert.equal(new Set(q.endings.map(e=>e.background)).size,3,'Each ending has its own art');
 const noVoting={...fake,flags:{...fake.flags,[flag('voting')]:false}};for(const h of voters)noVoting.flags[flag(`vote-${h}-gift`)]=true;assert.equal(canFinish(noVoting,'table-finish-gift'),false,'Discussion screen cannot finish ballot');
 const {getOlvaDocument}=await server.ssrLoadModule('/src/entities/campaign-session/model/olvaDocuments.ts');
 for(const e of [...q.evidence,q.gift.evidence])assert.equal(getOlvaDocument(e).pages.join('\n\n'),e.text,'Document flips preserve every line');
 assert.equal(getOlvaDocument(q.evidence.find(e=>e.id==='messages')).messages.length,8);
 assert.equal(view({...fake,flags:{[flag('vote-bubsilda-stas')]:true}}).votes.bubsilda,'polina','Legacy Stas vote retains compatibility');
 assert.equal(view({...fake,flags:{[flag('vote-bubsilda-stas')]:true,[flag('vote-bubsilda-separate')]:true}}).votes.bubsilda,'separate','New choice takes priority');
 assert.ok(!story.actions.some(a=>a.id==='table-finish-stas'),'Only three fate endings');
 const {olvaTableNavigationReducer:nav,initialOlvaTableNavigation:initialNav}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/olvaTableNavigation.ts');
 let screen=nav(initialNav,{type:'open',complete:false});assert.equal(screen.screen,'table','Opening table ignores old ballot flags');screen=nav(screen,{type:'inspect',id:'receipt'});screen=nav(screen,{type:'back'});assert.equal(screen.screen,'table');screen=nav(screen,{type:'decide',revealGift:true});assert.equal(screen.screen,'unlock');screen=nav(screen,{type:'back'});assert.equal(screen.screen,'table');screen=nav(screen,{type:'decide',revealGift:false});assert.equal(screen.screen,'voting');screen=nav(screen,{type:'back'});assert.equal(screen.screen,'table');screen=nav(screen,{type:'back'});assert.equal(screen.screen,'room');assert.equal(nav(screen,{type:'open',complete:true}).screen,'voting');
 seed(true);run('table-offer-gift');run('table-vote-after-compromise');assert.ok(view(state()).has('gift-introduced'));assert.ok(view(state()).has('gift-unlock-notice-seen'));run('table-withdraw-gift');run('table-offer-gift');assert.ok(view(state()).has('gift-introduced'),'Previously introduced ending is not revealed again');
 const {createOlvaRestCommand:rest,getOlvaRewardOutcome:handoff,parseRestRoll,parseRestRolls}=await server.ssrLoadModule('/src/entities/campaign-session/model/olvaRest.ts');
 seed();assert.equal(rest(state()),null,'No card');
 events.push(evt({type:'item-changed',itemId:q.reward.id,acquired:true},'card'));
 for(const h of heroes)events.push(evt({type:'manual-adjustment',label:'Урон',reason:'Тест',adjustment:{kind:'participant-stat',participantId:h.id,field:'hp',value:h.maxHp-10}},'damage-'+h.id));
 const before=state(),rolls=Object.fromEntries(heroes.map((h,i)=>[h.id,i+1]));
 const command=rest(before);assert.ok(command);events.push(evt(command.charge,'rest-card'),evt(command.rest,'rest-card'),evt(command.remove,'rest-card'),evt(command.used,'rest-card'));
 for(const h of heroes)assert.equal(state().heroHp[h.id],h.maxHp);
 assert.ok(!state().inventory.includes(q.reward.id),'Card disappears after confirmation');assert.ok(state().flags['olva-rest-used']);assert.equal(rest(state()),null,'Spent card');
 const legacy=handoff(story.actions.find(a=>a.id==='table-claim-reward').outcome,state());assert.ok(!legacy.inventory.acquire.includes(q.reward.id));assert.ok(!legacy.itemCharges[q.reward.id],'Legacy handoff must not refill spent card');
 assert.equal(rest({...before,combat:{}}),null,'Rest forbidden during battle');
 events.push(evt({type:'action-corrected',correctedCommandId:'rest-card'},'undo-rest'));assert.deepEqual(state().heroHp,before.heroHp);assert.equal(state().inventoryState[q.reward.id].charges,1);
 assert.ok(state().inventory.includes(q.reward.id),'Undo restores card');assert.ok(!state().flags['olva-rest-used']);
 for(const invalid of ['', ' ', '0', '9', '1.5', 'NaN'])assert.equal(parseRestRoll(invalid),null);
 assert.equal(parseRestRoll('8'),8);assert.equal(parseRestRolls(heroes.map(h=>h.id),{}),null);
 assert.deepEqual(parseRestRolls(heroes.map(h=>h.id),Object.fromEntries(heroes.map((h,i)=>[h.id,String(i+1)]))),rolls);
 const capped=rest({...before,heroHp:Object.fromEntries(heroes.map(h=>[h.id,h.maxHp-1]))});assert.ok(capped);
 const card=q.evidence.find(e=>e.id==='business-card');assert.ok(!/секс за деньги|подтверждения заказа нет|реб[её]н/i.test(card.text));assert.ok(card.text.includes('Рокси'));await access(q.callingCardArtwork);await access(q.callingCardKissArtwork);
 assert.deepEqual(new Set(q.evidence.flatMap(e=>e.documentPages.flatMap(p=>p.map(b=>b.author)))),new Set(['print','stas','polina','escort']));
 await access(q.gift.artwork);
 console.log(`Olva evidence PASS: 15 documents + inspectable gift, placement/undo/reload, ${combos} ballots, ties, 3 fate outcomes, item gating and atomic transfer/reward/undo.`);
}finally{await server.close();}
