#!/usr/bin/env node

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

async function readSource(relativePath) {
  return readFile(`${projectRoot}/${relativePath}`, 'utf8');
}

const [searchSource, gallerySource, lateStorySource, artistsSource] = await Promise.all([
  readSource('src/widgets/campaign-scene/ui/HotelOverloadSearchAdventure/HotelOverloadSearchAdventure.tsx'),
  readSource('src/widgets/campaign-scene/ui/HotelGalleryAdventure/HotelGalleryAdventure.tsx'),
  readSource('src/widgets/campaign-scene/ui/LateStoryAdventure/LateStoryAdventure.tsx'),
  readSource('src/widgets/campaign-scene/ui/ArtistsDressingRoomAdventure/ArtistsDressingRoomAdventure.tsx'),
]);

assert.match(
  searchSource,
  /galleryRequirementsReady\s*=\s*Boolean\(galleryExitAction\)\s*&& isGalleryStoryConditionMet\(galleryExitAction\?\.conditions, state\)/u,
  'The hotel door must use the canonical item requirements, including bracelets and the console.',
);
assert.match(
  searchSource,
  /!correctedCommandIds\.has\(event\.commandId\)/u,
  'A corrected transition must not keep the hotel exit marked as resolved.',
);
assert.doesNotMatch(
  searchSource,
  /onMasterStepBack=/u,
  'Hotel search Step back must use its route backHref instead of journal undo.',
);

assert.match(
  gallerySource,
  /if \(barAccessGranted\) navigate\(barHref\);\s*else setBarPassageBlocked\(true\)/u,
  'The bar door must check permits and show a warning before any combat.',
);
assert.match(
  gallerySource,
  /barAccessGranted = canEnterHotelBar\(gallerySessionState\)/u,
  'Bar access must use the common 2+3 permit rule.',
);
assert.doesNotMatch(
  gallerySource,
  /onMasterStepBack=\{[^}]*undoLastCommand/su,
  'Hotel gallery Step back must not call the campaign-global journal undo.',
);
assert.match(
  gallerySource,
  /state\.activeSceneId === 'hotel-gallery'[\s\S]*goToHub/u,
  'Hotel gallery subviews must return to the gallery hub.',
);

assert.match(
  lateStorySource,
  /'egorik-bungalow-reveal': 'guest-bungalows'/u,
  'The bungalow reveal must return to the visible two-bungalow fork.',
);
assert.match(
  lateStorySource,
  /backHref=\{backHref\}/u,
  'Early LateStory scenes must expose explicit route navigation.',
);
assert.doesNotMatch(
  lateStorySource,
  /onMasterStepBack=\{[^}]*undoLastCommand/su,
  'LateStory Step back must not call the campaign-global journal undo.',
);

assert.match(
  artistsSource,
  /closed-bar\?view=dancers/u,
  'The legacy dressing-room back route must use the live closed-bar query view.',
);
assert.doesNotMatch(
  artistsSource,
  /onMasterStepBack=/u,
  'The legacy dressing-room Step back must not call campaign-global journal undo.',
);

for (const [scene, previous] of [
  ['groom-preparation-room', 'groom-tunnel'],
  ['kreed-disclosure', 'groom-preparation-room'],
  ['post-kreed-route', 'kreed-disclosure'],
]) assert.ok(lateStorySource.includes(`'${scene}': '${previous}'`), `${scene}: a previous route is required`);
assert.match(lateStorySource, /if \(resolvedActionIds\.has\(action\.id\)\) \{\s*navigate/u,
  'Returning to an already traversed screen must keep its next transition available without awarding it twice.');
assert.match(gallerySource, /id: 'prop-room-exit'[\s\S]*?onSelect: \(\) => goToScene\('pussy-audience'\)/u,
  'The visible prop-room doorway must return to Pussy Sultan.');
const barSource = await readSource('src/widgets/campaign-scene/ui/ClosedBarAdventure/ClosedBarAdventure.tsx');
assert.match(barSource, /description=\{danceGuardPrompt\.modalText\}\s+dismissible=\{false\}/u,
  'The track combat prompt must not allow returning to selection via Escape, backdrop or close button.');
assert.equal((barSource.match(/closeOnSelect: false/gu) ?? []).length, 1,
  'The sole combat confirmation must not also execute modal dismissal undo.');
console.log('Penisuela navigation regressions: 19/19 assertions passed.');
