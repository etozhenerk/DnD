import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {getSoundtrackPlaylist, type CampaignSoundtrackDefinition} from '../src/entities/campaign-session/model/soundtrack';
import type {CampaignSceneBlock} from '../src/entities/campaign-session/model/types';

const tracks = ['quiet', 'battle', 'boss'].map((id) => ({id, title: id, source: `${id}.mp3`}));
const definition: CampaignSoundtrackDefinition = {
  volume: 0.3, tracks, exploration: ['quiet'], combat: ['battle'],
  encounters: {boss: ['boss', 'battle'], silent: []},
  scenes: {tunnel: ['quiet', 'boss'], silent: []},
};
assert.deepEqual(getSoundtrackPlaylist(undefined), []);
assert.deepEqual(getSoundtrackPlaylist(definition).map((track) => track.id), ['quiet']);
assert.deepEqual(getSoundtrackPlaylist(definition, 'guards').map((track) => track.id), ['battle']);
assert.deepEqual(getSoundtrackPlaylist(definition, 'boss').map((track) => track.id), ['boss', 'battle']);
assert.deepEqual(getSoundtrackPlaylist(definition, 'silent'), [], 'An intentionally silent encounter does not fall back to battle music.');
assert.deepEqual(getSoundtrackPlaylist({...definition, exploration: ['missing', 'quiet']}).map((track) => track.id), ['quiet']);
assert.deepEqual(getSoundtrackPlaylist(definition, undefined, 'tunnel').map((track) => track.id), ['quiet', 'boss']);
assert.deepEqual(getSoundtrackPlaylist(definition, undefined, 'unknown').map((track) => track.id), ['quiet']);
assert.deepEqual(getSoundtrackPlaylist(definition, undefined, 'silent'), [], 'An explicitly silent scene does not use exploration music.');
assert.deepEqual(getSoundtrackPlaylist(definition, 'guards', 'tunnel').map((track) => track.id), ['battle'], 'Combat takes priority over a scene playlist.');
assert.deepEqual(getSoundtrackPlaylist(definition, 'silent', 'tunnel'), [], 'An explicitly silent battle does not use the scene playlist.');
const gameplay = JSON.parse(readFileSync('content/campaigns/penisuela-gallery-gameplay.json', 'utf8'));
const soundtrack: CampaignSoundtrackDefinition = gameplay.soundtrack;
const preview = JSON.parse(readFileSync('content/campaigns/penisuela-session-preview.json', 'utf8'));
const sceneBlocks: CampaignSceneBlock[] = preview.sceneBlocks;
const canonicalPlaylist = (encounterId?: string, sceneId?: string, flags?: Readonly<Record<string, boolean>>) => getSoundtrackPlaylist(soundtrack, encounterId, sceneId, flags, sceneBlocks);
for (const [blockId, ids] of Object.entries(soundtrack.blocks ?? {})) {
  const block = sceneBlocks.find(block => block.id === blockId);
  assert.ok(block, `Unknown music block: ${blockId}`);
  assert.ok(ids.length > 0);
  for (const sceneId of block.sceneIds) {
    if (sceneId !== 'groom-tunnel') assert.equal(soundtrack.scenes?.[sceneId], undefined, 'Only the corridor has an explicit screen exception.');
    assert.deepEqual(canonicalPlaylist(undefined, sceneId, {'dance-troupe-freed': true}).map(track => track.id), soundtrack.scenes?.[sceneId] ?? ids, `Screen left its music block: ${sceneId}`);
  }
}
assert.deepEqual(Object.keys(soundtrack.blocks ?? {}).sort(), sceneBlocks.map(block => block.id).sort(), 'Every campaign block has a playlist.');
assert.deepEqual(Object.keys(soundtrack.scenes ?? {}), ['groom-tunnel'], 'Stone whisper is the only screen-level exception.');
const morningBlock = sceneBlocks.find(block => block.id === 'morning')!;
assert.deepEqual(morningBlock.sceneIds, ['hotel-overload', 'hotel-overload-search']);
assert.deepEqual(getSoundtrackPlaylist({...soundtrack, blocks: {morning: []}}, undefined, 'hotel-overload', {}, sceneBlocks), [], 'An explicitly silent block does not fall back to screen/exploration music.');
assert.deepEqual(getSoundtrackPlaylist({...soundtrack, scenes: {'groom-tunnel': []}}, undefined, 'groom-tunnel', {}, sceneBlocks), [], 'An explicitly silent screen exception does not fall back to its block.');
const trackIds = new Set(soundtrack.tracks.map((track) => track.id));
assert.equal(trackIds.size, soundtrack.tracks.length);
assert.ok(soundtrack.volume >= 0 && soundtrack.volume <= 1);
for (const track of soundtrack.tracks) assert.ok(existsSync(track.source), `Missing audio: ${track.source}`);
for (const [encounterId, ids] of Object.entries(soundtrack.encounters)) {
  assert.ok(gameplay.encounters.some((encounter: {id: string}) => encounter.id === encounterId));
  for (const id of ids) assert.ok(trackIds.has(id), `Unknown music: ${id}`);
}
for (const id of [...soundtrack.combat, ...soundtrack.exploration]) assert.ok(trackIds.has(id));
const hallSceneIds = ['hotel-gallery', 'alexis-room', 'alexis-room-after-pussy', 'pussy-audience', 'pussy-prop-room', 'pussy-scepter-return'];
for (const sceneId of hallSceneIds) {
  assert.deepEqual(canonicalPlaylist(undefined, sceneId).map(track => track.id), ['wanderers-honey-song'], `Hall room changed music: ${sceneId}`);
}
assert.deepEqual(canonicalPlaylist(undefined, 'closed-bar'), [], 'Bar is silent on first entry.');
assert.deepEqual(canonicalPlaylist(undefined, 'closed-bar', {'dance-correct-track-selected': true}), [], 'Selecting the correct song alone does not unlock the background.');
assert.deepEqual(canonicalPlaylist('club-beat-guards', 'closed-bar'), [], 'A wrong-song battle does not bypass the silent bar.');
const freedFlags = {'dance-troupe-freed': true};
assert.deepEqual(canonicalPlaylist(undefined, 'closed-bar', freedFlags).map(track => track.id), ['golden-coin-bazaar'], 'Freeing the dancers enables the bar’s own music, including a restored session.');
assert.deepEqual(canonicalPlaylist(undefined, 'guest-bungalows').map(track => track.id), ['calm-before-storm']);
for (const sceneId of ['bungalow-courtyard', 'olva-passes-handoff', 'olva-date-rehearsal']) {
  assert.deepEqual(canonicalPlaylist(undefined, sceneId).map(track => track.id), ['calm-before-storm'], `Olivia must not inherit the hall track: ${sceneId}`);
}
assert.deepEqual(canonicalPlaylist(undefined, 'closed-bar', {'dance-troupe-freed': false}), [], 'Undoing the release restores silence.');
assert.deepEqual(canonicalPlaylist('club-beat-guards', 'closed-bar', freedFlags).map(track => track.id), soundtrack.combat);
const sceneIds = new Set(preview.scenes.map((scene: {id: string}) => scene.id));
for (const [sceneId, flags] of Object.entries(soundtrack.sceneRequiredFlags ?? {})) {
  assert.ok(sceneIds.has(sceneId), `Unknown gated scene: ${sceneId}`);
  assert.ok(flags.length > 0);
}
for (const [sceneId, ids] of Object.entries(soundtrack.scenes ?? {})) {
  assert.ok(sceneIds.has(sceneId), `Unknown music scene: ${sceneId}`);
  for (const id of ids) assert.ok(trackIds.has(id), `Unknown music: ${id}`);
}
for (const ids of Object.values(soundtrack.blocks ?? {})) {
  for (const id of ids) assert.ok(trackIds.has(id), `Unknown block music: ${id}`);
}
for (const id of [...gameplay.storyTruth.currentRouteSceneIds, ...gameplay.storyTruth.badEndingSceneIds, ...gameplay.storyTruth.optionalSceneIds]) {
  const block = sceneBlocks.find(block => block.sceneIds.includes(id));
  assert.ok((block && soundtrack.blocks?.[block.id]?.length) || soundtrack.scenes?.[id]?.length, `Current scene needs a block or screen playlist: ${id}`);
}
assert.deepEqual(canonicalPlaylist(undefined, 'groom-tunnel').map((track) => track.id), ['stone-whisper']);
for (const sceneId of sceneIds) {
  if (sceneId !== 'groom-tunnel') assert.ok(!canonicalPlaylist(undefined, String(sceneId)).some((track) => track.id === 'stone-whisper'), `Stone whisper leaked into ${String(sceneId)}`);
}
for (const ids of [soundtrack.exploration, soundtrack.combat, ...Object.values(soundtrack.encounters), ...Object.values(soundtrack.blocks ?? {})]) {
  assert.ok(!ids.includes('stone-whisper'), 'Stone whisper must never enter a global or combat playlist.');
}
const manifest = JSON.parse(readFileSync('assets/concepts/manifest.json', 'utf8'));
for (const track of soundtrack.tracks) {
  assert.ok(manifest.campaigns.some((asset: {path: string; status: string}) => asset.path === track.source && asset.status === 'canonical'), `Unregistered music: ${track.id}`);
}
console.log('Soundtrack routing PASS: scene coverage, strict corridor-only track, exploration fallback, combat priority, explicit silence, files and manifest references.');
