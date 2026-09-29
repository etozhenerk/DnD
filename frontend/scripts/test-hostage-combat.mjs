import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {createServer} from 'vite';
const server = await createServer({appType:'custom', logLevel:'silent', server:{middlewareMode:true}});
try {
  const load = path => server.ssrLoadModule(path);
  const {penisuelaGalleryGameplay: definition, penisuelaGalleryHeroes: heroes} = await load('/src/entities/campaign-session/model/data.ts');
  const rules = await load('/src/entities/combat/model/combatRules.ts');
  const commands = await load('/src/features/run-combat/model/combatCommands.ts');
  const {isCombatVictory} = await load('/src/entities/combat/model/combatObjectives.ts');
  const {createCombatArenaView} = await load('/src/features/run-combat/model/createCombatArenaView.ts');
  const {createNpcDecisionActors, createNpcDecisionView} = await load('/src/features/navigate-campaign-scene/model/npcDecision.ts');
  const {replayGalleryEvents: replay} = await load('/src/entities/campaign-session/model/gallerySession.ts');
  const journal = await load('/src/entities/campaign-session/model/gallerySessionJournal.ts');
  const encounter = definition.encounters.find(e => e.id === 'andrey-dark-elf');
  const prisons = encounter.units.filter(e => e.kind === 'object');
  assert.equal(prisons.length, 3);
  const ids = [encounter.id, ...heroes.map(h => h.id)];
  assert.deepEqual(new Set(rules.createCombatInitiative(encounter, heroes, () => 10)), new Set(ids));
  let serial = 0;
  const wrap = (events, commandId = `command-${++serial}`) => events.map(e => ({...e,id:`event-${++serial}`,commandId,sceneScopeId:'last-take-boss'}));
  const seed = journal.createGallerySessionStartedEvent({definition,heroes,existingInventory:[],eventId:'seed',commandId:'seed'});
  const start = [seed,...wrap([{type:'combat-started',encounterId:encounter.id,initiativeOrder:[heroes[0].id,encounter.id,...heroes.slice(1).map(h=>h.id)]}],'start')];
  let log;
  const state = () => replay(log, definition);
  const context = () => ({...state(),definition,heroes});
  const apply = (events, id) => {assert.ok(events);log.push(...wrap(events,id));};
  const damage = (targetId,amount) => ({type:'combat-damage-resolved',targetId,amount,text:'Проверка урона.'});
  const active = () => state().combat.initiativeOrder[state().combat.turnIndex];
  const view = () => createCombatArenaView({...context(),encounter,actions:definition.combatActions,heroTokens:{},fallbackEnemyToken:''});
  for (const prison of prisons) {
    await access(prison.token);await access(prison.releaseAlly.token);
    log = structuredClone(start);
    const initial = state();
    assert.equal(createNpcDecisionView({actorId:prison.id,definition,heroes,state:initial}),null);
    assert.ok(!createNpcDecisionActors(definition,initial,heroes).some(a=>a.id===prison.id));
    assert.equal(commands.createEnemyAttackCommand({...context(),combat:{...state().combat,initiativeOrder:[prison.id],turnIndex:0}},heroes[0].id,10),null);
    apply(commands.createHeroAttackCommand(context(),heroes[0].id,prison.id,20),'attack');
    const result=commands.createApplyCombatDamageCommand(context(),rules.getPendingDamageRange(state().combat.pendingAttack).max);
    assert.ok(result);assert.equal(result.victory,false);apply(result.events,'break');
    assert.equal(state().combat.enemies[prison.id].hp,0);
    assert.equal(active(),prison.releaseAlly.id);
    assert.equal(state().combat.allies[active()].hp,20,'overkill damages prison only');
    assert.equal(view().active.token,prison.releaseAlly.token);
    assert.equal(view().participants.filter(p=>p.id===prison.id).length,0);
    const rescued=state();
    const expectation={campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};
    const parsed=journal.parseStoredGallerySessionEnvelope(JSON.parse(JSON.stringify(journal.createStoredGallerySessionEnvelope(log,expectation))),expectation);
    assert.ok(parsed.ok);assert.deepEqual(replay(parsed.events,definition).combat,rescued.combat);
    apply(commands.createSummonedAllyAttackCommand(context(),active(),encounter.id,1),'guest-miss');
    assert.equal(rules.isCombatAllyActive(state().combat,prison.releaseAlly.id),false,'miss spends the only turn');
    assert.ok(!view().participants.some(p=>p.id===prison.releaseAlly.id));
    assert.equal(commands.createSummonedAllyAttackCommand({...context(),combat:{...state().combat,initiativeOrder:[prison.releaseAlly.id],turnIndex:0}},prison.releaseAlly.id,encounter.id,20),null);
    apply([{type:'action-corrected',correctedCommandId:'guest-miss'}]);
    assert.deepEqual(state().combat,rescued.combat,'undo restores guest turn');
    apply(commands.createSummonedAllyAttackCommand(context(),active(),encounter.id,10),'guest-hit');
    const hp=state().combat.enemies[encounter.id].hp;
    apply(commands.createApplyCombatDamageCommand(context(),7).events,'guest-damage');
    assert.equal(state().combat.enemies[encounter.id].hp,hp-10);
    assert.equal(rules.isCombatAllyActive(state().combat,prison.releaseAlly.id),false);
    log=log.filter(e=>!['guest-hit','guest-damage'].includes(e.commandId));
    apply([{type:'action-corrected',correctedCommandId:'break'}]);
    assert.equal(state().combat.enemies[prison.id].hp,10);
    assert.equal(state().combat.allies[prison.releaseAlly.id],undefined);
  }
  // GM correction is atomic and replayable; healing a broken prison cannot farm guests.
  log=structuredClone(start);
  const manual=(value)=>({type:'manual-adjustment',label:'HP колбы',reason:'Проверка',adjustment:{kind:'participant-stat',participantId:prisons[0].id,field:'hp',value}});
  apply([manual(0)],'manual-break');assert.ok(state().combat.allies[prisons[0].releaseAlly.id]);
  apply([manual(10),manual(0)],'restore-break');
  assert.equal(state().combat.initiativeOrder.filter(id=>id===prisons[0].releaseAlly.id).length,1);
  // Several prisons in one action preserve order and get one turn each, across a round boundary.
  log=structuredClone(start);
  apply(prisons.map(p=>damage(p.id,10)),'area');
  const allyIds=prisons.map(p=>p.releaseAlly.id);
  assert.deepEqual(state().combat.initiativeOrder.slice(1,4),allyIds);
  for(const allyId of allyIds){apply([{type:'turn-advanced'}]);assert.equal(active(),allyId);}
  apply([{type:'turn-advanced'}]);
  assert.ok(allyIds.every(id=>!rules.isCombatAllyActive(state().combat,id)));
  // Last actor in a round frees a guest: no expiration from wrapping the initiative.
  let combat=rules.createCombatState(encounter,[encounter.id,heroes[0].id]);
  combat={...combat,turnIndex:1};
  const reduce=(event)=>{combat=rules.applyCombatEvent(combat,Object.fromEntries(heroes.map(h=>[h.id,h.hp])),wrap([event])[0],definition).combat;};
  reduce(damage(prisons[0].id,10));reduce({type:'turn-advanced'});
  assert.equal(combat.initiativeOrder[combat.turnIndex],allyIds[0]);
  assert.equal(combat.round,1);reduce({type:'turn-advanced'});assert.equal(combat.round,2);
  assert.equal(rules.isCombatAllyActive(combat,allyIds[0]),false);
  // Objects do not inherit creature-only weakness or confuse the boss AI into attacking a prison.
  combat=rules.createCombatState(encounter,[encounter.id,heroes[0].id]);
  reduce({type:'combat-weakness-exposed',text:'Слабость.'});
  assert.equal(combat.enemies[prisons[0].id].ac,10);
  reduce({type:'combat-weakness-cleared',ac:15});assert.equal(combat.enemies[prisons[0].id].ac,10);
  reduce({type:'combat-status-applied',status:{id:'test-confused',kind:'confused',sourceActorId:heroes[0].id,targetId:encounter.id,charges:1},text:'Замешательство.'});
  log=structuredClone(start);
  assert.ok(commands.createEnemyAttackCommand({...context(),combat},heroes[0].id,10));
  // A skipped (stunned) guest also spends the one turn.
  combat=rules.createCombatState(encounter,[heroes[0].id,encounter.id]);reduce(damage(prisons[0].id,10));
  reduce({type:'combat-condition-changed',participantId:allyIds[0],condition:'stunned',active:true});
  reduce({type:'turn-advanced'});assert.equal(rules.isCombatAllyActive(combat,allyIds[0]),false);
  assert.equal(combat.initiativeOrder[combat.turnIndex],encounter.id);
  // Existing summons retain their round-based duration.
  combat=rules.createCombatState(encounter,[heroes[0].id,encounter.id]);
  const guest={...prisons[0].releaseAlly,id:'ordinary-summon',ownerId:heroes[0].id,maxHp:20,initiative:0,expiresAfterRound:2};
  reduce({type:'combat-allies-summoned',allies:[guest],text:'Призыв.'});
  for(let i=0;i<4;i++)reduce({type:'turn-advanced'});
  assert.equal(combat.round,2);assert.equal(rules.isCombatAllyActive(combat,guest.id),true);
  for(let i=0;i<3;i++)reduce({type:'turn-advanced'});
  assert.equal(combat.round,3);assert.equal(rules.isCombatAllyActive(combat,guest.id),false);
  // Real area-save command chain releases two prisoners without interrupting remaining saves.
  log=structuredClone(start);
  apply([{type:'combat-saving-throw-requested',savingThrow:{
    kind:'area-damage-save',sourceActorId:heroes[0].id,sourceName:heroes[0].name,
    targetId:prisons[0].id,targetName:prisons[0].name,stat:'dexterity',modifier:0,dc:13,
    failureConditions:[],duration:'next-turn',rollExpression:'1d20',
    areaDamage:{actionId:'fixture-area',actionName:'Проверка взрыва',damage:10,damageType:'fire',halfOnSuccess:true,remainingTargetIds:[prisons[1].id]},
  }}]);
  apply(commands.createResolveCombatSavingThrowCommand(context(),1));
  assert.equal(active(),heroes[0].id);assert.equal(state().combat.pendingSavingThrow.targetId,prisons[1].id);
  apply(commands.createResolveCombatSavingThrowCommand(context(),1));
  assert.equal(active(),allyIds[0]);assert.ok(state().combat.allies[allyIds[1]]);
  // A direct killing attack ignores intact objects in victory detection.
  log=structuredClone(start);apply([damage(encounter.id,encounter.hp-1)]);
  apply(commands.createHeroAttackCommand(context(),heroes[0].id,encounter.id,20));
  const finishing=commands.createApplyCombatDamageCommand(context(),rules.getPendingDamageRange(state().combat.pendingAttack).min);
  assert.equal(finishing.victory,true);apply(finishing.events);assert.ok(isCombatVictory(state().combat));
  // Boss defeat ends the encounter regardless of intact objectives.
  log=structuredClone(start);apply([damage(encounter.id,encounter.hp)]);
  assert.ok(isCombatVictory(state().combat));assert.equal(view().victory,true);
  assert.ok(commands.createClearCombatCommand(state().combat));
  console.log('Hostages PASS: six assets, object initiative/AI guards, critical rescue, one-turn hit/miss/skip, multi-rescue ordering, round boundary, normal summons, GM edits, no duplicate rescue, save/replay/undo and victory with intact prisons.');
} finally {await server.close();}
