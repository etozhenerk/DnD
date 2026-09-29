import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';

// Exercise the actual player and effect lifecycle without opening a browser.
const hooksId = '\0soundtrack-player-hooks';
const server = await createServer({
  appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false},
  plugins: [{
    name: 'soundtrack-player-test-hooks', enforce: 'pre',
    resolveId(id) {if (id === 'soundtrack-player-hooks') return hooksId;},
    load(id) {
      if (id !== hooksId) return;
      return `export {createContext} from 'react';
        let slots = [], cursor = 0, effects = [], dirty = true, suspended = false, context = null;
        const scopes = new Map();
        export function setContext(value) {context = value;}
        export function useContext() {return context;}
        const changed = (a, b) => !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));
        export function render(fn, scope = 'player') {slots = scopes.get(scope) ?? []; scopes.set(scope, slots); cursor = 0; dirty = false; return fn(); }
        export function needsRender() { return dirty; }
        export function useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = {value: initial};
          const slot = slots[i];
          return [slot.value, next => { const value = typeof next === 'function' ? next(slot.value) : next;
            if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; } }]; }
        export function useRef(initial) { const i = cursor++; return slots[i] ??= {current: initial}; }
        export function useMemo(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = {value: fn(), deps}; return slots[i].value; }
        export function useCallback(fn, deps) { return useMemo(() => fn, deps); }
        export function useEffect(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) {
          const old = slots[i]; const slot = slots[i] = {deps, cleanup: old?.cleanup};
          effects.push(() => { old?.cleanup?.(); slot.cleanup = fn(); }); } }
        export function flushEffects() { const pending = effects; effects = []; pending.forEach(fn => fn()); }
        export function unmount(scope = 'player') {scopes.get(scope)?.forEach(slot => slot?.cleanup?.()); scopes.delete(scope);}
        export function useSyncExternalStore() { cursor++; return suspended; }
        export function setSuspended(value) { suspended = value; dirty = true; }`;
    },
    transform(code, id) {
      if (id.endsWith('/CampaignSoundtrack.tsx') || id.endsWith('/campaignSoundtrack.ts') || id.endsWith('/media/foregroundMedia.ts')) {
        return code.replace("from 'react'", "from 'soundtrack-player-hooks'");
      }
    },
  }],
});

const originalPerformance = globalThis.performance;
let now = 0, frameId = 0;
const frames = new Map();
globalThis.performance = {now: () => now};
globalThis.requestAnimationFrame = callback => {frames.set(++frameId, callback); return frameId;};
globalThis.cancelAnimationFrame = id => frames.delete(id);
const advance = ms => {now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));};

