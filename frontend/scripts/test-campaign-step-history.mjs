import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{
  name:'step-history-hooks',enforce:'pre',transform(code,id){
    if(id.endsWith('/useGallerySession.ts')) return code.replace("from 'react'", "from '/scripts/helpers/gallery-hook-harness.mjs'");
  },
}]});
const storage = new Map();
const previousWindow = globalThis.window;
globalThis.window = {localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}};
try {
 const load=p=>server.ssrLoadModule(p);
 const {penisuelaGalleryGameplay:definition,penisuelaGalleryHeroes:heroes,penisuelaSessionPreview:preview}=await load('/src/entities/campaign-session/model/playableData.ts');
 const {useGallerySession}=await load('/src/features/navigate-campaign-scene/model/useGallerySession.ts');
 const {resetHooks,renderHook}=await load('/scripts/helpers/gallery-hook-harness.mjs');
 const {createSceneNavigationEvent,getLastCampaignStep,createStepCorrection}=await load('/src/features/navigate-campaign-scene/model/campaignStepHistory.ts');
 const {readGallerySessionEvents,writeGallerySessionEvents}=await load('/src/features/navigate-campaign-scene/model/gallerySessionStorage.ts');
 const expectation={campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};
 let scene='hotel-overload-search',controller;
 const path=id=>`/campaign/penisuela/play/${id}`;
 const draw=()=>controller=renderHook(()=>useGallerySession(definition,heroes,preview.scenes.map(s=>s.id),{sceneScopeId:scene.split('?')[0]}));
 const reload=()=>{resetHooks();draw();};
 const fresh=(id=scene)=>{scene=id;storage.clear();reload();};
 const go=id=>{const events=readGallerySessionEvents(expectation);const event=createSceneNavigationEvent(path(scene),path(id),events,definition);assert.ok(event);writeGallerySessionEvents(expectation,[...events,event]);scene=id;reload();};
 const back=()=>{const events=readGallerySessionEvents(expectation);const event=getLastCampaignStep(events);assert.ok(event);writeGallerySessionEvents(expectation,[...events,createStepCorrection(event)]);if(event.type==='scene-navigated')scene=event.fromPath.split('/play/')[1];reload();};
 fresh();
 for(const item of ['recording-for-egorik','overload-console']){assert.ok(controller.commitStoryOutcome({inventory:{acquire:[item]}}));draw();}
 const before=structuredClone(controller.state.inventoryState);
 go('hotel-gallery');go('closed-bar');reload();
 back();assert.equal(scene,'hotel-gallery');assert.deepEqual(controller.state.inventoryState,before);
 back();assert.equal(scene,'hotel-overload-search');assert.deepEqual(controller.state.inventoryState,before);
 back();assert.ok(!controller.state.inventory.includes('overload-console'));assert.ok(controller.state.inventory.includes('recording-for-egorik'));
 back();assert.ok(!controller.state.inventory.includes('recording-for-egorik'));
 assert.ok(!getLastCampaignStep(controller.state.events));
 fresh('hotel-overload-search');
 const leaveRoom=()=>controller.commitStoryAction('hotel-overload','continue-1-hotel-gallery');
 assert.equal(leaveRoom(),false,'Empty inventory cannot unlock the hotel door');
 assert.ok(controller.commitStoryOutcome({inventory:{acquire:['anonymous-bracelets']}}));draw();
 assert.equal(leaveRoom(),false,'Bracelets without the console cannot unlock the door');
 assert.ok(controller.commitStoryOutcome({inventory:{acquire:['overload-console']}}));draw();reload();
 // The playable search route uses the hotel-overload story node and its own scope.
 assert.ok(leaveRoom());draw();go('hotel-gallery');
 back();assert.equal(scene,'hotel-overload-search');assert.ok(controller.state.inventory.includes('anonymous-bracelets'));
 back();assert.ok(!controller.state.inventory.includes('overload-console'));assert.equal(leaveRoom(),false,'Undo pickup locks the door again');
 back();assert.ok(!controller.state.inventory.includes('anonymous-bracelets'));assert.ok(!getLastCampaignStep(controller.state.events));
 fresh('hotel-overload-search');
 assert.ok(controller.commitStoryOutcome({inventory:{acquire:['overload-console']}}));draw();
 assert.equal(leaveRoom(),false,'Console without bracelets cannot unlock the door');
 assert.ok(controller.commitStoryOutcome({inventory:{acquire:['anonymous-bracelets']}}));draw();
 assert.ok(leaveRoom(),'Either pickup order unlocks the door once both items are held');
 fresh('andrey-boss');
 const boss=definition.bossSequence;
 for(const [flag,target] of [['andrey-death-video-finished',boss.aftermath.returnSceneId],['andrey-bad-ending',boss.defeat.returnSceneId]]){
  fresh(boss.sceneId);assert.ok(controller.commitStoryOutcome({flags:{[flag]:true}}));draw();go(target);back();
  assert.equal(scene,boss.sceneId);assert.ok(!controller.state.flags[flag],`${flag}: undo must stop the automatic redirect`);
 }
 fresh('hotel-gallery');
 assert.ok(controller.manualSetActiveScene('closed-bar','hotel-gallery'));draw();go('closed-bar');back();
 assert.equal(scene,'hotel-gallery');assert.ok(!getLastCampaignStep(controller.state.events));
 fresh('bungalow-courtyard');
 assert.ok(controller.commitStoryAction(scene,'continue-2-groom-tunnel'));draw();go('olva-passes-handoff');
 assert.ok(controller.state.flags['olva-bungalow-access-issued']);
 back();assert.equal(scene,'bungalow-courtyard');assert.ok(!controller.state.flags['olva-bungalow-access-issued']);assert.ok(!controller.state.inventory.includes('guest-bungalow-pass'));
 assert.ok(controller.commitStoryAction(scene,'continue-1-couples-session-entry'));draw();go('guest-bungalows');back();
 assert.ok(!controller.state.flags['olva-quest-accepted']);
 fresh('closed-bar');go('closed-bar?view=stas');
 assert.ok(controller.commitStoryAction('closed-bar','receive-stas-bungalow-pass'));draw();
 go('closed-bar');back();assert.equal(scene,'closed-bar?view=stas');assert.ok(controller.state.inventory.includes('stas-bungalow-pass'));
 back();assert.ok(!controller.state.inventory.includes('stas-bungalow-pass'));back();assert.equal(scene,'closed-bar');
 console.log('PASS: pickups → transitions → repeated undo; reload; decline/accept Olivia; Stas reward and query-view navigation; transition effects undo atomically.');
} finally {globalThis.window=previousWindow;await server.close();}
