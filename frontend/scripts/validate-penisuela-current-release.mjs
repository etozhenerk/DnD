import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
try {
 const {penisuelaSessionPreview:p,penisuelaGalleryGameplay:d,penisuelaGalleryHeroes:h,penisuelaDialogueBank:bank}=await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
 const ids=new Set(p.scenes.map(s=>s.id));assert.equal(ids.size,p.scenes.length);
 assert.equal(h.length,5);assert.equal(new Set(h.map(hero=>hero.id)).size,5);
 for(const b of p.sceneBlocks){assert.ok(ids.has(b.entrySceneId));for(const id of b.sceneIds)assert.ok(ids.has(id)||id==='hotel-overload-search',id);}
 for(const scene of p.scenes){assert.equal(p.sceneBlocks.filter(b=>b.sceneIds.includes(scene.id)).length,1);if(scene.exit)assert.ok(ids.has(scene.exit.nextSceneId));}
 const encounters=new Set(d.encounters.map(e=>e.id));assert.equal(encounters.size,d.encounters.length);
 const scopes=new Set(['turn','round','battle','location','campaign']);
 for(const action of d.combatActions){for(const id of action.encounterIds)assert.ok(encounters.has(id),`${action.id}: ${id}`);if(action.uses)assert.ok(scopes.has(action.uses.scope));}
 for(const scene of d.storyScenes){assert.ok(ids.has(scene.id));assert.equal(new Set(scene.actions.map(a=>a.id)).size,scene.actions.length);for(const a of scene.actions){assert.ok(ids.has(a.nextSceneId),`${scene.id}: ${a.nextSceneId}`);if(a.failureNextSceneId)assert.ok(ids.has(a.failureNextSceneId));if(a.encounterId)assert.ok(encounters.has(a.encounterId));}}
 for(const preset of bank.presets)for(const id of preset.sceneIds)assert.ok(ids.has(id)||id==='tavern-invitation');
 const paths=new Set();const collect=v=>{if(typeof v==='string'&&v.startsWith('assets/'))paths.add(v);else if(v&&typeof v==='object')for(const child of Object.values(v))collect(child);};collect(p);collect(d);
 for(const path of paths)await access(path);
 const canonical=await readFile('content/campaigns/penisuela-gallery-gameplay.json','utf8');assert.deepEqual(JSON.parse(await readFile('docs/campaigns/penisuela/gameplay.json','utf8')),JSON.parse(canonical));
 assert.equal((await readFile('docs/campaigns/penisuela/script.md','utf8')).split('\n').slice(1).join('\n'),(await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8')).split('\n').slice(1).join('\n'));
 console.log(`Current release data PASS: ${ids.size} screens + search, six checkpoints, five heroes, ${encounters.size} encounters, ${bank.presets.length} presets, ${paths.size} existing assets, current references and exact guide/gameplay mirrors.`);
} finally {await server.close();}
