import assert from 'node:assert/strict';
import {createServer} from 'vite';

const hooksId = '\0skill-video-test-hooks';
const server = await createServer({
  appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false},
  plugins: [{
    name: 'skill-video-test-hooks', enforce: 'pre',
    resolveId(id) {if (id === 'skill-video-test-hooks') return hooksId;},
    load(id) {
      if (id !== hooksId) return;
      return `let slots = [], cursor = 0, effects = [], dirty = true;
        const changed = (a,b) => !a || !b || a.length !== b.length || a.some((x,i) => !Object.is(x,b[i]));
        export function render(fn) {cursor = 0; dirty = false; return fn();}
        export function needsRender() {return dirty;}
        export function useState(initial) {const i = cursor++; if (!(i in slots)) slots[i] = {value: typeof initial === 'function' ? initial() : initial};
          return [slots[i].value, next => {const value = typeof next === 'function' ? next(slots[i].value) : next;
            if (!Object.is(value, slots[i].value)) {slots[i].value = value; dirty = true;}}];}
        export function useRef(initial) {return slots[cursor++] ??= {current: initial};}
        export function useMemo(fn, deps) {const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = {value: fn(), deps}; return slots[i].value;}
        export function useEffect(fn, deps) {const i = cursor++; if (changed(slots[i]?.deps, deps)) {const old = slots[i]; slots[i] = {deps};
          effects.push(() => {old?.cleanup?.(); slots[i].cleanup = fn();});}}
        export function flushEffects() {const pending = effects; effects = []; pending.forEach(fn => fn());}
        export function useSyncExternalStore(_subscribe, getSnapshot) {return getSnapshot();}
        export function unmount() {slots.forEach(slot => slot?.cleanup?.());}`;
    },
    transform(code, id) {
      if (['/CombatSkillVideoOverlay.tsx', '/useCriticalRollEffect.ts', '/media/foregroundMedia.ts'].some(path => id.endsWith(path))) {
        return code.replace("from 'react'", "from 'skill-video-test-hooks'");
      }
    },
  }],
});

const original = Object.fromEntries(['window', 'document', 'performance', 'HTMLMediaElement', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]));
let now = 0, sequence = 0;
const timers = new Map(), frames = new Map();
globalThis.window = {
  setTimeout(callback, delay) {const id = ++sequence; timers.set(id, {callback, at: now + delay}); return id;},
  clearTimeout(id) {timers.delete(id);},
};
globalThis.document = new EventTarget();
globalThis.performance = {now: () => now};
globalThis.HTMLMediaElement = {HAVE_CURRENT_DATA: 2};
globalThis.requestAnimationFrame = callback => {const id = ++sequence; frames.set(id, callback); return id;};
globalThis.cancelAnimationFrame = id => frames.delete(id);
const advance = ms => {
  now += ms;
  for (const [id, timer] of timers) if (timer.at <= now) {timers.delete(id); timer.callback();}
  const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
};
const walk = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(walk) : [tree, ...walk(tree.props?.children)];

