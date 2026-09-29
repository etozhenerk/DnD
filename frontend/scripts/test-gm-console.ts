import {getManagedInventoryIds} from '../src/entities/campaign-session/model/inventoryPresentation';
import {GREY_WIESE_PERFUME_ID} from '../src/entities/campaign-session/model/partyRewards';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {penisuelaGalleryGameplay as definition, penisuelaGalleryHeroes as heroes, penisuelaSessionPreview as preview} from '../src/entities/campaign-session/model/playableData';
import {createGallerySessionStartedEvent, parseGalleryEventLog} from '../src/entities/campaign-session/model/gallerySessionJournal';
import {replayGalleryEvents, type GalleryEvent} from '../src/entities/campaign-session/model/gallerySession';
import {describeGmEvent, getGmLabels, getGmUndoEntry, getGmCampaignItemCatalogue, getGmItemCatalogue, parseGmInteger, formatGmText} from '../src/widgets/campaign-scene/model/gmConsolePresentation';

for (const value of ['', ' ', '1.5', 'NaN', 'Infinity', '1e2', '0x10', '1000']) assert.equal(parseGmInteger(value, 0, 999), null);
assert.equal(parseGmInteger(' -2 ', -20, 20), -2);
const seed = createGallerySessionStartedEvent({definition, heroes, existingInventory: [], eventId:'start',commandId:'start'});
const state = replayGalleryEvents([seed], definition);
const labels = getGmLabels(preview.scenes, state, definition);
assert.equal(formatGmText('bubsilda → linda',labels),'Бубсильда → Линда');
assert.ok(getGmItemCatalogue(preview.scenes, state, definition).some(item => item.id === 'recording-for-egorik'));
for (const hero of heroes) {
  const token = preview.party.find(item => item.characterId === hero.id)?.token;
  assert.ok(token && existsSync(token), `Approved portrait exists: ${hero.id}`);
}
const expectation = {campaignId:definition.campaignId,definitionId:definition.id,definitionVersion:definition.version};
for (const previousSceneSearch of [undefined, '', '?view=stas', '?view=dancers', '?view=device']) {
  const jump: GalleryEvent = {id:'jump',commandId:'jump',type:'manual-adjustment',label:'Ручной переход',reason:'Проверка',adjustment:{kind:'scene',sceneId:'hotel-gallery',previousSceneId:'closed-bar',previousSceneSearch}};
  assert.equal(parseGalleryEventLog(JSON.parse(JSON.stringify([seed,jump])),expectation).ok,true);
  assert.equal(getGmUndoEntry([seed,jump])?.id,'jump');
  assert.equal(describeGmEvent(jump,labels),'Переход: Гостиничная галерея');
  const correction: GalleryEvent = {id:'undo',commandId:'undo',type:'action-corrected',correctedCommandId:'jump'};
  assert.equal(getGmUndoEntry([seed,jump,correction]),undefined);
}
for (const previousSceneSearch of ['?view=unknown','https://example.com','?view=stas&next=outside']) {
  assert.equal(parseGalleryEventLog([seed,{id:'bad',commandId:'bad',type:'manual-adjustment',label:'Переход',reason:'Проверка',adjustment:{kind:'scene',sceneId:'hotel-gallery',previousSceneSearch}}],expectation).ok,false);
}
const condition: GalleryEvent = {id:'fear',commandId:'fear',type:'manual-adjustment',label:'Состояние',reason:'Проверка',adjustment:{kind:'condition',participantId:'bubsilda',conditionId:'frightened',active:true}};
assert.equal(describeGmEvent(condition,labels),'Бубсильда: добавлено состояние «Страх»');
const consoleSource = readFileSync('src/widgets/campaign-scene/ui/GameMasterConsole/GameMasterConsole.tsx','utf8');
assert.doesNotMatch(consoleSource, /DialoguePresetConsole|id: 'dialogue'/);
assert.match(consoleSource, /<CombatSandboxLauncher/);
assert.match(consoleSource, /checked=\{!skillVideosEnabled\}/);
assert.match(consoleSource, /setSkillVideosEnabled\(!event.target.checked\)/);
console.log('GM console PASS: numeric validation, approved avatars, readable labels, undo, scene-view journal compatibility, sandbox and video controls.');