try {
  const {CampaignSoundtrack} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/ui/CampaignSoundtrack/CampaignSoundtrack.tsx');
  const hooks = await server.ssrLoadModule('soundtrack-player-hooks');
  const {useSceneSoundtrack} = await server.ssrLoadModule('/src/features/navigate-campaign-scene/model/campaignSoundtrack.ts');
  const soundtrack = JSON.parse(readFileSync('content/campaigns/penisuela-gallery-gameplay.json', 'utf8')).soundtrack;
  const sceneBlocks = JSON.parse(readFileSync('content/campaigns/penisuela-session-preview.json', 'utf8')).sceneBlocks;
  globalThis.document = new EventTarget();
  let tree, media, playCalls = 0, pauseCalls = 0, source;
  const sourceChanges = [];
  const audio = {
    currentTime: 0, volume: 1, paused: true,
    play() { playCalls++; this.paused = false; return Promise.resolve(); },
    pause() { pauseCalls++; this.paused = true; },
  };
  const context = () => tree.props.value;
  const draw = async (finishFades = true) => {
    for (let iteration = 0; iteration < 20; iteration++) {
      tree = hooks.render(() => CampaignSoundtrack({children: null, initialVolume: 0.3}));
      hooks.setContext(tree.props.value);
      media = tree.props.children.find(child => child?.type === 'audio');
      media.props.ref.current = audio;
      if (source !== media.props.src) {
        source = media.props.src;
        sourceChanges.push(source);
        audio.currentTime = 0;
      }
      hooks.flushEffects();
      await Promise.resolve();
      if (!hooks.needsRender()) {if (finishFades) advance(600); return;}
    }
    assert.fail('Player did not settle');
  };
  const quiet = {id: 'quiet', title: 'Quiet', source: 'quiet.mp3'};
  const battle = {id: 'battle', title: 'Battle', source: 'battle.mp3'};
  const tunnel = {id: 'tunnel', title: 'Tunnel', source: 'tunnel.mp3'};
  const claimScene = (definition, sceneId, flags = {}, encounterId, blocks = []) => {
    hooks.render(() => useSceneSoundtrack({soundtrack: definition}, sceneId, encounterId, flags, blocks), 'scene');
    hooks.flushEffects();
    return () => hooks.unmount('scene');
  };
  const claimPlaylist = tracks => claimScene({tracks, exploration: tracks.map(track => track.id), combat: [], encounters: {}}, 'test');
  await draw();
  assert.equal(audio.paused, true);
  let release = claimPlaylist([quiet]);
  await draw();
  assert.equal(source, quiet.source);
  assert.equal(media.props.loop, true, 'A single scene track repeats natively.');
  assert.equal(audio.paused, false);
  assert.equal(audio.volume, 0.3);

  audio.currentTime = 52;
  const previousCalls = playCalls;
  release();
  await Promise.resolve(); await draw();
  assert.equal(source, quiet.source, 'A navigation gap must not clear the playing source.');
  release = claimPlaylist([{...quiet}]);
  await draw();
  assert.equal(audio.currentTime, 52, 'Scene/StrictMode handoff keeps the same track position.');
  assert.equal(playCalls, previousCalls, 'The handoff does not issue another play.');

  release();
  release = claimPlaylist([quiet, battle]);
  await draw();
  assert.equal(media.props.loop, false);
  media.props.onEnded(); await draw();
  assert.equal(source, battle.source);
  media.props.onEnded(); await draw();
  assert.equal(source, quiet.source, 'A multi-track playlist wraps to its first track.');
  context().next(); await draw();
  audio.currentTime = 41;
  release();
  release = claimPlaylist([{...quiet}, {...battle}]);
  await draw();
  assert.equal(source, battle.source);
  assert.equal(audio.currentTime, 41, 'Equal multi-track playlists keep both index and position.');

  const changeStart = sourceChanges.length;
  release();
  release = claimPlaylist([tunnel, quiet]);
  await draw();
  assert.deepEqual(sourceChanges.slice(changeStart), [tunnel.source], 'A new playlist starts at index zero without briefly playing the old index.');
  audio.currentTime = 24;
  hooks.setSuspended(true); await draw(false);
  assert.equal(audio.paused, false, 'Foreground playback fades the soundtrack before pausing.');
  advance(300);
  assert.ok(audio.volume > 0 && audio.volume < 0.3, 'Fade-out has intermediate volume.');
  advance(300);
  assert.equal(audio.paused, true, 'Foreground media pauses the soundtrack.');
  assert.equal(audio.volume, 0);
  hooks.setSuspended(false); await draw(false);
  assert.equal(audio.paused, false);
  assert.equal(audio.volume, 0, 'Soundtrack returns from silence.');
  advance(300);
  assert.ok(audio.volume > 0 && audio.volume < 0.3, 'Fade-in has intermediate volume.');
  advance(300);
  assert.equal(audio.volume, 0.3);
  assert.equal(audio.currentTime, 24, 'Closing foreground media resumes without rewinding.');

  hooks.setSuspended(true); await draw(false); advance(300);
  const turningVolume = audio.volume;
  hooks.setSuspended(false); await draw(false);
  assert.equal(audio.volume, turningVolume, 'Interrupted fade resumes at its current volume.');
  advance(600);
  assert.equal(audio.paused, false, 'Cancelled fade-out cannot pause the resumed track.');
  assert.equal(audio.volume, 0.3);
  context().toggle(); await draw();
  assert.equal(audio.paused, true);
  hooks.setSuspended(true); await draw();
  hooks.setSuspended(false); await draw();
  assert.equal(audio.paused, true, 'Foreground completion respects the master pause.');
  context().toggle(); await draw();
  assert.equal(audio.paused, false);

  const enterScene = async (sceneId, flags = {}, encounterId) => {
    const previousSource = source, previousPosition = audio.currentTime, previousPauseCalls = pauseCalls;
    release();
    // History/checkpoint boundaries render null for at least one commit before mounting the next screen.
    await Promise.resolve(); await draw(); advance(1000); await draw();
    assert.equal(source, previousSource, 'Unmounting a screen does not clear audio during navigation.');
    assert.equal(audio.currentTime, previousPosition);
    assert.equal(pauseCalls, previousPauseCalls, 'The navigation gap does not pause music.');
    release = claimScene(soundtrack, sceneId, flags, encounterId, sceneBlocks);
    await draw();
  };
  await enterScene('hotel-overload');
  audio.currentTime = 31;
  const morningCalls = playCalls;
  await enterScene('hotel-overload-search');
  assert.match(source, /calm-before-storm\.mp3$/);
  assert.equal(audio.currentTime, 31, 'Both awakening screens share one timeline.');
  assert.equal(playCalls, morningCalls);
  await enterScene('hotel-gallery');
  const hallSource = source, hallPlayCalls = playCalls;
  audio.currentTime = 69;
  for (const room of ['alexis-room', 'hotel-gallery', 'pussy-audience', 'pussy-prop-room', 'pussy-scepter-return', 'alexis-room-after-pussy', 'hotel-gallery']) {
    await enterScene(room);
    assert.equal(source, hallSource, `Hall music changed in ${room}.`);
    assert.equal(audio.currentTime, 69, `Hall music restarted in ${room}.`);
    assert.equal(playCalls, hallPlayCalls);
  }
  await enterScene('closed-bar');
  assert.equal(source, undefined);
  assert.equal(audio.paused, true, 'Entering the locked bar stops the hall music.');
  await enterScene('closed-bar', {}, 'club-beat-guards');
  assert.equal(source, undefined);
  assert.equal(audio.paused, true, 'A wrong-track fight stays without background music.');
  await enterScene('closed-bar', {'dance-troupe-freed': true});
  assert.notEqual(source, hallSource, 'The freed bar has a different track from the hall.');
  assert.match(source, /golden-coin-bazaar\.mp3$/);
  assert.equal(audio.paused, false, 'Freeing the dancers starts the bar background.');
  audio.currentTime = 43;
  const barCalls = playCalls;
  for (const view of ['stas', 'dancers', 'device', 'overview']) {
    await enterScene('closed-bar', {'dance-troupe-freed': true});
    assert.equal(audio.currentTime, 43, `Changing bar view to ${view} keeps the timeline.`);
    assert.equal(playCalls, barCalls);
  }
  await enterScene('closed-bar', {'dance-troupe-freed': false});
  assert.equal(source, undefined);
  assert.equal(audio.paused, true, 'Undoing the release stops the bar background again.');

  await enterScene('guest-bungalows');
  assert.match(source, /calm-before-storm\.mp3$/);
  audio.currentTime = 17;
  const bungalowCalls = playCalls;
  for (const sceneId of ['bungalow-courtyard', 'olva-passes-handoff', 'guest-bungalows', 'egorik-bungalow-reveal', 'olva-date-rehearsal', 'guest-bungalows']) {
    await enterScene(sceneId);
    assert.match(source, /calm-before-storm\.mp3$/);
    assert.equal(audio.currentTime, 17, 'All bungalow screens share one timeline.');
    assert.equal(playCalls, bungalowCalls);
  }
  await enterScene('groom-tunnel');
  assert.match(source, /stone-whisper\.mp3$/);
  assert.equal(media.props.loop, true);
  await enterScene('groom-preparation-room');
  assert.match(source, /golden-coin-bazaar\.mp3$/, 'Stone whisper ends upon entering Kreed’s room.');
  audio.currentTime = 27;
  const bunkerCalls = playCalls;
  for (const sceneId of ['kreed-disclosure', 'post-kreed-route', 'groom-preparation-room']) {
    await enterScene(sceneId);
    assert.match(source, /golden-coin-bazaar\.mp3$/);
    assert.equal(audio.currentTime, 27, 'All bunker screens after the corridor share one timeline.');
    assert.equal(playCalls, bunkerCalls);
  }
  await enterScene('graywise-door-trust');
  assert.match(source, /calm-before-storm\.mp3$/);
  audio.currentTime = 54;
  const villaCalls = playCalls;
  for (const sceneId of sceneBlocks.find(block => block.id === 'villa').sceneIds) {
    await enterScene(sceneId);
    assert.match(source, /calm-before-storm\.mp3$/);
    assert.equal(audio.currentTime, 54, 'All villa screens share one timeline outside combat.');
    assert.equal(playCalls, villaCalls);
  }
  await enterScene('last-take-boss', {}, 'andrey-dark-elf');
  assert.match(source, /netak-bone-king\.mp3$/);
  context().next(); await draw();
  audio.currentTime = 16;
  const bossSource = source, bossSourceChanges = sourceChanges.length;
  const bossCalls = playCalls;
  for (const flags of [
    {'andrey-phase-one-defeated': true},
    {'andrey-phase-one-defeated': true, 'andrey-transformation-started': true},
  ]) {
    await enterScene('last-take-boss', flags, 'andrey-dark-elf');
    assert.equal(source, bossSource, 'Intermission and transformation keep the current battle track');
    assert.equal(audio.currentTime, 16, 'Intermission does not rewind the battle track');
    assert.equal(playCalls, bossCalls);
  }
  // The movie temporarily owns audio, then the exact battle track resumes.
  hooks.setSuspended(true); await draw();
  hooks.setSuspended(false); await draw();
  await enterScene('last-take-boss', {}, 'andrey-dragon');
  assert.equal(audio.currentTime, 16, 'The boss phase change keeps its shared battle playlist.');
  assert.equal(source, bossSource);
  assert.equal(sourceChanges.length, bossSourceChanges, 'No exploration track or source reset between boss phases');
  assert.equal(playCalls, bossCalls + 1, 'Only movie completion resumes playback, phase routing does not restart it');
  await enterScene('villa-after-andrey');
  assert.match(source, /calm-before-storm\.mp3$/, 'Finishing combat restores the villa background.');

  release(); await Promise.resolve(); await draw();
  assert.match(source, /calm-before-storm\.mp3$/, 'Only exiting the whole player stops playback.');
  assert.equal(audio.paused, false);
  const exitPauseCalls = pauseCalls;
  hooks.unmount();
  assert.equal(audio.paused, true);
  assert.equal(pauseCalls, exitPauseCalls + 1);
  console.log('Soundtrack player PASS: delayed screen handoff, all six campaign blocks, gated bar, corridor-only exception, both boss phases, loops, atomic playlist changes, foreground fades and full-player exit cleanup.');
} finally {
  globalThis.performance = originalPerformance;
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
  delete globalThis.document;
  await server.close();
}
