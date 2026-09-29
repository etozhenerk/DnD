import assert from 'node:assert/strict';
import {createServer} from 'vite';
const id='\0effect-feedback-hooks';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{
 name:'effect-feedback-hooks',enforce:'pre',resolveId(name){if(name==='effect-feedback-hooks')return id;},
 load(name){if(name!==id)return;return `let slots=[],cursor=0,effects=[],dirty=true;
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i]));
 export function reset(){slots.forEach(s=>s?.cleanup?.());slots=[];cursor=0;effects=[];dirty=true;}
 export function render(fn){cursor=0;dirty=false;return fn();}
 export function needsRender(){return dirty;}
 export function useRef(value){const i=cursor++;return slots[i]??=( {current:value} );}
 export function useState(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,next=>{const v=typeof next==='function'?next(slots[i].value):next;if(!Object.is(v,slots[i].value)){slots[i].value=v;dirty=true;}}];}
 export function useEffect(fn,deps){const i=cursor++;if(changed(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}}
 export const useLayoutEffect=useEffect;
 export function flush(){const e=effects;effects=[];e.forEach(fn=>fn());}`;},
 transform(code,path){if(path.endsWith('/useCombatEffectFeedback.ts'))return code.replace("from 'react'","from 'effect-feedback-hooks'");},
}]});
let hooks;
try {
 hooks=await server.ssrLoadModule('effect-feedback-hooks');
 const {useCombatEffectFeedback:useFeedback,COMBAT_EFFECT_ANIMATION_MS:duration}=await server.ssrLoadModule('/src/widgets/campaign-scene/model/useCombatEffectFeedback.ts');
 const passive={id:'passive',visual:'ice',passive:true,shortLabel:'Стойкость',label:'Стойкость',tone:'positive'};
 const prone={id:'prone',visual:'prone',shortLabel:'Лежит',label:'Лежит',tone:'negative'};
 const stun={id:'stun',visual:'stun',shortLabel:'Оглушён',label:'Оглушён',tone:'negative'};
 let subjects=[{id:'hero',effects:[passive]}],feedback;
 const draw=()=>{for(let i=0;i<20;i++){feedback=hooks.render(()=>useFeedback(subjects));hooks.flush();if(!hooks.needsRender())return;}throw new Error('Feedback does not settle');};
 const tick=async()=>{await new Promise(resolve=>setTimeout(resolve,duration+70));draw();};
 draw();assert.equal(feedback.cueFor('hero'),undefined,'no passive animation on start');
 subjects=[{id:'hero',effects:[passive,prone,stun]}];draw();
 assert.equal(feedback.cueFor('hero').effect.id,'prone');
 assert.deepEqual(feedback.visibleEffects('hero',subjects[0].effects).map(e=>e.id),['passive'],'captions wait for their own clip');
 await tick();assert.equal(feedback.cueFor('hero').effect.id,'stun','second effect plays after first');
 assert.deepEqual(feedback.visibleEffects('hero',subjects[0].effects).map(e=>e.id),['passive','prone']);
 await tick();assert.equal(feedback.cueFor('hero'),undefined,'all animation layers stop');
 assert.equal(feedback.visibleEffects('hero',subjects[0].effects).length,3,'only static captions remain');
 subjects=[{id:'hero',effects:[{...passive,shortLabel:'Стойкость ×1'},prone]}];draw();assert.equal(feedback.cueFor('hero'),undefined,'counters/expiry stay quiet');
 hooks.reset();draw();assert.equal(feedback.cueFor('hero'),undefined,'restored active condition does not replay');
 subjects=[{id:'hero',effects:[passive]}];draw();subjects=[{id:'hero',effects:[passive,prone]}];draw();assert.ok(feedback.cueFor('hero'));
 subjects=[{id:'hero',effects:[passive]}];draw();assert.equal(feedback.cueFor('hero'),undefined,'undo cancels pending animation');
 subjects=[{id:'another-hero',effects:[passive,prone]}];draw();assert.equal(feedback.cueFor('another-hero'),undefined,'actor switch does not replay an old status');
 console.log('PASS: application → one finite clip → caption; sequential effects, no passive/idle/reload/turn-switch animation, undo cancels cues.');
} finally {hooks?.reset();await server.close();}