const catalogue = getGmCampaignItemCatalogue(preview.scenes, state);
const personalIds = new Set(heroes.flatMap(hero => hero.items.map(item => item.id)));
assert.ok(catalogue.every(item => !personalIds.has(item.id)), 'Personal equipment is excluded from shared-bag issuance');
assert.ok(catalogue.some(item => item.id === GREY_WIESE_PERFUME_ID));
const grant: GalleryEvent = {id:'grant',commandId:'grant',type:'manual-adjustment',label:'Выдать духи',reason:'Проверка',adjustment:{kind:'inventory-item',itemId:GREY_WIESE_PERFUME_ID,acquired:true,ownerId:null,quantity:1,charges:2}};
const granted = replayGalleryEvents([seed,grant],definition);
assert.deepEqual(granted.inventoryState[GREY_WIESE_PERFUME_ID], {ownerId:null,quantity:1,charges:2,maxCharges:3,chargeScope:'campaign'});
const remove: GalleryEvent = {...grant,id:'remove',commandId:'remove',adjustment:{...grant.adjustment,acquired:false,quantity:0,charges:0}};
const removed = replayGalleryEvents([seed,grant,remove],definition);
assert.ok(!removed.inventory.includes(GREY_WIESE_PERFUME_ID));
const undoRemove: GalleryEvent = {id:'undo-remove',commandId:'undo-remove',type:'action-corrected',correctedCommandId:'remove'};
assert.equal(replayGalleryEvents([seed,grant,remove,undoRemove],definition).inventoryState[GREY_WIESE_PERFUME_ID].charges,2);
const undoGrant: GalleryEvent = {id:'undo-grant',commandId:'undo-grant',type:'action-corrected',correctedCommandId:'grant'};
assert.ok(!replayGalleryEvents([seed,grant,undoGrant],definition).inventory.includes(GREY_WIESE_PERFUME_ID));
assert.ok(getManagedInventoryIds([grant,undoGrant],[]).includes(GREY_WIESE_PERFUME_ID), 'Cancelled manual grants remain managed for bag reconciliation');
console.log('Shared bag PASS: campaign-only catalogue, charge limits, grant/remove/undo and corrected-command reconciliation.');

// Presentation must distinguish live progress from restoring the same saved progress.
const {updateDoomPresentation} = await import('../src/features/navigate-campaign-scene/model/campaignPresentation');
let doom = updateDoomPresentation(null, {stage:3, visible:true, consoleAcquired:true, sessionId:'run-a'});
assert.equal(doom.from, null, 'Loading a save is not a new division');
assert.equal(doom.appearing, false, 'Loading a save does not replay console pickup');
assert.strictEqual(updateDoomPresentation(doom, {stage:3,visible:true,consoleAcquired:true,sessionId:'run-a'}), doom);
doom = updateDoomPresentation(doom, {stage:5,visible:true,consoleAcquired:true,sessionId:'run-a'});
assert.equal(doom.from,3,'Only newly acquired divisions ignite');
assert.equal(doom.revision,1);
doom = updateDoomPresentation(doom, {stage:4,visible:true,consoleAcquired:true,sessionId:'run-a'});
assert.equal(doom.from,null,'Undo does not play an acquisition effect');
doom = updateDoomPresentation(doom, {stage:5,visible:true,consoleAcquired:true,sessionId:'run-a'});
assert.equal(doom.from,4,'Redo plays the new division again');
doom = updateDoomPresentation(doom, {stage:5,visible:true,consoleAcquired:true,sessionId:'run-b'});
assert.equal(doom.from,null,'A new session gets a fresh baseline');

const room = {stage:0, visible:false, consoleAcquired:false, sessionId:'room'};
doom = updateDoomPresentation(null, room);
assert.equal(doom.appearing, false);
const pickup = {...room, visible:true, consoleAcquired:true};
doom = updateDoomPresentation(doom, pickup);
assert.equal(doom.appearing, true, 'Collecting the console announces the meter');
assert.equal(doom.stage, 0, 'Pickup does not advance the five milestones');
assert.equal(doom.from, null, 'Appearance is separate from milestone ignition');
assert.strictEqual(updateDoomPresentation(doom, pickup), doom, 'Scene updates preserve the running entrance');
doom = {...doom, appearing:false};
doom = updateDoomPresentation(doom, {...pickup, visible:false});
doom = updateDoomPresentation(doom, pickup);
assert.equal(doom.appearing, false, 'Returning from combat does not announce pickup again');
doom = updateDoomPresentation(doom, room);
assert.equal(doom.visible, false, 'Undo pickup hides the indicator');
assert.equal(doom.appearing, false);
doom = updateDoomPresentation(doom, pickup);
assert.equal(doom.appearing, true, 'Collecting again after undo replays the entrance');
doom = updateDoomPresentation(doom, {...pickup, stage:1});
assert.equal(doom.appearing, false);
assert.equal(doom.from, 0, 'The first milestone still ignites the first division');
console.log('Doom presentation PASS: live pickup, zero progress, restore, combat visibility, undo/re-pickup and milestones.');
