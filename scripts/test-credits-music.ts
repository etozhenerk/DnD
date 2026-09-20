import assert from 'node:assert/strict';
import {createCreditsMusicPlayback, listenForCreditsMusicUnlock} from '../src/features/play-campaign-credits/model/creditsMusicPlayback';

const requests: {resolve: () => void; reject: (error: Error) => void}[] = [];
let pauses = 0;
const blocked: boolean[] = [];
const audio = {
  currentTime: 0,
  ended: false,
  play: () => new Promise<void>((resolve, reject) => requests.push({resolve, reject})),
  pause: () => {++pauses;},
};
const flush = async () => {for (let turn = 0; turn < 4; turn++) await Promise.resolve();};
const player = createCreditsMusicPlayback(audio, (value) => blocked.push(value));

player.update(true, 0);
assert.equal(requests.length, 1, 'The roll starts music automatically.');
requests[0].reject(new Error('Autoplay blocked'));
await flush();
assert.deepEqual(blocked, [true]);
player.retry();
requests[1].resolve();
await flush();
assert.deepEqual(blocked, [true, false], 'A user gesture can recover from blocked autoplay.');

audio.currentTime = 42;
player.update(false, 0);
assert.equal(pauses, 1);
assert.equal(audio.currentTime, 42, 'Inactive playback keeps the music position.');
player.update(true, 0);
assert.equal(audio.currentTime, 42);
requests[2].resolve();
await flush();
const count = requests.length;
player.update(true, 0);
assert.equal(requests.length, count, 'Unrelated renders do not restart the music.');

player.update(true, 1);
assert.equal(audio.currentTime, 0, 'Restart rewinds the soundtrack.');
audio.currentTime = 12;
player.update(false, 1);
requests[3].reject(new Error('Late failure after finishing'));
await flush();
assert.equal(blocked.at(-1), false, 'Late play rejection after finish cannot report an autoplay failure.');
player.retry();
assert.equal(requests.length, 4, 'A retry never starts paused or finished credits.');
player.update(false, 2);
assert.equal(audio.currentTime, 0, 'Restart also rewinds when the roll remains paused.');

player.update(true, 2);
player.dispose();
const before = blocked.length;
requests[4].reject(new Error('Late failure after leaving route'));
await flush();
assert.equal(blocked.length, before, 'Unmount ignores pending results.');
player.update(true, 3);
player.retry();
assert.equal(requests.length, 5, 'Leaving the route stops future playback.');
assert.ok(pauses >= 4);

// Repeated refused gestures used to exhaust the one-shot document listeners.
const gestures = new EventTarget();
const attempts: {resolve: () => void; reject: (error: Error) => void}[] = [];
const unlockStates: boolean[] = [];
const unlockPlayer = createCreditsMusicPlayback({
  currentTime: 0,
  ended: false,
  play: () => new Promise<void>((resolve, reject) => attempts.push({resolve, reject})),
  pause: () => {},
}, (value) => unlockStates.push(value));
const removeListeners = listenForCreditsMusicUnlock(gestures, unlockPlayer.retry);
unlockPlayer.update(true, 0);
attempts[0].reject(new DOMException('Autoplay requires activation', 'NotAllowedError'));
await flush();
gestures.dispatchEvent(new Event('pointerup'));
gestures.dispatchEvent(new Event('click'));
assert.equal(attempts.length, 2, 'One gesture does not create overlapping play requests.');
attempts[1].reject(new DOMException('First gesture still refused', 'NotAllowedError'));
await flush();
gestures.dispatchEvent(new Event('click'));
assert.equal(attempts.length, 3, 'Later clicks still retry after another refusal.');
attempts[2].reject(new DOMException('Loading interrupted playback', 'AbortError'));
await flush();
assert.equal(unlockStates.at(-1), true, 'Interrupted playback remains recoverable.');
gestures.dispatchEvent(new Event('keydown'));
attempts[3].resolve();
await flush();
assert.equal(unlockStates.at(-1), false, 'A later keyboard gesture restores playback.');
removeListeners();
for (const event of ['pointerup', 'click', 'keydown']) gestures.dispatchEvent(new Event(event));
assert.equal(attempts.length, 4, 'Cleanup removes every unlock listener.');
unlockPlayer.dispose();
console.log('Credits music: repeated gesture recovery, aborted and overlapping play, transitions, restart, finish and cleanup races passed.');
