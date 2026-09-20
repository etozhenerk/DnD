import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{name:'scene-test-hooks',enforce:'pre',transform(code,id){if(id.includes('/src/'))return code.replaceAll("from 'react'","from '/scripts/helpers/scene-component-harness.mjs'").replaceAll("from 'react-router-dom'","from '/scripts/helpers/scene-router-harness.mjs'");}}]});
const storage=new Map(), originalWindow=globalThis.window,originalDocument=globalThis.document;
globalThis.window={location:{pathname:''},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},addEventListener(){},removeEventListener(){}};
globalThis.document={addEventListener(){},removeEventListener(){}};
try{
 const load=p=>server.ssrLoadModule(p);
 const {penisuelaSessionPreview:preview}=await load('/src/entities/campaign-session/model/playableData.ts');
 const {resetComponent,renderComponent,elements}=await load('/scripts/helpers/scene-component-harness.mjs');
 const router=await load('/scripts/helpers/scene-router-harness.mjs');
 const {HotelGalleryAdventure}=await load('/src/widgets/campaign-scene/ui/HotelGalleryAdventure/HotelGalleryAdventure.tsx');
 let scene,tree,controller,Component=HotelGalleryAdventure;
 const draw=()=>{tree=renderComponent(()=>Component({campaignId:'penisuela',campaignScenes:preview.scenes,scene}));controller=tree.props.itemController;return tree;};
 const fresh=id=>{resetComponent();storage.clear();scene=preview.scenes.find(s=>s.id===id);router.setLocation(`/campaign/penisuela/play/${id}`);draw();};
 const action=id=>{const a=tree.props.masterActions.find(a=>a.id===id);assert.ok(a,`${scene.id}: action ${id}`);a.onSelect?.();draw();return a;};
 const element=name=>elements(tree.props.interactiveContent).find(e=>e.type?.name===name);
 for(const verdict of ['excellent','sufficient']){
  fresh('alexis-room');element('SceneHotspotLayer').props.hotspots.find(h=>h.id==='alexis-room-mannequin').onSelect();draw();
  elements(tree.props.interactiveContent).find(e=>e.type==='button'&&String(e.props.children).trim()==='Сдать наряд').props.onClick();draw();
  action(`accept-alexis-outfit-${verdict}`);assert.ok(controller.state.flags['alexis-room-resolved']);
  assert.ok(tree.props.masterActions.some(a=>a.id==='leave-alexis-room'));
  controller.manualAdjustParticipant('bubsilda','hp',1);draw();tree.props.onMasterStepBack();draw();
  assert.ok(controller.state.flags['alexis-room-resolved'],'Undoing HP must preserve the earlier verdict');
  assert.ok(tree.props.masterActions.some(a=>a.id==='leave-alexis-room'));
  controller.undoLastCommand();draw(); // Full GM-console undo must also update the local outfit screen.
  assert.ok(!controller.state.flags['alexis-room-resolved']);assert.ok(tree.props.masterActions.some(a=>a.id===`accept-alexis-outfit-${verdict}`));
  resetComponent();draw();assert.ok(tree.props.masterActions.some(a=>a.id===`accept-alexis-outfit-${verdict}`));
 }
 // The exact reported bug, using the real scene's completion callback, twice with undo between.
 fresh('pussy-audience');controller.resolveSceneCheck('earn-pussy-trust','lambert','charisma',[2]);draw();controller.resolveSceneCheck('intimidate-pussy','lambert','charisma',[2]);draw();controller.startCombat('hotel-vip-guards');draw();
 for(const id of Object.keys(controller.state.combat.enemies)){controller.manualAdjustParticipant(id,'hp',0);draw();}
 for(let i=0;i<2;i++){
  const hud=element('CombatEncounterHud');assert.ok(hud);hud.props.onContinue();draw();assert.equal(controller.state.combat,null);assert.ok(!element('CombatEncounterHud'));
  assert.equal(controller.state.inventoryState['pussy-sultan-bar-passes'].quantity,3);
  assert.ok(tree.props.masterActions.some(a=>a.id==='leave-pussy-audience'));
  tree.props.onMasterStepBack();draw(); // undo reward/completion while the reward modal is open
  assert.ok(controller.state.combat);assert.ok(element('CombatEncounterHud'));
 }
 element('CombatEncounterHud').props.onContinue();draw();
 // Close the real reward modal, then use the explicit forward control.
 const close=elements(tree.props.interactiveContent).find(e=>e.type==='button'&&String(e.props.children).trim()==='Продолжить');assert.ok(close);close.props.onClick();draw();action('leave-pussy-audience');assert.equal(router.navigations.at(-1),'/campaign/penisuela/play/hotel-gallery');
 // Every prop-room approach: success and failure must leave a playable action.
 for(const [id,hero,stat] of [['recover-pussy-scepter-with-tiny-linda','linda','dexterity'],['recover-pussy-scepter-with-engineering','lambert','intelligence'],['recover-pussy-scepter','golovach-lena','strength']]){
  for(const roll of [1,20]){
   fresh('pussy-prop-room');controller.manualSetFlag('pussy-quest-accepted',true);draw();controller.manualSetFlag('pussy-trust-max',true);draw();
   assert.ok(controller.resolveSceneCheck(id,hero,stat,[roll]),id);draw();
   assert.ok(tree.props.masterActions.length || element('CombatEncounterHud'),`${id}/${roll}: progress action`);
   if(controller.state.flags['prop-room-carriers-awakened']){
    controller.startCombat('prop-room-winding-carriers');draw();for(const enemy of Object.keys(controller.state.combat.enemies)){controller.manualAdjustParticipant(enemy,'hp',0);draw();}element('CombatEncounterHud').props.onContinue();draw();action('gm-collect-pussy-scepter');
   }
   if(controller.state.flags['scepter-recovered']){action('gm-return-pussy-scepter');assert.ok(router.navigations.includes('/campaign/penisuela/play/pussy-scepter-return'));}
  }
 }

 const {GroomTunnelAdventure}=await load('/src/widgets/campaign-scene/ui/GroomTunnelAdventure/GroomTunnelAdventure.tsx');
 const {GraywiseDoorAdventure}=await load('/src/widgets/campaign-scene/ui/GraywiseDoorAdventure/GraywiseDoorAdventure.tsx');
 const resolve=(id,roll)=>{action(id);const panel=element('SceneCheckPanel');assert.ok(panel,id);panel.props.onResolve(roll,panel.props.advantage?[roll,roll]:[roll]);draw();};
 let tunnelPaths=0;
 for(const passage of ['groom-tunnel-bubsilda-balance-passage','groom-tunnel-lena-hidden-passage','groom-tunnel-custom-passage']){
  for(const entryRoll of [1,20]){
   for(const door of ['groom-door-linda-inside-release','groom-door-custom-release']){
    for(const doorRoll of [1,20]){
    for(const clear of ['groom-prop-jam-thorin-hammer','groom-prop-jam-custom-clear']){
     for(const clearRoll of [1,20]){
      Component=GroomTunnelAdventure;fresh('groom-tunnel');
      assert.deepEqual(tree.props.masterActions.map(a=>a.id), ['groom-tunnel-enter']);
      const entranceLayer=element('SceneHotspotLayer');
      assert.equal(entranceLayer.props.background.src,'assets/concepts/campaigns/penisuela/scenes/groom-hideout-entrance.png');
      assert.equal(entranceLayer.props.background.fit,'contain');
      const entranceDoor=entranceLayer.props.hotspots.find(h=>h.id==='groom-tunnel-enter');
      assert.ok(entranceDoor,'exterior door is clickable');entranceDoor.onSelect();draw();
      assert.equal(tree.props.scene.background,'assets/concepts/campaigns/penisuela/scenes/groom-tunnel-blocked.png');
      resolve(passage,entryRoll);
      if(tree.props.masterActions.some(a=>a.id==='groom-tunnel-approach-door'))action('groom-tunnel-approach-door');
      resolve(door,doorRoll);if(tree.props.masterActions.some(a=>a.id==='groom-door-follow-linda'))action('groom-door-follow-linda');
      resolve(clear,clearRoll);
      assert.ok(tree.props.masterActions.some(a=>a.id==='continue-1-groom-preparation-room'),JSON.stringify({passage,entryRoll,door,clear,clearRoll,flags:controller.state.flags,actions:tree.props.masterActions}));action('continue-1-groom-preparation-room');assert.equal(router.navigations.at(-1),'/campaign/penisuela/play/groom-preparation-room');
      tunnelPaths++;
     }
    }
    }
   }
  }
 }
 Component=GroomTunnelAdventure;fresh('groom-tunnel');action('groom-tunnel-enter');
 action('groom-tunnel-custom-passage');
 assert.equal(element('SceneCheckPanel').props.heroes.length,5,'custom approach offers all five heroes');
 element('SceneCheckPanel').props.onSelectHero('lambert');draw();
 element('SceneCheckPanel').props.onSelectStat('intelligence');draw();
 const customPanel=element('SceneCheckPanel');
 assert.equal(customPanel.props.selectedHeroId,'lambert');
 assert.equal(customPanel.props.selectedStat,'intelligence');
 assert.equal(customPanel.props.heroes.find(h=>h.id==='lambert').stats.intelligence,4);
 customPanel.props.onResolve(4,[4]);draw();
 assert.equal(controller.state.flags['groom-door-reached'],true,'Lambert intelligence 4+4 passes DC 8');
 assert.ok(!controller.state.flags['groom-tunnel-noisy-entry']);
 Component=GraywiseDoorAdventure;
 for(const rolls of [[20],[1,20],[1,1]]){
  fresh('graywise-door-trust');resolve('choose-graywise-door-trust-decision-1-trust-earned',rolls[0]);
  if(rolls.length>1)resolve('ask-egor-for-graywise-trust',rolls[1]);
  action('continue-1-bedroom-reveal');assert.equal(router.navigations.at(-1),'/campaign/penisuela/play/bedroom-reveal');
 }
 console.log(`PASS: ${tunnelPaths} tunnel branches and all 3 Grey Wiese outcomes expose and execute their next-scene button.`);
 const {BedroomRevealAdventure}=await load('/src/widgets/campaign-scene/ui/BedroomRevealAdventure/BedroomRevealAdventure.tsx');
 Component=BedroomRevealAdventure;fresh('bedroom-reveal');
 const bedroomImage=()=>tree.props.scene.background.split('/').at(-1);
 const bedroomDoor=id=>{const layer=element('SceneHotspotLayer');assert.equal(layer.props.background.src,tree.props.scene.background);assert.equal(layer.props.background.fit,'contain');const door=layer.props.hotspots.find(h=>h.id===id);assert.ok(door,id);door.onSelect();draw();};
 assert.equal(bedroomImage(),'graywise-villa-tour.png');
 assert.equal(controller.commitStoryAction(scene.id,'open-bedroom-door'),false,'Cannot skip the existing door shot');
 bedroomDoor('approach-bedroom-door');
 assert.equal(bedroomImage(),'bedroom-door-closed.png');
 assert.equal(controller.state.counters.doom,0);
 resetComponent();draw();assert.equal(bedroomImage(),'bedroom-door-closed.png','Reload preserves the middle shot');
 bedroomDoor('open-bedroom-door');
 assert.equal(bedroomImage(),'bedroom-live-reveal.png');assert.equal(controller.state.counters.doom,1);
 resetComponent();draw();assert.equal(bedroomImage(),'bedroom-live-reveal.png');
 tree.props.onMasterStepBack();draw();assert.equal(bedroomImage(),'bedroom-door-closed.png');assert.equal(controller.state.counters.doom,0);
 tree.props.onMasterStepBack();draw();assert.equal(bedroomImage(),'graywise-villa-tour.png');
 resetComponent();draw();assert.equal(bedroomImage(),'graywise-villa-tour.png');
 bedroomDoor('approach-bedroom-door');bedroomDoor('open-bedroom-door');action('continue-1-igor-unboxing');
 assert.equal(router.navigations.at(-1),'/campaign/penisuela/play/igor-unboxing');
 console.log('PASS: real bedroom door clicks preserve all 3 shots, reload, two-step undo and reveal milestone.');
 const {OlvaDateAdventure}=await load('/src/widgets/campaign-scene/ui/OlvaDateAdventure/OlvaDateAdventure.tsx');
 for(const ending of ['polina','separate','gift']){
  Component=HotelGalleryAdventure;fresh('hotel-gallery');
  assert.ok(controller.commitStoryOutcome({flags:{'olva-table-complete':true,[`olva-table-ending-${ending}`]:true}}));draw();
  resetComponent();Component=OlvaDateAdventure;scene=preview.scenes.find(s=>s.id==='olva-date-rehearsal');router.setLocation('/campaign/penisuela/play/olva-date-rehearsal');draw();
  action('olva-reward');assert.ok(controller.state.flags['olva-table-reward-shown']);
  action('olva-reward');assert.ok(controller.state.flags['olva-table-reward-claimed']);
  action('leave-olva-room');assert.equal(router.navigations.at(-1),'/campaign/penisuela/play/guest-bungalows');
  const inventory=structuredClone(controller.state.inventoryState);resetComponent();draw();
  action('leave-olva-room');assert.deepEqual(controller.state.inventoryState,inventory,'Revisit keeps rewards without granting them again');
 }
 console.log('PASS: all 3 Olivia endings hand over rewards, expose an explicit exit and preserve the inventory on revisit.');
 const {LateStoryAdventure}=await load('/src/widgets/campaign-scene/ui/LateStoryAdventure/LateStoryAdventure.tsx');
 Component=LateStoryAdventure;
 for(const [source,id,target] of [
  ['groom-preparation-room','story-continue-1-kreed-disclosure','kreed-disclosure'],
  ['kreed-disclosure','story-continue-1-post-kreed-route','post-kreed-route'],
  ['post-kreed-route','transition-continue-2-graywise-door-trust','graywise-door-trust'],
 ]){fresh(source);action(id);assert.equal(router.navigations.at(-1),`/campaign/penisuela/play/${target}`);}
 console.log('PASS: every Kreed scene exposes and executes its explicit continuation button.');
 console.log('PASS: real scene callbacks — GM victory/reward/undo twice without a loop, explicit exit, all three prop-room approaches with success/failure and combat recovery.');
}finally{globalThis.window=originalWindow;globalThis.document=originalDocument;await server.close();}
