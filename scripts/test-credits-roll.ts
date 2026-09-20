import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {penisuelaCredits} from '../src/entities/campaign-session/model/credits';
import {buildCreditsRollSections} from '../src/widgets/campaign-scene/model/creditsRoll';
import {CampaignCredits} from '../src/widgets/campaign-scene/ui/CampaignCredits/CampaignCredits';
import {CreditsPostlude} from '../src/widgets/campaign-scene/ui/CampaignCredits/CreditsPostlude';

const sections = buildCreditsRollSections(penisuelaCredits);
const photoIds = sections.flatMap((section) => section.rows.flatMap((row) => row.photos.map(({photo}) => photo.id)));
const entryIds = sections.flatMap((section) => section.rows.flatMap((row) => row.entries.map((entry) => entry.id)));
const expectedEntryIds = [
  ...penisuelaCredits.partyCharacterIds,
  ...penisuelaCredits.cast.map((entry) => entry.id),
  ...penisuelaCredits.aiModels.map((entry) => entry.id),
];
assert.deepEqual([...photoIds].sort(), penisuelaCredits.photos.map((photo) => photo.id).sort(), 'Each photo appears exactly once.');
assert.deepEqual(entryIds, expectedEntryIds, 'Grouping must not lose, duplicate or reorder names.');
const expectedPhotoGroups = [
  {creditIds: ['bubsilda'], photoIds: ['credits-bubsilda-rink', 'credits-bubsilda-swan']},
  {creditIds: ['linda'], photoIds: ['credits-linda-cork', 'credits-linda-jungle']},
  {creditIds: ['lambert'], photoIds: ['credits-lambert-pool', 'credits-lambert-lift']},
  {creditIds: ['golovach-lena'], photoIds: ['credits-lena-pitch', 'credits-lena-oscar']},
  {creditIds: ['thorin-pukoshchit'], photoIds: ['credits-thorin-race', 'credits-thorin-checkout']},
  {creditIds: ['lord-krayneplot', 'kostryulka'], photoIds: ['credits-game-master-tavern']},
  {creditIds: ['style-sphinx'], photoIds: ['credits-alexis-luxury']},
  {creditIds: ['pussy-sultan'], photoIds: ['credits-pussy-sultan-party']},
  {creditIds: ['bungalow-spouse-a', 'bungalow-spouse-b'], photoIds: ['credits-stas-polina-door']},
  {creditIds: ['olga-vasilenko'], photoIds: ['credits-olivia-terrace']},
  {creditIds: ['egorik'], photoIds: ['credits-egorik-sidelines']},
  {creditIds: ['nastya'], photoIds: ['credits-nastasya-contest']},
  {creditIds: ['egor-kreed'], photoIds: ['credits-kreed-mirror']},
  {creditIds: ['igor-sinyak', 'graywise'], photoIds: ['credits-angel-grey-vlog']},
  {creditIds: ['andrey-apollonov-junior'], photoIds: ['credits-netak-scheming']},
];
const photoGroups = (result: typeof sections) => result.flatMap((section) => section.rows
  .filter((row) => row.photos.length > 0)
  .map((row) => ({creditIds: row.entries.map((entry) => entry.id), photoIds: row.photos.map(({photo}) => photo.id)})));
assert.deepEqual(photoGroups(sections), expectedPhotoGroups, 'Every hero or NPC must appear beside their own photos; the couple shares one group.');
assert.deepEqual(
  photoGroups(buildCreditsRollSections({...penisuelaCredits, photos: [...penisuelaCredits.photos].reverse()})),
  expectedPhotoGroups.map((group) => ({...group, photoIds: [...group.photoIds].reverse()})),
  'Changing photo order must never attach a photo to another name.',
);
assert.ok(sections.find((section) => section.id === 'ai')?.rows.every((row) => row.photos.length === 0), 'AI models have no character photographs.');
const gameMaster = sections.find((section) => section.id === 'game-master');
assert.equal(gameMaster?.title, 'Мастер игры');
assert.deepEqual(gameMaster?.rows.map((row) => row.entries.map((entry) => entry.id)), [['lord-krayneplot', 'kostryulka']]);
assert.ok(!buildCreditsRollSections({...penisuelaCredits, gameMasterIds: undefined}).some((section) => section.id === 'game-master'), 'Omitting the optional group preserves the original cast section.');
assert.deepEqual(
  sections.flatMap((section) => section.rows.flatMap((row) => row.photos.map(({index}) => index))),
  photoIds.map((_, index) => index),
  'Photo loading and alternating tilts follow the displayed order.',
);
assert.deepEqual(
  buildCreditsRollSections({...penisuelaCredits, photos: []}).flatMap((section) => section.rows.flatMap((row) => row.entries.map((entry) => entry.id))),
  expectedEntryIds,
  'Credits remain readable without photographs.',
);

// Render the real initial roll without starting timers or a browser.
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
try {
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {matchMedia: () => ({matches: false})}});
  Object.defineProperty(globalThis, 'document', {configurable: true, value: {hidden: false}});
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CampaignCredits, {
    credits: penisuelaCredits,
  })));
  assert.equal((html.match(/<figure\b/g) ?? []).length, penisuelaCredits.photos.length, 'All photos belong to the initial scrolling roll.');
  assert.equal((html.match(/<figcaption\b/g) ?? []).length, penisuelaCredits.photos.length);
  assert.ok(html.includes('Лента титров и фотографий'));
  assert.ok(html.includes('Марат SQWOZ BAB'));
  assert.ok(!html.includes('<audio'), 'The roll reuses the audio started by the ending action instead of mounting another player.');
  assert.ok(!/<(?:button|a|nav)\b/u.test(html), 'Credits must have no visible buttons or navigation links.');
  for (const id of expectedEntryIds) assert.ok(html.includes(`id="credit-name-${id}"`), `Missing accessible name for ${id}.`);
  assert.ok(html.includes('aria-labelledby="credit-name-bungalow-spouse-a credit-name-bungalow-spouse-b"'));
  assert.ok(html.includes('aria-labelledby="credit-name-igor-sinyak credit-name-graywise"'));
  assert.ok(html.includes('aria-labelledby="credit-name-lord-krayneplot credit-name-kostryulka"'));
  assert.equal((html.match(/Мастер игры/g) ?? []).length, 1);
  assert.ok(html.lastIndexOf('<figure') < html.indexOf(penisuelaCredits.closingText), 'Every photo is embedded before the final thanks.');
  assert.ok(!html.includes('К фотографиям') && !html.includes('Следующий кадр'), 'There is no separate slideshow navigation.');
  assert.ok(penisuelaCredits.postCreditsVideo);
  const closing = renderToStaticMarkup(createElement(CreditsPostlude, {
    music: penisuelaCredits.music,
    video: penisuelaCredits.postCreditsVideo,
    closingText: penisuelaCredits.closingText,
    onComplete: () => {},
  }));
  assert.equal(closing.replace(/<[^>]*>/gu, ''), penisuelaCredits.closingText, 'The hold screen contains only the thank-you line.');
  assert.ok(!/<(?:button|a|nav|video)\b/u.test(closing), 'The hold screen has no buttons or prematurely visible video.');
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
}
console.log(`Credits roll: ${photoIds.length} photos matched to ${expectedPhotoGroups.length} character groups, all ${entryIds.length} names and real component markup passed.`);
