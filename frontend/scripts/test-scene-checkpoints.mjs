import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
const values = new Map();
globalThis.window = {localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}};
try {
 const {penisuelaGalleryGameplay:d,penisuelaGalleryHeroes:heroes,penisuelaSessionPreview:p}=await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
 const {createGallerySessionStartedEvent:start,parseGalleryEventLog:parse}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySessionJournal.ts');
 const {replayGalleryEvents:replay,getLastUndoableCommandId:last}=await server.ssrLoadModule('/src/entities/campaign-session/model/gallerySession.ts');
 const {ensureSceneCheckpoint:enter,restoreSceneCheckpoint:restore,clearSceneCheckpoints:clear}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/sceneCheckpointStorage.ts');
 const {readGallerySessionEvents:read,writeGallerySessionEvents:write}=await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/gallerySessionStorage.ts');
 const expectation={campaignId:d.campaignId,definitionId:d.id,definitionVersion:d.version};
 const normalize=s=>({...s,events:[]});
 let n=0; const event=(e,scope)=>({...e,id:`event-${++n}`,commandId:`command-${n}`,sceneScopeId:scope});
 const blocks=p.sceneBlocks;
 assert.equal(blocks.length,6);assert.equal(new Set(blocks.flatMap(b=>b.sceneIds)).size,blocks.flatMap(b=>b.sceneIds).length);
 for (const scene of p.scenes) assert.equal(blocks.filter(b=>b.sceneIds.includes(scene.id)).length,1,scene.id);
 for (const block of blocks) {
  clear(d.campaignId);values.clear();
  let log=[start({definition:d,heroes,existingInventory:['anonymous-bracelets','pussy-sultan-womanizer'],eventId:`seed-${++n}`,commandId:`seed-command-${n}`})];
  log.push(event({type:'flag-changed',flag:'before-block',value:true},'earlier-scene'));
  const entry=normalize(replay(log,d));write(expectation,log);
  const inventoryKey=`dnd:campaign-inventory:${d.campaignId}`;
  const original=JSON.stringify({version:1,campaignId:d.campaignId,revealedInspectableIds:['anonymous-bracelets','pussy-sultan-womanizer'],viewedInspectableIds:['anonymous-bracelets'],slots:[null,'anonymous-bracelets','pussy-sultan-womanizer']});
  values.set(inventoryKey,original);
  enter(d,blocks,block);
  const count=log.length;
  log.push(event({type:'item-changed',itemId:'pussy-sultan-womanizer',acquired:false},block.entrySceneId));
  log.push(event({type:'flag-changed',flag:'olva-table-complete',value:true},block.entrySceneId));
  log.push(event({type:'flag-changed',flag:'thorin-luxury-bag-skin',value:true},block.entrySceneId));
  log.push(event({type:'manual-adjustment',label:'Урон',reason:'Regression',adjustment:{kind:'participant-stat',participantId:heroes[0].id,field:'hp',value:1}},block.entrySceneId));
  assert.ok(parse(log,expectation).ok,JSON.stringify(parse(log,expectation)));write(expectation,log);
  values.set(inventoryKey,'changed');
  // Inner screens and reload never overwrite the entry checkpoint.
  enter(d,blocks,block);enter(d,blocks,block);
  assert.equal(restore(d,blocks,block),true);
  let restored=read(expectation);
  assert.equal(restored.length,log.length+1,'append-only audit');assert.equal(restored.at(-1).eventCount,count);
  assert.deepEqual(normalize(replay(restored,d)),entry,`${block.id}: complete state restored`);
  assert.equal(values.get(inventoryKey),original,'exact inventory slot order');
  assert.deepEqual(normalize(replay(JSON.parse(JSON.stringify(restored)),d)),entry,'reload');
  const changed=event({type:'flag-changed',flag:'new-decision',value:true},block.entrySceneId);
  restored.push(changed);write(expectation,restored);
  assert.equal(last(restored),changed.commandId,'undo uses new branch');
  assert.equal(restore(d,blocks,block),true);assert.deepEqual(normalize(replay(read(expectation),d)),entry,'second restart');
 }
 // A previous undo inside the block must not erase progress that existed at entry.
 clear(d.campaignId);values.clear();
 let log=[start({definition:d,heroes,existingInventory:[],eventId:'seed-final',commandId:'seed-final'})];
 const early=event({type:'flag-changed',flag:'early-earned',value:true},'hotel-overload');log.push(early);write(expectation,log);enter(d,blocks,blocks[1]);
 log.push(event({type:'action-corrected',correctedCommandId:early.commandId},'hotel-gallery'));write(expectation,log);
 assert.equal(replay(log,d).flags['early-earned'],undefined);restore(d,blocks,blocks[1]);assert.equal(replay(read(expectation),d).flags['early-earned'],true);
 // Legacy save with no checkpoints starts before its first local action.
 clear(d.campaignId);values.clear();write(expectation,log);enter(d,blocks,blocks[1]);restore(d,blocks,blocks[1]);assert.equal(replay(read(expectation),d).flags['early-earned'],true);
 const broken=[...log,{id:'broken',commandId:'broken',type:'scene-checkpoint-restored',eventCount:999}];assert.equal(parse(broken,expectation).ok,false);
 console.log('Scene checkpoints PASS: six blocks, 29 routes, first-entry capture, exact inventory slots, decisions/HP/item rollback, repeat/reload, append-only audit, undo restoration, legacy journal migration and invalid boundary guards.');
} finally {delete globalThis.window;await server.close();}
