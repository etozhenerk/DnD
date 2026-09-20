import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
try {
 const {canEnterHotelBar:canEnter}=await server.ssrLoadModule('/src/entities/campaign-session/model/hotelBarAccess.ts');
 const {penisuelaGalleryGameplay:d,penisuelaGalleryHeroes:heroes}=await server.ssrLoadModule('/src/entities/campaign-session/model/data.ts');
 const {replayGalleryEvents:replay}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
 const {createGallerySessionStartedEvent:seed,createStoredGallerySessionEnvelope:store,parseStoredGallerySessionEnvelope:load}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
 const first=seed({definition:d,heroes,existingInventory:[],eventId:'seed',commandId:'seed'});
 const alexis={type:'flag-changed',flag:'alexis-bar-permits-issued',value:true,id:'alexis',commandId:'alexis'};
 const tokens={type:'item-changed',itemId:'pussy-sultan-bar-passes',acquired:true,quantity:3,id:'tokens',commandId:'tokens'};
 assert.equal(canEnter(replay([first],d)),false);
 assert.equal(canEnter(replay([first,alexis],d)),false,'two permits are insufficient for five heroes');
 assert.equal(canEnter(replay([first,tokens],d)),false,'three tokens are insufficient for five heroes');
 const events=[first,alexis,tokens];
 const state=replay(events,d);
 assert.equal(canEnter(state),true);
 assert.equal(canEnter(replay([...events,{...tokens,id:'removed',commandId:'removed',acquired:false}],d)),false,'removed tokens no longer open the gate');
 assert.equal(canEnter(replay([...events,{type:'action-corrected',correctedCommandId:'tokens',id:'undo',commandId:'undo'}],d)),false,'undo reward closes the gate');
 assert.equal(canEnter(replay([first,{...alexis,flag:'pussy-bar-passes-issued'}],d)),false,'issued flag alone cannot replace missing tokens');
 assert.equal(canEnter(replay([first,{...tokens,itemId:'guest-bungalow-pass',quantity:5}],d)),false,'Olva passes do not grant bar access');
 assert.equal(canEnter(replay([first,{...tokens,itemId:'anonymous-bracelets',quantity:5}],d)),false,'hotel bracelets do not grant bar access');
 const expectation={campaignId:d.campaignId,definitionId:d.id,definitionVersion:d.version};
 const loaded=load(JSON.parse(JSON.stringify(store(events,expectation))),expectation);
 assert.ok(loaded.ok);assert.equal(canEnter(replay(loaded.events,d)),true);
 const guards=d.encounters.find(e=>e.id==='hotel-bar-arcane-guards');
 assert.equal(guards.units.length,3);assert.ok(guards.defeatFallback);
 console.log('Hotel bar PASS: no permits, partial permits, full 2+3, removed tokens, undo, reload, wrong passes, existing three guards.');
}finally{await server.close();}
