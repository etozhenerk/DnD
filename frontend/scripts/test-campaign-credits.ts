import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {canShowCampaignCredits, penisuelaCredits} from '../src/entities/campaign-session/model/credits';

const session = JSON.parse(readFileSync('content/campaigns/penisuela-session-preview.json', 'utf8'));
const characters = JSON.parse(readFileSync('content/characters.json', 'utf8'));
const gameplay = JSON.parse(readFileSync('content/campaigns/penisuela-gallery-gameplay.json', 'utf8'));
const manifest = JSON.parse(readFileSync('assets/concepts/manifest.json', 'utf8'));
const credits = penisuelaCredits;

assert.equal(canShowCampaignCredits(credits, 'wedding-epilogue', {}), false, 'Read the wedding reward before ending the story.');
assert.equal(canShowCampaignCredits(credits, 'wedding-epilogue', {'grey-wiese-reward-received': false}), false);
assert.equal(canShowCampaignCredits(credits, 'wedding-epilogue', {'grey-wiese-reward-received': true}), true);
assert.equal(canShowCampaignCredits(credits, 'bad-ending-magical-prison', {}), true, 'The last bad-ending scene needs no wedding reward.');
for (const scene of session.scenes) {
  if (!credits.entries.some((entry) => entry.sceneId === scene.id)) {
    assert.equal(canShowCampaignCredits(credits, scene.id, {'grey-wiese-reward-received': true}), false,
      `Credits must not appear during ${scene.id}, even with a saved reward flag.`);
  }
}
assert.deepEqual([...credits.partyCharacterIds].sort(), session.party.map((hero: {characterId: string}) => hero.characterId).sort());
for (const id of credits.partyCharacterIds) {
  assert.ok(characters.some((hero: {id: string}) => hero.id === id), `Missing hero ${id}`);
  assert.ok(!credits.cast.some((member) => member.id === id), `Playable hero ${id} must retain their original name only.`);
}
const reward = gameplay.storyScenes.find((scene: {id: string}) => scene.id === 'wedding-epilogue')
  .actions.find((action: {id: string}) => action.id === 'receive-grey-wiese-perfume');
assert.equal(reward.outcome.flags['grey-wiese-reward-received'], true);
for (const group of [credits.cast, credits.aiModels, credits.photos]) {
  assert.equal(new Set(group.map((item) => item.id)).size, group.length, 'Duplicate credit entry.');
}
const assets = Object.values(manifest).flatMap((value) => Array.isArray(value) ? value : []);
const gameMasterIds = new Set(credits.gameMasterIds);
assert.equal(gameMasterIds.size, credits.gameMasterIds?.length ?? 0, 'Game master IDs must be unique.');
for (const id of gameMasterIds) assert.ok(credits.cast.some((member) => member.id === id), `Missing game master ${id}`);
assert.ok(credits.music, 'Credits must include the selected soundtrack.');
assert.ok(existsSync(credits.music.source));
assert.ok(assets.some((asset) => asset.path === credits.music?.source && asset.status === 'canonical'));
assert.ok(credits.music.volume >= 0 && credits.music.volume <= 1);
assert.ok(credits.postCreditsVideo, 'Credits must include the supplied postlude.');
assert.ok(existsSync(credits.postCreditsVideo.source));
assert.ok(assets.some((asset) => asset.path === credits.postCreditsVideo?.source && asset.status === 'canonical'));
assert.equal(credits.postCreditsVideo.delayMs, 2000);
assert.ok(credits.postCreditsVideo.volume > 0 && credits.postCreditsVideo.volume <= 1);
for (const photo of credits.photos) {
  assert.ok(existsSync(photo.source), `Missing photo ${photo.source}`);
  assert.ok(assets.some((asset) => asset.path === photo.source && asset.status === 'canonical'), `Photo is not approved: ${photo.source}`);
  assert.ok(photo.alt.trim() && photo.caption.trim());
  assert.ok(photo.creditIds.length > 0, `Missing credit binding for ${photo.id}`);
  assert.equal(new Set(photo.creditIds).size, photo.creditIds.length, `Duplicate credit binding for ${photo.id}`);
  const belongsToHeroes = photo.creditIds.every((id) => credits.partyCharacterIds.includes(id));
  const belongsToCast = photo.creditIds.every((id) => !gameMasterIds.has(id) && credits.cast.some((member) => member.id === id));
  const belongsToGameMaster = photo.creditIds.every((id) => gameMasterIds.has(id));
  assert.ok(belongsToHeroes || belongsToCast || belongsToGameMaster, `Photo ${photo.id} must refer to existing characters in a single credit section.`);
}
console.log(`Campaign credits: ending gates, ${credits.partyCharacterIds.length} hero references, unique entries and ${credits.photos.length} approved photos passed.`);
