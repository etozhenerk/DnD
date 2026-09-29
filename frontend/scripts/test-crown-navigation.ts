import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {getOlvaMasterStepBack} from '../src/features/navigate-campaign-scene/model/olvaMasterStepBack';

const decide = (screen: 'room'|'table'|'evidence'|'unlock'|'voting', lastActionId: string, complete = false, canUndo = true) =>
  getOlvaMasterStepBack({navigation: {screen, evidenceId: null}, lastActionId, complete, canUndo});
assert.deepEqual(decide('room', 'table-show-reward', true), {kind:'undo',screen:'room'});
assert.deepEqual(decide('room', 'table-claim-reward', true), {kind:'undo',screen:'room'});
assert.deepEqual(decide('room', 'table-finish-gift', true), {kind:'undo',screen:'voting'});
assert.deepEqual(decide('room', 'table-finish-together', true), {kind:'undo',screen:'voting'});
assert.deepEqual(decide('table', 'table-place-receipt-stas'), {kind:'undo',screen:'table'});
assert.deepEqual(decide('table', 'table-offer-gift'), {kind:'undo',screen:'table'});
assert.deepEqual(decide('table', 'table-withdraw-gift'), {kind:'undo',screen:'table'});
assert.deepEqual(decide('voting', 'table-vote-linda-together'), {kind:'undo',screen:'voting'});
assert.deepEqual(decide('voting', 'table-vote-after-compromise'), {kind:'back'});
assert.deepEqual(decide('evidence', 'table-read-receipt'), {kind:'back'});
assert.deepEqual(getOlvaMasterStepBack({navigation:{screen:'evidence',evidenceId:'receipt'},lastActionId:'table-place-receipt-stas',complete:false,canUndo:true}), {kind:'undo',screen:'evidence'});
assert.deepEqual(decide('unlock', 'table-offer-gift'), {kind:'back'});
assert.deepEqual(decide('room', 'table-read-receipt'), {kind:'exit'});
assert.deepEqual(decide('table', 'table-place-receipt-stas', false, false), {kind:'back'});

const control = readFileSync('src/features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl.tsx','utf8');
assert.doesNotMatch(control, /\bonStart\b|\bstartLabel\b/, 'The common crown cannot accept a third permanent action.');
assert.match(control, /aria-label="Навигация по сцене"/);
for (const dir of readdirSync('src/widgets/campaign-scene/ui', {withFileTypes:true}).filter(item => item.isDirectory())) {
  for (const file of readdirSync(`src/widgets/campaign-scene/ui/${dir.name}`).filter(file => file.endsWith('.tsx'))) {
    const source = readFileSync(`src/widgets/campaign-scene/ui/${dir.name}/${file}`,'utf8');
    assert.doesNotMatch(source, /\bmasterStartLabel\b|\bonMasterRestart\b/, `${file}: must not add a parallel restart/exit command.`);
  }
}
for (const [dir, forbidden] of [
  ['OlvaDateAdventure', /olva-undo|Отменить последнее действие за столом|Вернуться к разговору/],
  ['ClosedBarAdventure', /stas-return-to-bar|dancers-return-to-bar|device-return-to-dancers/],
  ['HotelGalleryAdventure', /gm-alexis-to-gallery|gm-pussy-to-gallery|gm-pussy-return-to-gallery/],
] as const) assert.doesNotMatch(readFileSync(`src/widgets/campaign-scene/ui/${dir}/${dir}.tsx`, 'utf8'), forbidden);
console.log('Crown navigation: common two-command contract, all adapters, and Olva undo/navigation passed.');
