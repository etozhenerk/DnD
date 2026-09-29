import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
const hooksId='\0combat-hud-hooks';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{
 name:'combat-hud-hooks',enforce:'pre',resolveId(id){if(id==='combat-hud-hooks')return hooksId;},
 load(id){if(id!==hooksId)return;return `let slots=[],cursor=0,effects=[],dirty=true;
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((x,i)=>!Object.is(x,b[i]));
 export function reset(){slots=[];cursor=0;effects=[];dirty=true;}
 export function render(fn){cursor=0;dirty=false;return fn();}
 export function needsRender(){return dirty;}
 export function useState(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];}
 export function useMemo(fn,deps){const i=cursor++;if(changed(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value;}
 export function useEffect(fn,deps){const i=cursor++;if(changed(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}}
 export function flush(){const pending=effects;effects=[];pending.forEach(fn=>fn());}
 export function useSyncExternalStore(_,get){return get();}`;},
 transform(code,id){if(['/CombatEncounterHud.tsx','/combatPresentationSettings.ts'].some(p=>id.endsWith(p)))return code.replaceAll("from 'react'","from 'combat-hud-hooks'");},
}]});
try{
 const load=p=>server.ssrLoadModule(p);
 const hooks=await load('combat-hud-hooks');
 const {CombatEncounterHud:Hud}=await load('/src/widgets/campaign-scene/ui/CombatEncounterHud/CombatEncounterHud.tsx');
 const {penisuelaGalleryGameplay:definition,penisuelaGalleryHeroes:heroes}=await load('/src/entities/campaign-session/model/data.ts');
 const cmd=await load('/src/features/run-combat/model/combatCommands.ts');
 const rules=await load('/src/entities/combat/model/combatRules.ts');
 const settings=await load('/src/features/run-combat/model/combatPresentationSettings.ts');
 let ctx, events, input='',serial=0, tree, resolved=0;
 const walk=x=>!x||typeof x!=='object'?[]:Array.isArray(x)?x.flatMap(walk):[x,...walk(x.props?.children)];
 const node=name=>walk(tree).find(x=>x.type?.name===name).props;
 const commit=inputs=>{assert.ok(inputs);for(const e of inputs){const event={...e,id:`e${++serial}`,commandId:`c${serial}`};events.push(event);const r=rules.applyCombatEvent(ctx.combat,ctx.heroHp,event,definition);ctx={...ctx,...r};}};
 const props=()=>({...ctx,diceError:false,diceReady:true,fallbackEnemyToken:'',heroTokens:{},inputValue:input,isRolling:false,
 timelineEvents:[...events],onResetDie:()=>{input='';},onInputChange:v=>input=v,onRoll:()=>{},onContinue:()=>{},onCombatResolved:()=>{resolved++;},
 onSelectAction:id=>commit(cmd.createSelectCombatActionCommand(ctx,id)),onEquipItem:id=>commit(cmd.createEquipCombatItemCommand(ctx,id)),
 onHeroAttack:(h,t,r,from)=>{const e=cmd.createHeroAttackCommand(ctx,h,t,r,0,from);commit(e);return e.some(x=>x.type==='combat-attack-resolved'&&x.hit);},
 onEnemyAttack:(t,r)=>commit(cmd.createEnemyAttackCommand(ctx,t,r)),onSummonedAllyAttack:(h,t,r)=>commit(cmd.createSummonedAllyAttackCommand(ctx,h,t,r)),
 onUseAction:(id,t,r)=>{const e=cmd.createUseCombatActionCommand(ctx,id,t,r);if(!e)return false;commit(e);return true;},
 onApplyDamage:r=>{const result=cmd.createApplyCombatDamageCommand(ctx,r);if(!result)return false;commit(result.events);return{savingThrowRequired:!!ctx.combat.pendingSavingThrow};},
 onResolveSavingThrow:(r,from)=>{const e=cmd.createResolveCombatSavingThrowCommand(ctx,r,from);if(!e)return false;commit(e);return true;},
 });
 const draw=()=>{for(let i=0;i<20;i++){tree=hooks.render(()=>Hud(props()));hooks.flush();if(!hooks.needsRender())return;}throw new Error('HUD did not settle');};
 const start=(actor,encounterId='hotel-arcane-guards')=>{
 hooks.reset();events=[];input='';resolved=0;settings.setCombatSkillVideosEnabled(true);
 const encounter=definition.encounters.find(e=>e.id===encounterId)??definition.encounters[0];
 const order=[...new Set([actor,...heroes.map(h=>h.id),...(encounter.units?.map(u=>u.id)??[encounter.id])])];
 const combat=rules.createCombatState(encounter,order,definition);Object.values(combat.enemies).forEach(e=>e.hp=e.maxHp=200);
 ctx={combat,definition,heroes,heroHp:Object.fromEntries(heroes.map(h=>[h.id,h.maxHp-10])),participantConditions:{},resourceUses:{},inventoryState:Object.fromEntries(definition.combatActions.filter(a=>a.source==='item').map(a=>[a.sourceId,{ownerId:a.characterId,quantity:1,charges:20,maxCharges:20,chargeScope:'campaign'}]))};
 draw();};
 const select=id=>{const a=definition.combatActions.find(a=>a.id===id); if(a.source==='item')node('CombatArena').onEquipItem(id);else node('CombatArena').onSelectAction(id);draw();};
 const apply=(name,roll)=>{input=String(roll);draw();node('CombatArena')[name]();draw();};
 const cue=()=>node('CombatSkillVideoOverlay').cue;
 // Both automatic-attack buttons must proceed from an empty d20 field to damage.
 start('andrey-dark-elf','andrey-dark-elf');
 commit([{type:'combat-status-applied',status:{id:'fat-trap-test',kind:'grease-trap',sourceActorId:'igor-sinyak',targetId:'andrey-dark-elf',charges:1}}]);draw();
 assert.equal(input,'');assert.equal(node('CombatArena').automaticAttackLabel,'Отразить атаку');
 const protectedHp={...ctx.heroHp};const bossBefore=ctx.combat.enemies['andrey-dark-elf'].hp;
 node('CombatArena').onApplyAttack();draw();
 assert.equal(ctx.combat.pendingAttack.targetId,'andrey-dark-elf');assert.equal(ctx.combat.pendingAttack.critical,false);
 assert.equal(node('CombatArena').automaticAttackLabel,undefined);assert.equal(node('CombatArena').selectedTargetId,'andrey-dark-elf');
 assert.ok(node('CombatArena').targets.some(t=>t.id==='andrey-dark-elf'));
 assert.equal(node('CombatArena').inputMax,12);apply('onApplyDamage',8);
 assert.equal(ctx.combat.enemies['andrey-dark-elf'].hp,bossBefore-11);assert.deepEqual(ctx.heroHp,protectedHp);
 assert.equal(ctx.combat.pendingAttack,null);assert.ok(!ctx.combat.statuses.some(s=>s.kind==='grease-trap'));
 start('bubsilda','andrey-dark-elf');
 commit([{type:'combat-status-applied',status:{id:'guest-critical-test',kind:'guest-critical',sourceActorId:'egor-kreed',targetId:'bubsilda',againstTargetId:'andrey-dark-elf',charges:1}}]);draw();
 assert.equal(input,'');assert.equal(node('CombatArena').automaticAttackLabel,'Нанести критический удар');
 const criticalBossBefore=ctx.combat.enemies['andrey-dark-elf'].hp;
 node('CombatArena').onApplyAttack();draw();
 assert.equal(ctx.combat.pendingAttack.critical,true);assert.equal(ctx.combat.pendingAttack.automatic,true);
 assert.equal(node('CombatArena').automaticAttackLabel,undefined);assert.equal(node('CombatArena').inputMax,8);
 apply('onApplyDamage',5);
 assert.equal(ctx.combat.enemies['andrey-dark-elf'].hp,criticalBossBefore-16,'Critical damage is (5 + 3) × 2');
 assert.equal(ctx.combat.pendingAttack,null);assert.ok(!ctx.combat.statuses.some(s=>s.kind==='guest-critical'));
 console.log('PASS: reflection and guaranteed critical HUD buttons work with empty d20, enter damage mode, apply correct dice/modifier and consume one charge.');
 start('golovach-lena');select('lena-buldak-breath');apply('onApplyUtility',7);assert.equal(cue(),null);
 assert.equal(ctx.combat.pendingSavingThrow.kind,'area-damage-save');
 apply('onApplyAttack',1);assert.equal(cue(),null);assert.equal(ctx.combat.pendingSavingThrow.kind,'area-damage-status');
 apply('onApplyAttack',3);assert.equal(cue(),null);assert.equal(ctx.combat.pendingSavingThrow.kind,'area-damage-save');
 apply('onApplyAttack',20);assert.equal(ctx.combat.pendingSavingThrow,null);assert.equal(cue().id,'lena-buldak-breath');
 node('CombatSkillVideoOverlay').onComplete();draw();assert.equal(cue(),null);draw();assert.equal(cue(),null);
 start('linda');select('linda-blinding-pollen');apply('onApplyAttack',15);assert.equal(cue(),null);
 apply('onApplyDamage',3);assert.equal(cue(),null);assert.match(ctx.combat.pendingSavingThrow.actionName,/пыльца/);
 apply('onApplyAttack',1);assert.equal(cue().id,'linda-blinding-pollen');
 start('andrey-dragon','andrey-dragon');select('netak-retake');apply('onApplyAttack',15);assert.equal(cue(),null);
 apply('onApplyDamage',3);assert.equal(cue(),null);apply('onApplyAttack',1);assert.equal(cue().id,'netak-retake');
 // Movement/bonus skills play immediately, including both ways of toggling a stance.
 for (const [actionId,stance,active,filename] of [
  ['linda-flight','airborne',false,'linda-flight'],
  ['linda-flight','airborne',true,'linda-landing'],
  ['linda-tiny-size','tiny',false,'linda-tiny-size'],
  ['linda-tiny-size','tiny',true,'linda-return-normal-size'],
 ]) {
  start('linda');
  if(active){commit([{type:'combat-stance-changed',participantId:'linda',stance,active:true}]);draw();}
  const preloads=node('CombatSkillVideoOverlay').preloadCues;
  select(actionId);assert.equal(cue(),null,'Selecting alone must not play the clip');
  const before=events.length;
  apply('onApplyUtility',0);
  assert.equal(cue().id,actionId);assert.ok(cue().videoSrc.includes(filename),`${filename}: correct activation/deactivation video`);
  assert.ok(preloads.some(c=>c.videoSrc===cue().videoSrc),`${filename}: both directions are preloaded`);
  assert.equal(ctx.combat.initiativeOrder[ctx.combat.turnIndex],'linda','Video starts while Linda still owns the turn');
  assert.equal(ctx.combat.stances.linda.includes(stance),!active,'The stance changes before the video');
  assert.equal(events.slice(before).filter(e=>e.type==='turn-advanced').length,0);
  const after=events.length;
  node('CombatSkillVideoOverlay').onComplete();draw();assert.equal(cue(),null);
  assert.equal(events.length,after,'Finishing the video does not apply the skill again');
  apply('onApplyAttack',1);assert.notEqual(ctx.combat.initiativeOrder[ctx.combat.turnIndex],'linda','Linda can attack after the clip');
  assert.equal(cue(),null,'Finishing the attack does not replay the utility video');
 }
 // Several instant skills preserve order without waiting for an attack.
 start('linda');select('linda-flight');apply('onApplyUtility',0);assert.equal(cue().id,'linda-flight');
 select('linda-tiny-size');apply('onApplyUtility',0);assert.equal(cue().id,'linda-flight');
 node('CombatSkillVideoOverlay').onComplete();draw();assert.equal(cue().id,'linda-tiny-size');
 node('CombatSkillVideoOverlay').onComplete();draw();assert.equal(cue(),null);assert.equal(ctx.combat.initiativeOrder[ctx.combat.turnIndex],'linda');
 // Disabling skill videos suppresses instant clips as well.
 start('linda');settings.setCombatSkillVideosEnabled(false);draw();select('linda-flight');apply('onApplyUtility',0);
 assert.equal(cue(),null);assert.ok(ctx.combat.stances.linda.includes('airborne'));
 start('bubsilda');select('bubsilda-grandaxin');apply('onApplyUtility',8);assert.equal(ctx.combat.pendingSavingThrow.kind,'action-healing');assert.equal(cue(),null);
 apply('onApplyAttack',4);assert.notEqual(ctx.combat.initiativeOrder[ctx.combat.turnIndex],'bubsilda');assert.equal(cue().id,'bubsilda-grandaxin');
 // Disabling videos clears the whole deferred queue.
 start('golovach-lena');select('lena-buldak-breath');apply('onApplyUtility',7);settings.setCombatSkillVideosEnabled(false);draw();
 apply('onApplyAttack',20);apply('onApplyAttack',20);assert.equal(cue(),null);
 // A killing blow keeps the HUD mounted until the last clip finishes.
 start('golovach-lena');Object.values(ctx.combat.enemies).forEach((e,i)=>e.hp=i<2?1:0);draw();
 select('lena-buldak-breath');apply('onApplyUtility',7);
 apply('onApplyAttack',20);assert.equal(resolved,0);
 apply('onApplyAttack',20);assert.equal(cue().id,'lena-buldak-breath');assert.equal(resolved,0);
 node('CombatSkillVideoOverlay').onComplete();draw();assert.ok(resolved>0);
 const boss=readFileSync('src/widgets/campaign-scene/ui/AndreyBossAdventure/AndreyBossAdventure.tsx','utf8');
 assert.match(boss,/onCombatResolved=/);assert.doesNotMatch(boss,/combat && !firstVictory && !secondVictory \?/);
 console.log('PASS: immediate Linda flight/landing/size videos preserve attacks; ordered clips, deactivation preloads, delayed damage/saves/healing, boss completion, disabling and no replay.');
}finally{await server.close();}