try {
  const {CombatSkillVideoOverlay} = await server.ssrLoadModule('/src/widgets/campaign-scene/ui/CombatSkillVideoOverlay/CombatSkillVideoOverlay.tsx');
  const critical = await server.ssrLoadModule('/src/shared/lib/dice/criticalRollEffect.ts');
  const {useBackgroundMediaPaused} = await server.ssrLoadModule('/src/shared/lib/media/foregroundMedia.ts');
  const {getVideoVolume} = await server.ssrLoadModule('/src/shared/lib/media/mediaVolume.ts');
  const hooks = await server.ssrLoadModule('skill-video-test-hooks');
  const cue = {id: 'skill', title: 'Навык', videoSrc: 'skill.mp4'};
  let currentCue = cue, completed = 0, playCalls = 0, tree;
  const video = Object.assign(new EventTarget(), {
    currentTime: 0, duration: 8, volume: 1, readyState: 2, paused: true, ended: false,
    play() {playCalls++; this.paused = false; this.ended = false; return Promise.resolve();},
    pause() {this.paused = true;},
  });
  const draw = async () => {
    for (let i = 0; i < 20; i++) {
      tree = hooks.render(() => CombatSkillVideoOverlay({cue: currentCue, onComplete: () => {completed++; currentCue = null;}}));
      walk(tree).filter(node => node.type === 'video').forEach(node => node.props.ref(video));
      hooks.flushEffects(); await Promise.resolve();
      if (!hooks.needsRender()) return;
    }
    assert.fail('Video state did not settle');
  };

  for (const result of [20, 1]) {
    const previousCalls = playCalls;
    currentCue = cue;
    critical.triggerCriticalRollEffect(result);
    await draw();
    assert.equal(playCalls, previousCalls, `${result}: video cannot start during the effect`);
    assert.equal(useBackgroundMediaPaused(), false, 'Battle music continues during the result animation');
    assert.match(tree.props.className, /waiting/);
    advance(2599); await draw(); assert.equal(playCalls, previousCalls);
    advance(1); await draw(); assert.equal(playCalls, previousCalls + 1);
    assert.equal(useBackgroundMediaPaused(), true);
    assert.equal(video.volume, 0, 'Video begins silently');
    video.currentTime = 0.6; advance(300); await draw();
    assert.ok(video.volume > 0 && video.volume < 1, 'Video fades in at 2x speed');
    video.currentTime = 3; advance(900); await draw(); assert.equal(video.volume, 1);
    video.currentTime = 7.4; advance(1000); await draw();
    assert.ok(video.volume > 0 && video.volume < 1, 'Video fades out before ending');
    video.currentTime = 8; video.ended = true; video.dispatchEvent(new Event('ended'));
    advance(0); advance(0); await draw();
    assert.equal(currentCue, null); assert.equal(useBackgroundMediaPaused(), false);
  }

  critical.triggerCriticalRollEffect(20); advance(1300);
  critical.triggerCriticalRollEffect(1); advance(1300);
  assert.equal(critical.getCriticalRollEffect()?.result, 1, 'A newer effect owns its full duration');
  advance(1300); assert.equal(critical.getCriticalRollEffect(), null);
  critical.triggerCriticalRollEffect(19); assert.equal(critical.getCriticalRollEffect(), null);
  critical.triggerCriticalRollEffect(20, '1d8'); assert.equal(critical.getCriticalRollEffect(), null);

  const previousCalls = playCalls;
  currentCue = cue; critical.triggerCriticalRollEffect(20); await draw();
  currentCue = null; await draw(); advance(2600); await draw();
  assert.equal(playCalls, previousCalls, 'Cancelled/disabled queued video does not start later');

  currentCue = cue; await draw(); video.currentTime = 3; advance(600); await draw();
  const beforeSkip = completed;
  walk(tree).find(node => node.type === 'button').props.onClick();
  assert.equal(completed, beforeSkip, 'Skip waits for the audio fade');
  advance(300); assert.ok(video.volume > 0 && video.volume < 1);
  advance(300); advance(0); advance(0); await draw();
  assert.equal(completed, beforeSkip + 1);
  assert.equal(video.volume, 0); assert.equal(video.paused, true);
  assert.equal(getVideoVolume(0.3, 8, 1), getVideoVolume(0.6, 8, 2), 'Fade duration is independent of playback speed');

  currentCue = cue; await draw(); hooks.unmount(); advance(10000);
  assert.equal(video.paused, true); assert.equal(video.volume, 0);
  assert.equal(completed, beforeSkip + 1, 'Unmount cancels delayed completion');
  console.log('PASS: 1/20 before video, full replacement duration, no effect for other rolls, cancelled cue, fade in/out at 1x/2x, smooth skip and cleanup.');
} finally {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
  await server.close();
}
