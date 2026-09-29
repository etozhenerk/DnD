import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {readFile} from 'node:fs/promises';
const server = await createServer({appType:'custom', logLevel:'silent', server:{middlewareMode:true}});
try {
  const {penisuelaGalleryGameplay:definition, penisuelaGalleryHeroes:heroes, penisuelaSessionPreview:preview} = await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
  const {replayGalleryEvents:replay, resolveCheck, recoverGalleryResourceScopes} = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const {getAutomaticCheckReward:reward, GREY_WIESE_PERFUME_ID:id} = await server.ssrLoadModule('/src/entities/campaign-session/model/partyRewards.ts');
  const {getStoryActionAvailability:available} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/storyActionRules.ts');
  const gift = definition.storyScenes.find(s=>s.id==='wedding-epilogue').actions.find(a=>a.id==='receive-grey-wiese-perfume');
  let n=0;
  const event=(input,commandId)=>({...input,id:`perfume-event-${++n}`,commandId,sceneScopeId:'wedding-epilogue'});
  const seed=journal.createGallerySessionStartedEvent({definition,heroes,existingInventory:[],eventId:'seed',commandId:'seed'});
  let events=[seed];
  assert.equal(available(gift,replay(events,definition),definition),false,'no reward before wedding');
  events.push(event({type:'flag-changed',flag:'selected-epilogue-wedding',value:true},'wedding'));
  assert.equal(available(gift,replay(events,definition),definition),true);
  const bad=replay([...events,event({type:'flag-changed',flag:'andrey-bad-ending',value:true},'bad')],definition);
  assert.equal(available(gift,bad,definition),false,'defeat cannot grant gift');
  // Mirror the generic published outcome using its canonical values.
  events.push(...gift.outcome.inventory.acquire.map(itemId=>event({type:'item-changed',itemId,acquired:true},'gift')),
    ...Object.entries(gift.outcome.flags).map(([flag,value])=>event({type:'flag-changed',flag,value},'gift')));
  let state=replay(events,definition);
  assert.deepEqual(state.inventoryState[id],{ownerId:null,quantity:1,charges:3,maxCharges:3,chargeScope:'campaign'});
  assert.equal(available(gift,state,definition),false,'gift is granted once');
  for(const hero of heroes) assert.equal(reward(state,hero.id,'charisma').charges,3,'every party hero can use it');
  assert.equal(reward(state,heroes[0].id,'strength'),undefined);
  assert.equal(reward(state,'egor-kreed','charisma'),undefined,'NPC cannot use reward');
  assert.equal(reward({...state,heroHp:{...state.heroHp,[heroes[0].id]:0}},heroes[0].id,'charisma'),undefined);
  assert.equal(reward({...state,combat:{encounterId:'qa'}},heroes[0].id,'charisma'),undefined);
  for(let i=1;i<=3;i++) {
    assert.equal(reward(state,heroes[i-1].id,'charisma').charges,4-i);
    const result=resolveCheck({id:`reward-check-${i}`,dc:99,successText:'Успех',failureText:'Провал'},heroes[i-1],'charisma',[],true);
    assert.equal(result.success,true); assert.equal(result.automatic,true); assert.deepEqual(result.rolls,[]);
    events.push(event({type:'item-charge-changed',itemId:id,change:{mode:'delta',value:-1}},`use-${i}`), event({type:'roll-entered',result},`use-${i}`));
    state=replay(events,definition);
  }
  assert.equal(state.itemCharges[id],0);
  assert.equal(reward(state,heroes[0].id,'charisma').charges,0,'fourth use unavailable');
  assert.equal(recoverGalleryResourceScopes(state,['turn','round','battle','location']).itemCharges[id],0,'rest never refills campaign reward');
  assert.equal(replay(JSON.parse(JSON.stringify(events)),definition).itemCharges[id],0,'reload preserves spend');
  const undone=replay([...events,event({type:'action-corrected',correctedCommandId:'use-3'},'undo')],definition);
  assert.equal(undone.itemCharges[id],1); assert.equal(undone.lastRoll.checkId,'reward-check-2','one undo restores charge and previous roll');
  const newCampaignSeed=journal.createGallerySessionStartedEvent({definition,heroes,existingInventory:[id],eventId:'next-seed',commandId:'next-seed'});
  assert.equal(replay([newCampaignSeed],definition).itemCharges[id],3,'next campaign starts with three charges');
  const noGift=replay([...events,event({type:'action-corrected',correctedCommandId:'gift'},'undo-gift')],definition);
  assert.ok(!noGift.inventory.includes(id),'undo acquisition removes party reward');
  const store=new Map();
  globalThis.window={localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)}};
  const storage=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/partyRewardStorage.ts');
  storage.writePartyRewards('penisuela',[id]);
  assert.deepEqual(storage.readCarriedPartyRewards('next-campaign'),[id]);
  assert.deepEqual(storage.readCarriedPartyRewards('penisuela'),[],'no reimport into same campaign');
  storage.writePartyRewards('penisuela',[]);
  assert.deepEqual(storage.readCarriedPartyRewards('next-campaign'),[],'undo acquisition also removes carryover');
  delete globalThis.window;
  const scene=preview.scenes.find(s=>s.id==='wedding-epilogue');
  assert.ok((await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8')).includes(scene.interactionViews[0].readAloud));
  console.log('Grey Wiese reward: grant, guards, 3 charges, automatic result, rest, undo, reload, next campaign and guide passed.');
} finally {delete globalThis.window; await server.close();}
