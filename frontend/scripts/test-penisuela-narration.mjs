import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
try {
  const {penisuelaSessionPreview:preview,penisuelaGalleryGameplay:gameplay}=await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  const {olvaQuest:quest,getOlvaQuestView:view}=await server.ssrLoadModule('/src/entities/campaign-session/model/olvaQuest.ts');
  const prose=[];
  for (const scene of preview.scenes) {
    for (const value of [scene,...(scene.interactionViews??[])]) {
      for (const field of ['readAloud','roomLegend']) if (value[field]) prose.push([`${scene.id}/${value.id}/${field}`,value[field]]);
    }
  }
  for(const milestone of gameplay.doomMilestones) prose.push([`doom/${milestone.id}`,milestone.readAloud]);
  for(const field of ['opening','success','clue']) prose.push([`dance/${field}`,gameplay.dancePuzzle[field]]);
  for(const track of gameplay.dancePuzzle.tracks) prose.push([`dance/${track.id}`,track.feedback]);
  for(const encounter of gameplay.encounters) {
    for(const field of ['startText','victoryText']) if(encounter[field]) prose.push([`${encounter.id}/${field}`,encounter[field]]);
  }
  const state={flags:{},inventory:[],combat:null};
  prose.push(['olva/intro',view(state).narration]);
  for(const ending of quest.endings) {
    const outcome={...state,flags:{'olva-table-complete':true,[`olva-table-ending-${ending.id}`]:true}};
    assert.equal(view(outcome).narration,ending.readAloud);
    assert.notEqual(view(outcome).narration,ending.resolution,'Spoken dialogue must not replace the scene description');
    prose.push([`olva/${ending.id}`,view(outcome).narration]);
  }
  for(const claimed of [false,true]) prose.push([`olva/reward/${claimed}`,view({...state,flags:{'olva-table-complete':true,'olva-table-reward-shown':true,'olva-table-reward-claimed':claimed}}).narration]);
  for(const [id,text] of prose) assert.doesNotMatch(text,/[«»]|(?:^|\n)\s*[—–]\s|(?:Оливия|Станис|Полинетта|Kreed|Angel|Grey Wiese)\s*:/u,id);
  const guide=await readFile('content/campaigns/penisuela-session-preview-guide.md','utf8');
  for(const scene of preview.scenes) for(const v of [scene,...scene.interactionViews??[]]) if(v.readAloud) assert.ok(guide.includes(v.readAloud),`${scene.id}/${v.id}: guide`);
  const stas=gameplay.storyScenes.find(s=>s.id==='closed-bar').actions.find(a=>a.id==='invite-stas-to-olva');
  assert.match(stas.resolution,/«/u,'Original character speech is retained separately');
  console.log(`Narration PASS: ${prose.length} scene/state texts without direct speech; Olva outcomes and reward use dedicated prose; dialogue retained outside narrator; guide in sync.`);
} finally {await server.close();}
