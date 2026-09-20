import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createPreviewMusicPlayback} from '../src/features/navigate-campaign-preview/model/previewMusicPlayback';

function fixture() {
  let now = 0, nextId = 0;
  const scheduled = new Map<number, (time: number) => void>();
  const audio = {
    paused: true, volume: 1, loop: false, currentTime: 45, playCalls: 0,
    play() {this.playCalls++; this.paused = false; return Promise.resolve();},
    pause() {this.paused = true;},
  };
  const clock = {
    now: () => now,
    request: (callback: (time: number) => void) => {const id = ++nextId; scheduled.set(id, callback); return id;},
    cancel: (id: number) => {scheduled.delete(id);},
  };
  const advance = (ms: number) => {
    now += ms;
    const frames = [...scheduled.values()]; scheduled.clear();
    frames.forEach(callback => callback(now));
  };
  return {audio, clock, advance, scheduled};
}
const settle = async () => {await Promise.resolve(); await Promise.resolve(); await Promise.resolve();};
const options = {volume: 0.3, fadeOutMs: 3000};
const f = fixture();
const player = createPreviewMusicPlayback(f.audio, options, f.clock);
player.setLastSlide(false); await settle();
assert.equal(f.audio.playCalls, 1);
assert.equal(f.audio.loop, true);
assert.equal(f.audio.volume, 0.3);
player.setLastSlide(false); player.retry();
assert.equal(f.audio.playCalls, 1, 'Ordinary slide navigation does not restart the track.');
player.setLastSlide(true);
assert.equal(f.audio.volume, 0.3, 'Opening the last slide starts a fade instead of cutting the sound.');
f.advance(750);
assert.ok(f.audio.volume > 0.15 && f.audio.volume < 0.3);
f.advance(750);
assert.ok(Math.abs(f.audio.volume - 0.15) < 0.00001);
player.setLastSlide(true);
player.retry();
f.advance(1500);
assert.equal(f.audio.volume, 0);
assert.equal(f.audio.paused, true);
assert.equal(f.scheduled.size, 0);
player.retry();
assert.equal(f.audio.playCalls, 1, 'Gestures on the last slide never restart faded music.');

player.setLastSlide(false); await settle();
assert.equal(f.audio.volume, 0.3);
assert.equal(f.audio.paused, false);
assert.equal(f.audio.currentTime, 45, 'Going back resumes without rewinding.');
player.setLastSlide(true); f.advance(1500);
player.setLastSlide(false); await settle();
f.advance(4000);
assert.equal(f.audio.volume, 0.3, 'A cancelled fade cannot mute a previous slide.');
assert.equal(f.audio.paused, false);
player.setLastSlide(true); player.dispose(); f.advance(3000);
assert.equal(f.audio.volume, 0);
assert.equal(f.audio.paused, true);
assert.equal(f.scheduled.size, 0);

const direct = fixture();
const directPlayer = createPreviewMusicPlayback(direct.audio, options, direct.clock);
directPlayer.setLastSlide(true); directPlayer.retry();
assert.equal(direct.audio.volume, 0);
assert.equal(direct.audio.playCalls, 0, 'Opening ?frame=last must remain silent.');
directPlayer.dispose();

const blocked = fixture();
blocked.audio.play = () => {blocked.audio.playCalls++; return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));};
const blockedPlayer = createPreviewMusicPlayback(blocked.audio, options, blocked.clock);
blockedPlayer.setLastSlide(false); await settle();
blockedPlayer.retry(); await settle();
assert.equal(blocked.audio.playCalls, 2, 'Blocked autoplay can retry on an ordinary slide.');
blockedPlayer.setLastSlide(true); blockedPlayer.retry(); await settle();
assert.equal(blocked.audio.playCalls, 2, 'Final slide suppresses blocked autoplay retries.');
blockedPlayer.dispose();

const pending = fixture();
let finishPlay!: () => void;
pending.audio.play = () => new Promise<void>(resolve => {finishPlay = () => {pending.audio.paused = false; resolve();};});
const pendingPlayer = createPreviewMusicPlayback(pending.audio, options, pending.clock);
pendingPlayer.setLastSlide(false); pendingPlayer.dispose(); finishPlay(); await settle();
assert.equal(pending.audio.paused, true, 'Late play resolution cannot restart audio after leaving the prologue.');

const preview = JSON.parse(readFileSync('content/campaigns/penisuela-preview.json', 'utf8'));
const manifest = JSON.parse(readFileSync('assets/concepts/manifest.json', 'utf8'));
assert.equal(preview.music.title, 'Шёпот каменных стен');
assert.equal(preview.music.fadeOutMs, 3000);
assert.ok(preview.music.volume > 0 && preview.music.volume <= 1);
assert.ok(existsSync(preview.music.source));
assert.ok(manifest.campaigns.some((asset: {id: string; path: string; status: string}) => asset.id === preview.music.id && asset.path === preview.music.source && asset.status === 'canonical'));
assert.equal(preview.slides.at(-1).id, 'penisuela-scene-kostryulka-flight');
assert.equal(preview.outro.titleCard.durationMs, 5000);
assert.equal(preview.outro.nextSceneId, 'hotel-overload');
const gameplay = JSON.parse(readFileSync('content/campaigns/penisuela-gallery-gameplay.json', 'utf8'));
assert.notEqual(preview.music.source, gameplay.soundtrack.tracks.find((track: {id: string}) => track.id === 'stone-whisper').source);
console.log('Preview music PASS: loop, continuous ordinary slides, smooth three-second fade, silent final entry, back/cancellation, autoplay retries, late-play cleanup and canonical media references.');
