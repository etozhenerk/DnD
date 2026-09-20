import {readFileSync, writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import assert from 'node:assert/strict';

// Use the real commands and reducer, including passives, damage dice and usage scopes.
const server = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
const originalRandom = Math.random;
try {
  const load = path => server.ssrLoadModule(path);
  const {penisuelaGalleryGameplay:canonical, penisuelaGalleryHeroes:heroes} = await load('/src/entities/campaign-session/model/data.ts');
  const {applyGalleryEvent, replayGalleryEvents} = await load('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await load('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const rules = await load('/src/entities/combat/model/combatRules.ts');
  const cmd = await load('/src/features/run-combat/model/combatCommands.ts');
  const {getCombatHelpingReaction} = await load('/src/features/run-combat/model/combatHelpingReaction.ts');
  const {isCombatVictory, isCombatCreature} = await load('/src/entities/combat/model/combatObjectives.ts');
  const {createNpcDecisionView} = await load('/src/features/navigate-campaign-scene/model/npcDecision.ts');
  const {createOlvaRestCommand} = await load('/src/entities/campaign-session/model/olvaRest.ts');
  const definition = structuredClone(canonical);
  const overrides = process.env.PENISUELA_BALANCE_OVERRIDES ? JSON.parse(readFileSync(process.env.PENISUELA_BALANCE_OVERRIDES,'utf8')) : {};
  for (const encounter of definition.encounters) Object.assign(encounter, overrides[encounter.id] ?? {});
  const trials = Number(process.env.PENISUELA_BALANCE_TRIALS ?? 2000);
  if (!Number.isInteger(trials) || trials < 1) throw new Error('Invalid trial count');
  const enemyPolicy=process.env.PENISUELA_BALANCE_ENEMY_POLICY??'suggested';
  if(!['suggested','spread','random','focus'].includes(enemyPolicy))throw new Error('Unknown enemy policy');
  const skillRound=Number(process.env.PENISUELA_BALANCE_SKILL_ROUND??1);
  const totalHp = heroes.reduce((sum,h)=>sum+h.maxHp,0);
  let serial = 0, trace = null, usageTotals = {};
  const event = e => {
    if(e.type==='combat-action-used') {
      const action=definition.combatActions.find(a=>a.id===e.actionId);
      if(action && heroes.some(h=>h.id===action.characterId) && (action.source==='item'||['battle','location','campaign'].includes(e.scope))) {
        const usage=usageTotals[action.characterId]??={items:0,limitedAbilities:0};
        usage[action.source==='item'?'items':'limitedAbilities']++;
      }
    }
    const next={...e,id:`sim-${++serial}`,commandId:`sim-${serial}`};trace?.push(next);return next;};
  const seedEvent = journal.createGallerySessionStartedEvent({definition,heroes,eventId:'seed',commandId:'seed',existingInventory:[]});
  const initial = replayGalleryEvents([seedEvent],definition);
  function random(seed) {
    let a = seed >>> 0;
    return () => {a += 0x6d2b79f5;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  const d = n => Math.floor(Math.random()*n)+1;
  const rawDice = expression => {
    const m = /^(\d+)d(\d+)/u.exec(expression);
    if (!m) return 0;
    return Array.from({length:Number(m[1])},()=>d(Number(m[2]))).reduce((a,b)=>a+b,0);
  };
  const rollMode = mode => {const first=d(20);return mode==='normal'?first:mode==='advantage'?Math.max(first,d(20)):Math.min(first,d(20));};
  const living = state => Object.values(state.combat.enemies).filter(e=>e.hp>0);
  function fight(state, encounterId, policy) {
    const encounter = definition.encounters.find(e=>e.id===encounterId);
    if (!encounter) throw new Error(`Unknown encounter ${encounterId}`);
    const apply = events => {
      if (!events) throw new Error(`Invalid command in ${encounterId}`);
      for (const input of events) {
        state=applyGalleryEvent(state,event(input),definition);
        if(input.type==='combat-action-used' && definition.combatActions.find(a=>a.id===input.actionId)?.source==='item' && state.inventoryState[input.sourceId]?.maxCharges!==null) state=applyGalleryEvent(state,event({type:'item-charge-changed',itemId:input.sourceId,change:{mode:'delta',value:-1}}),definition);
      }
      // Logs do not affect mechanics; bound memory during Monte Carlo runs.
      if(state.combat) state={...state,combat:{...state.combat,log:[]}};
    };
    const ctx = () => ({...state,definition,heroes});
    apply([{type:'combat-started',encounterId,initiativeOrder:rules.createCombatInitiative(encounter,heroes)}]);
    let turns=0;
    function action(id,target) {
      const a=definition.combatActions.find(a=>a.id===id);
      if (!a || !a.encounterIds.includes(encounterId) || !cmd.isCombatActionSourceAvailable(a,ctx())) return false;
      const equip = a.source==='item' ? cmd.createEquipCombatItemCommand(ctx(),id) : null;
      if (a.source==='item' && !equip) return false;
      if (equip) apply(equip);
      else {const select=cmd.createSelectCombatActionCommand(ctx(),id);if(!select)return false;apply(select);}
      if(cmd.getCombatActionActivation(a)==='attack')return true;
      const effect=a.effects.find(e=>e.type==='roll-table'||e.type==='area-damage'||e.type==='enemy-area-damage'||e.type==='enemy-crown'||(e.type==='enemy-saving-throw'&&e.damage)||e.type==='healing'||e.type==='summon-allies'||e.type==='guest-skill');
      const expression = (a.effects.some(e=>e.type==='area-saving-throw')?'1d20':undefined) ?? a.check?.dice ?? (effect?.type==='summon-allies'?effect.countDice:effect?.type==='enemy-crown'?effect.retaliationDice:effect?.damage ?? effect?.dice);
      const inputs=cmd.createUseCombatActionCommand(ctx(),id,target,expression?rawDice(expression):undefined);
      if (!inputs) {apply([{type:'combat-action-selected',actionId:id,selected:false}]);return false;}
      apply(inputs);return true;
    }
    while(state.combat && !isCombatVictory(state.combat) && heroes.some(h=>state.heroHp[h.id]>0) && turns<1600 && state.combat.round<=60) {
      turns++;
      const c=state.combat;
      if(c.pendingAttack) {
        const raw=rules.getPendingDamageRoll(c.pendingAttack).dice.reduce((sum,die)=>sum+Array.from({length:die.count},()=>d(die.sides)).reduce((a,b)=>a+b,0),0);
        const result=cmd.createApplyCombatDamageCommand(ctx(),raw);apply(result?.events);continue;
      }
      if(c.pendingSavingThrow) {const roll=rawDice(c.pendingSavingThrow.rollExpression ?? '1d20'); const help=policy!=='basic'&&Boolean(getCombatHelpingReaction(ctx(),c.pendingSavingThrow.targetId,roll));const inputs=cmd.createResolveCombatSavingThrowCommand(ctx(),roll,undefined,help);if(!inputs)throw new Error(JSON.stringify({pending:c.pendingSavingThrow,active:c.initiativeOrder[c.turnIndex],enemies:c.enemies}));apply(inputs);continue;}
      const actor=c.initiativeOrder[c.turnIndex];
      if(c.conditions[actor]?.includes('stunned')){apply([{type:'turn-advanced'}]);continue;}
      const enemies=living(state);
      const hero=heroes.find(h=>h.id===actor);
      if(hero) {
        if(state.heroHp[actor]<=0){apply([{type:'turn-advanced'}]);continue;}
        const creatures=enemies.filter(isCombatCreature);
        let target=[...creatures].sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];
        // In the boss arena normal play rescues each guest, whose real one-turn skill is used below.
        if(policy!=='basic') target=enemies.find(e=>e.kind==='object')??target;
        const currentActor = () => state.combat.initiativeOrder[state.combat.turnIndex];
        if(policy!=='basic') {
          if(actor==='linda' && !c.stances[actor]?.includes('airborne')) action('linda-flight');
          if(actor==='linda' && (['smart','resourceful'].includes(policy) ? state.combat.stances[actor]?.includes('tiny') : !state.combat.stances[actor]?.includes('tiny'))) action('linda-tiny-size');
          if(actor==='golovach-lena' && !['smart','resourceful'].includes(policy)) action('lena-creative-crisis');
          if(actor==='bubsilda' && state.heroHp[actor]<=hero.maxHp-6) action('bubsilda-grandaxin');
          if(actor==='thorin-pukoshchit' && state.heroHp[actor]<=hero.maxHp-8) action('thorin-work-until-pulse-drops');
          if(state.combat.pendingSavingThrow || currentActor()!==actor)continue;
          const wounded=[...heroes].filter(h=>h.id!==actor).sort((a,b)=>state.heroHp[a.id]/a.maxHp-state.heroHp[b.id]/b.maxHp);
          const needsHeal = h => state.heroHp[h.id]/h.maxHp < (policy==='tactical'?0.6:policy==='cautious'?0.5:0.4);
          if(actor==='linda' && wounded[0] && needsHeal(wounded[0]) && action('linda-healing-pollen',wounded[0].id))continue;
          if(actor==='linda' && needsHeal(hero) && action('linda-pitahaya-reserve',actor))continue;
          if(actor==='golovach-lena' && needsHeal(hero) && (action('lena-buldak-noodles',actor)||action('lena-sleep-scroll',actor)))continue;
          if(actor==='thorin-pukoshchit' && wounded[0] && needsHeal(wounded[0]) && action('thorin-ration-pouch',wounded[0].id))continue;
          // Standard: use signature control/AOE once, reserve campaign summons for bosses.
          if(actor==='bubsilda' && creatures.length>=2 && !creatures.every(e=>state.combat.conditions[e.id]?.includes('stunned')) && action('bubsilda-emergency-landing'))continue;
          if(actor==='lambert' && creatures.length>=2 && action('lambert-sarcasm'))continue;
          if(actor==='golovach-lena' && creatures.length>=2 && action('lena-buldak-breath',target.id))continue;
          if(actor==='thorin-pukoshchit' && action('thorin-hypnotic-smile',target.id))continue;
          if((policy==='tactical'||encounterId==='andrey-dark-elf'||policy==='resourceful'&&encounterId==='egorik-bungalow-guards') && actor==='bubsilda' && action('bubsilda-ice-guard'))continue;
          if((policy==='tactical'||encounterId==='andrey-dark-elf'||policy==='resourceful'&&encounterId==='egorik-bungalow-guards') && actor==='linda' && action('linda-pitahaya-summon'))continue;
          if(actor==='linda' && action('linda-resort-turbulence'))continue;
          if(actor==='lambert') {
            if(encounterId.startsWith('andrey-')||policy==='resourceful'&&encounterId==='egorik-bungalow-guards') action('lambert-double-shot',target.id);
            else action('lambert-hud-helmet-guards',target.id);
          }
          if(currentActor()!==actor)continue;
        }
        const attack=encounter.heroAttacks.find(a=>a.characterId===actor);
        const mode=rules.getCombatAttackRollMode(state.combat,actor,target.id,rules.getCombatAttackRange(attack));
        apply(cmd.createHeroAttackCommand(ctx(),actor,target.id,rollMode(mode)));
      } else if(c.allies[actor]) {
        const ally=c.allies[actor],target=enemies.find(e=>e.id==='andrey-dark-elf')??enemies.find(isCombatCreature);
        const guest=definition.combatActions.find(a=>a.characterId===actor && a.effects.some(e=>e.type==='guest-skill'));
        if(policy!=='basic'&&guest&&action(guest.id,guest.target==='ally'?'golovach-lena':target.id))continue;
        apply(cmd.createSummonedAllyAttackCommand(ctx(),actor,target.id,rollMode(rules.getCombatAttackRollMode(c,actor,target.id,rules.getCombatAttackRange(ally.attack)))));
      } else {
        const enemy=c.enemies[actor];
        if(!enemy||enemy.hp<=0||!isCombatCreature(enemy)){apply([{type:'turn-advanced'}]);continue;}
        const decision=createNpcDecisionView({actorId:actor,definition,heroes,state})?.suggestion;
        const availableHeroes=heroes.filter(h=>state.heroHp[h.id]>0);
        const target=enemyPolicy==='random'?availableHeroes[d(availableHeroes.length)-1].id
          :enemyPolicy==='spread'?[...availableHeroes].sort((a,b)=>state.heroHp[b.id]/b.maxHp-state.heroHp[a.id]/a.maxHp)[0].id
          :enemyPolicy==='focus'?[...availableHeroes].sort((a,b)=>state.heroHp[a.id]-state.heroHp[b.id])[0].id
          :decision?.targetIds[0]??[...availableHeroes].sort((a,b)=>state.heroHp[b.id]-state.heroHp[a.id])[0].id;
        if(decision)apply([{type:'npc-action-selected',enemyId:actor,actionId:decision.actionId,targetId:target,targetIds:[target],confirmed:true,skipped:false,explanation:decision.explanation}]);
        const skill=c.round>=skillRound && definition.combatActions.find(a=>a.id===decision?.actionId);
        if(skill && action(skill.id,target) && cmd.getCombatActionActivation(skill)!=='attack')continue;
        if(enemy.attack.savingThrow) { // Legacy control-only masks; active routes do not use these.
          apply([{type:'turn-advanced'}]);continue;
        }
        const selectedAttack=skill?.effects.find(e=>e.type==='replace-attack')?.attack??enemy.attack;
        const roll=rollMode(rules.getCombatAttackRollMode(state.combat,actor,target,rules.getCombatAttackRange(selectedAttack)));
        const help=policy!=='basic'&&Boolean(getCombatHelpingReaction(ctx(),target,roll));
        const attackEvents=cmd.createEnemyAttackCommand(ctx(),target,roll,undefined,help);if(!attackEvents)throw new Error(JSON.stringify({actor,target,conditions:state.combat.conditions,statuses:state.combat.statuses,enemy}));apply(attackEvents);
      }
    }
    const victory=state.combat && isCombatVictory(state.combat);
    const result={victory:Boolean(victory),rounds:state.combat.round,hp:heroes.reduce((sum,h)=>sum+state.heroHp[h.id],0),heroHp:{...state.heroHp},usage:structuredClone(usageTotals),down:heroes.filter(h=>state.heroHp[h.id]<=0).length,timeout:turns>=1600||state.combat.round>60};
    if(victory)apply([{type:'combat-ended',text:encounter.victoryText??'Победа'},{type:'combat-cleared',encounterId}]);
    return {state,result};
  }
  const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
  const stats = values => ({mean:values.reduce((sum,value)=>sum+value,0)/values.length,p10:quantile(values,.1),median:quantile(values,.5),p90:quantile(values,.9)});
  const summarize = results => ({
    trials:results.length, victory:results.filter(r=>r.victory).length/results.length,
    targetBand:results.filter(r=>r.victory&&r.hp>=totalHp*.3&&r.hp<=totalHp*.4).length/results.length,
    allHeroesAtLeast30:results.filter(r=>heroes.every(h=>r.heroHp[h.id]>=h.maxHp*.3)).length/results.length,
    allHeroesInTargetBand:results.filter(r=>heroes.every(h=>r.heroHp[h.id]>=h.maxHp*.3&&r.heroHp[h.id]<=h.maxHp*.4)).length/results.length,
    hp:stats(results.map(r=>r.hp)),
    heroes:Object.fromEntries(heroes.map(h=>[h.id,{
      maxHp:h.maxHp,hp:stats(results.map(r=>r.heroHp[h.id])),
      atLeast30:results.filter(r=>r.heroHp[h.id]>=h.maxHp*.3).length/results.length,
      targetBand:results.filter(r=>r.heroHp[h.id]>=h.maxHp*.3&&r.heroHp[h.id]<=h.maxHp*.4).length/results.length,
      down:results.filter(r=>r.heroHp[h.id]<=0).length/results.length,
      itemUses:stats(results.map(r=>r.usage[h.id]?.items??0)),
      limitedAbilityUses:stats(results.map(r=>r.usage[h.id]?.limitedAbilities??0)),
    }])),
    rounds:quantile(results.map(r=>r.rounds),.5),down:results.filter(r=>r.down>0).length/results.length,
    timeouts:results.filter(r=>r.timeout).length,
  });
  const cases=[
    {id:'minimal-before-boss',encounters:['club-beat-guards','egorik-bungalow-guards']},
    {id:'minimal-no-rest',encounters:['club-beat-guards','egorik-bungalow-guards','andrey-dark-elf','andrey-dragon']},
    {id:'minimal-rest-before-boss',encounters:['club-beat-guards','egorik-bungalow-guards','andrey-dark-elf','andrey-dragon'],restAfterIndex:1},
    {id:'minimal-early-rest',encounters:['club-beat-guards','egorik-bungalow-guards','andrey-dark-elf','andrey-dragon'],restAfterIndex:0},
    ...definition.encounters.filter(e=>!['dressing-room-mirror-doubles','universal-advice-algorithm','confidentiality-corp-de-ballet'].includes(e.id)).map(e=>({id:e.id,encounters:[e.id]})),
    {id:'standard-before-rest',encounters:['prop-room-winding-carriers','hotel-bar-arcane-guards','club-beat-guards']},
    {id:'hostile-before-rest',encounters:['hotel-vip-guards','hotel-bar-arcane-guards','club-beat-guards']},
    {id:'story-quest-before-rest',encounters:['prop-room-winding-carriers','club-beat-guards']},
    {id:'two-gates-before-rest',encounters:['prop-room-winding-carriers','hotel-bar-arcane-guards','club-beat-guards','hotel-bar-arcane-guards']},
    {id:'repeated-wave-before-rest',encounters:['prop-room-winding-carriers','hotel-bar-arcane-guards','club-beat-guards','club-beat-guards']},
    {id:'direct-before-rest',encounters:['club-beat-guards']},
    {id:'all-before-rest-stress',encounters:['hotel-vip-guards','prop-room-winding-carriers','hotel-bar-arcane-guards','club-beat-guards']},
    {id:'after-rest-finale',encounters:['egorik-bungalow-guards','andrey-dark-elf','andrey-dragon'],rest:true},
    {id:'full-campaign',encounters:['prop-room-winding-carriers','hotel-bar-arcane-guards','club-beat-guards','egorik-bungalow-guards','andrey-dark-elf','andrey-dragon'],restAfter:'club-beat-guards'},
    // One mistake summons one wave; the subsequent correct answer adds no wave.
    // Two mistakes summon two waves, with HP and resources carried between them.
    {id:'quest-two-mistakes',encounters:['prop-room-winding-carriers','club-beat-guards','club-beat-guards']},
    {id:'hostile-with-passes',encounters:['hotel-vip-guards','club-beat-guards']},
    {id:'hostile-two-mistakes',encounters:['hotel-vip-guards','club-beat-guards','club-beat-guards']},
    {id:'early-egorik-two-mistakes',encounters:['prop-room-winding-carriers','club-beat-guards','club-beat-guards','egorik-bungalow-guards']},
    {id:'full-two-mistakes',encounters:['prop-room-winding-carriers','club-beat-guards','club-beat-guards','egorik-bungalow-guards','andrey-dark-elf','andrey-dragon'],restAfterIndex:2},
  ].filter(c=>!process.env.PENISUELA_BALANCE_CASES||process.env.PENISUELA_BALANCE_CASES.split(',').includes(c.id));
  const report={version:7,totalHp,trials,enemyPolicy,skillRound,engine:'production commands + applyGalleryEvent',encounterStats:Object.fromEntries(definition.encounters.map(e=>[e.id,{hp:e.hp,ac:e.ac}])),assumptions:['Author expects at most one or two wrong-track confirmations; a correct answer after a mistake adds no further wave.','No optional d8 rests or automatic location-resource refills between fights; battle resources recover through the actual engine.','Normal healing below 40% individual HP; cautious below 50%; tactical below 60%.','Normal controls/AOE; Linda uses flight, tiny form and protective wind; flight/size preserve the action; every other active skill ends the turn. Smart play avoids an unnecessary creative-crisis setup and keeps Linda full-sized for damage; campaign summons saved for boss.',`Enemy targets: ${enemyPolicy}; skills are available from round ${skillRound}; skills follow the production NPC recommendation; Thorin assistance is explicitly chosen when it changes the outcome.`,'Timeout restores ALL hero ability scopes, including campaign, and all owned item charges. Resourceful policy spends summons/double-shot at Egorik anticipating this reset.','No forced healing or HP adjustment to reach the target.'],cases:{}};
  for(const scenario of cases) {
    report.cases[scenario.id]={};
    for(const policy of (process.env.PENISUELA_BALANCE_POLICIES??'basic,normal,tactical').split(',')) {
      const results=[];
      for(let trial=0;trial<trials;trial++) {
        Math.random=random(11092026+trial);
        let state=structuredClone(initial),result;
        usageTotals={};
        trace=trial===0?[seedEvent]:null;
        if(scenario.rest) {
          state=applyGalleryEvent(state,event({type:'item-changed',itemId:'olva-timeout',acquired:true}),definition);
          const rest=createOlvaRestCommand(state);
          for(const input of [rest.charge,rest.rest,rest.remove,rest.used])state=applyGalleryEvent(state,event(input),definition);
        }
        let totalRounds=0;
        const checkpoints=[];
        for(const [encounterIndex,encounterId] of scenario.encounters.entries()) {
          if(state.combat)break;
          ({state,result}=fight(state,encounterId,policy));totalRounds+=result.rounds;
          checkpoints.push({...result,healingCharges:Object.fromEntries(['healing-pollen','buldak-noodles','pitahaya','sleep-scroll'].map(id=>[id,state.inventoryState[id]?.charges??0]))});
          if(!result.victory)break;
          if(scenario.restAfterIndex===encounterIndex || (scenario.restAfterIndex===undefined && scenario.restAfter===encounterId)) {
            state=applyGalleryEvent(state,event({type:'item-changed',itemId:'olva-timeout',acquired:true}),definition);
            const rest=createOlvaRestCommand(state);
            for(const input of [rest.charge,rest.rest,rest.remove,rest.used])state=applyGalleryEvent(state,event(input),definition);
          }
        }
        if(trace) {
          const replayed=replayGalleryEvents(trace,definition);
          for(const key of ['heroHp','inventoryState','resourceUses','resourceScopes'])assert.deepEqual(replayed[key],state[key],`simulation/replay mismatch: ${key}`);
        }
        trace=null;
        results.push({...result,rounds:totalRounds,checkpoints});
      }
      report.cases[scenario.id][policy]={...summarize(results),route:scenario,checkpoints:scenario.encounters.map((encounterId,index)=>{
        const entered=results.flatMap(result=>result.checkpoints[index]?[result.checkpoints[index]]:[]);
        return {encounterId,reached:entered.length/trials,...(entered.length?summarize(entered):{}),healingCharges:entered.length?Object.fromEntries(Object.keys(entered[0].healingCharges).map(id=>[id,entered.reduce((sum,result)=>sum+result.healingCharges[id],0)/entered.length])):{}};
      })};
      console.log(scenario.id,policy,JSON.stringify(report.cases[scenario.id][policy]));
    }
  }
  if(process.env.PENISUELA_BALANCE_OUTPUT)writeFileSync(process.env.PENISUELA_BALANCE_OUTPUT,JSON.stringify(report,null,2)+'\n');
} finally {Math.random=originalRandom;await server.close();}
