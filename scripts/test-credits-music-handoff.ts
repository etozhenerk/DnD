import assert from 'node:assert/strict';
import {getCreditsMusicSession, startCreditsMusic} from '../src/features/play-campaign-credits/model/creditsMusicAudio';
import {playCreditsPostlude} from '../src/features/play-campaign-credits/model/playCreditsPostlude';

let insideEndingAction = false;
const created: FakeAudio[] = [];
class FakeAudio extends EventTarget {
  loop = false;
  preload = '';
  volume = 1;
  private position = 0;
  ended = false;
  get currentTime() {return this.position;}
  set currentTime(value: number) {this.position = value; this.ended = false;}
  paused = true;
  plays = 0;
  pauses = 0;
  src = '';
  unlocked = false;
  parentNode: unknown = null;
  playbackRate = 1;
  muted = false;
  controls = false;
  playsInline = false;
  constructor() {super(); created.push(this);}
  play() {
    ++this.plays;
    assert.ok(insideEndingAction || this.unlocked, 'First play must happen in the ending action before route loading.');
    this.unlocked = true;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {this.paused = true; ++this.pauses;}
  setAttribute() {}
  remove() {this.parentNode = null;}
}
const flush = async () => {for (let turn = 0; turn < 4; turn++) await Promise.resolve();};
const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
try {
  let now = 0;
  let timerId = 0;
  const timers = new Map<number, {at: number; run: () => void}>();
  const clock = {
    setTimeout: (run: () => void, delay: number) => {const id = ++timerId; timers.set(id, {at: now + delay, run}); return id;},
    clearTimeout: (id: number) => {timers.delete(id);},
    advance: (ms: number) => {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) {timers.delete(id); timer.run();}
    },
  };
  const documentEvents = Object.assign(new EventTarget(), {
    createElement: (tag: string) => {assert.equal(tag, 'video'); return new FakeAudio();},
  });
  Object.defineProperty(globalThis, 'document', {configurable: true, value: documentEvents});
  Object.defineProperty(globalThis, 'window', {configurable: true, value: clock});
  const music = {id: 'test-music', title: 'Test', source: '/credits-test.mp3', volume: 0.5};
  insideEndingAction = true;
  const cancel = startCreditsMusic(music);
  insideEndingAction = false;
  assert.equal(created.length, 1);
  const audio = created[0];
  assert.equal(audio.plays, 1, 'Music starts synchronously without waiting for the credits route.');
  assert.equal(audio.loop, false, 'The credits song must never loop.');
  assert.equal(audio.preload, 'auto');
  assert.equal(audio.volume, 0.5);
  assert.equal(audio.playsInline, true);
  assert.equal(audio.controls, false);
  await flush();
  audio.currentTime = 1.25;

  const credits = getCreditsMusicSession(music);
  assert.equal(credits.audio, audio, 'The credits route adopts the very same audio element.');
  const firstRelease = credits.retain();
  credits.playback.update(true, 0);
  assert.equal(audio.plays, 1, 'Mount does not start another play request.');
  assert.equal(audio.currentTime, 1.25, 'Route loading does not rewind the song.');

  firstRelease();
  const secondRelease = credits.retain();
  credits.playback.update(true, 0);
  await flush();
  assert.equal(audio.pauses, 0, 'StrictMode cleanup and remount must not pause or abort the music.');
  cancel();
  assert.equal(audio.pauses, 0, 'Late navigation cancellation cannot stop an adopted player.');
  audio.ended = true;
  audio.paused = true;
  const afterSong = audio.plays;
  credits.playback.retry();
  credits.playback.update(true, 0);
  assert.equal(audio.plays, afterSong, 'Recovery and updates cannot replay a naturally finished song.');
  secondRelease();
  await flush();
  assert.equal(audio.paused, true, 'Leaving credits stops music.');

  insideEndingAction = true;
  const cancelSecondNavigation = startCreditsMusic(music);
  insideEndingAction = false;
  await flush();
  assert.equal(audio.currentTime, 0, 'Opening credits again starts the track from the beginning.');
  assert.equal(created.length, 1, 'The unlocked element survives later visits.');
  cancelSecondNavigation();
  assert.equal(audio.paused, true, 'Failed navigation stops unclaimed music.');

  insideEndingAction = true;
  startCreditsMusic(music);
  insideEndingAction = false;
  await flush();
  const releaseRoot = credits.retain();
  const video = {id: 'postlude', title: 'Postlude', source: '/postlude.mp4', volume: 1, delayMs: 2000};
  const stage = {append: (media: unknown) => {assert.equal(media, audio); audio.parentNode = stage;}};
  let completions = 0;
  let videoReveals = 0;
  const beforeVideo = audio.plays;
  const stopPostlude = playCreditsPostlude(credits, video, stage as unknown as HTMLElement, () => {++completions;}, () => {++videoReveals;});
  assert.equal(audio.paused, true, 'Song stops while the closing line remains.');
  clock.advance(1999);
  assert.equal(audio.plays, beforeVideo, 'The closing line stays for the full two seconds.');
  assert.equal(videoReveals, 0);
  clock.advance(1);
  await flush();
  assert.equal(created.length, 1, 'MP3 and MP4 use the same activated media element.');
  assert.equal(audio.src, video.source);
  assert.equal(audio.loop, false, 'Postlude must play once.');
  assert.equal(audio.muted, false);
  assert.equal(audio.volume, 1);
  assert.equal(audio.playbackRate, 1, 'The received clip is not accelerated.');
  assert.equal(audio.paused, false);
  assert.equal(audio.parentNode, stage);
  assert.equal(videoReveals, 0, 'Keep thanks visible while the video is loading.');
  audio.dispatchEvent(new Event('playing'));
  audio.dispatchEvent(new Event('playing'));
  assert.equal(videoReveals, 1, 'Replace thanks with the actual playing video exactly once.');
  assert.equal(completions, 0, 'Do not finish on a guessed duration; wait for the actual ended event.');
  audio.dispatchEvent(new Event('ended'));
  audio.dispatchEvent(new Event('error'));
  assert.equal(completions, 1, 'Completion happens once, even if another media event arrives.');
  assert.equal(audio.paused, true);
  stopPostlude();
  assert.equal(audio.parentNode, null);
  const afterVideo = audio.plays;
  documentEvents.dispatchEvent(new Event('click'));
  assert.equal(audio.plays, afterVideo, 'Finished video cannot resume through stale gesture listeners.');

  const cancelPendingPostlude = playCreditsPostlude(credits, video, stage as unknown as HTMLElement, () => {++completions;}, () => {++videoReveals;});
  cancelPendingPostlude();
  clock.advance(2000);
  assert.equal(audio.plays, afterVideo, 'Leaving during thanks cancels the pending video.');
  assert.equal(completions, 1);
  releaseRoot();
  await flush();

  insideEndingAction = true;
  startCreditsMusic(music);
  insideEndingAction = false;
  assert.equal(audio.src, music.source, 'Reopening credits after the video restores the MP3.');
  assert.equal(audio.loop, false);
  assert.equal(audio.volume, 0.5);
  credits.cancelNavigation();
  assert.doesNotThrow(() => startCreditsMusic(undefined)());
} finally {
  if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
  else Reflect.deleteProperty(globalThis, 'document');
  if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
  else Reflect.deleteProperty(globalThis, 'window');
}
console.log('Credits media: one-shot music, no ended-track retry, two-second thanks, playing-event reveal, shared player, completion, cleanup and revisit passed.');
