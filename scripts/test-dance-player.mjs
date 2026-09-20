import assert from 'node:assert/strict';
import {createServer} from 'vite';

const hooksId = '\0dance-player-hooks';
const server = await createServer({
  appType: 'custom', logLevel: 'silent', server: {middlewareMode: true, hmr: false},
  plugins: [{
    name: 'dance-player-test-hooks', enforce: 'pre',
    resolveId(id) { if (id === 'dance-player-hooks') return hooksId; },
    load(id) {
      if (id !== hooksId) return;
      return `let slots = [], cursor = 0;
        export function render(fn) { cursor = 0; return fn(); }
        export function useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial;
          return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; }
        export function useRef(initial) { const i = cursor++; return slots[i] ??= {current: initial}; }
        export function useEffect() { cursor++; }
        export function useSyncExternalStore(_subscribe, getSnapshot) { cursor++; return getSnapshot(); }`;
    },
    transform(code, id) {
      if (id.endsWith('/DanceTrackConsole.tsx') || id.endsWith('/media/foregroundMedia.ts')) {
        return code.replace("from 'react'", "from 'dance-player-hooks'");
      }
    },
  }],
});
try {
  const {DanceTrackConsole} = await server.ssrLoadModule('/src/widgets/campaign-scene/ui/DanceTrackConsole/DanceTrackConsole.tsx');
  const {render} = await server.ssrLoadModule('dance-player-hooks');
  const {penisuelaGalleryGameplay: definition} = await server.ssrLoadModule('/src/entities/campaign-session/model/playableData.ts');
  let selectedTrackId = null, confirmations = [], tree;
  const draw = () => tree = render(() => DanceTrackConsole({
    closeHref: '/', fallbackImage: '', freed: false, puzzle: definition.dancePuzzle,
    rejectedTrackIds: [], selectedTrackId,
    onSelectedTrackChange: id => { selectedTrackId = id; },
    onSelect: id => confirmations.push(id),
  }));
  const flatten = node => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const find = predicate => { const node = flatten(tree).find(predicate); assert.ok(node); return node; };
  const named = name => find(n => n.props?.['aria-label'] === name);
  const media = type => find(n => n.type === type);
  draw();
  let playCalls = 0, pauseCalls = 0, audioPauseCalls = 0;
  assert.equal(media('video').props.autoPlay, false);
  assert.notEqual(media('video').props.loop, true);
  assert.ok(find(n => n.props?.['data-playback-ended'] === true));
  const video = {currentTime: 0, muted: false, play() { playCalls++; return Promise.resolve(); }, pause() { pauseCalls++; }};
  media('video').props.ref.current = video;
  named('Трек 1').props.onClick(); draw();
  media('audio').props.ref.current = {pause() { audioPauseCalls++; }};
  const audioKey = media('audio').key, source = media('audio').props.src;
  assert.equal(video.currentTime, 6); assert.equal(video.muted, true);
  video.currentTime = 42;
  named('Следующие дорожки').props.onClick(); draw();
  assert.equal(media('audio').key, audioKey); assert.equal(media('audio').props.src, source);
  assert.equal(video.currentTime, 42); assert.equal(playCalls, 1); assert.equal(pauseCalls, 0);
  assert.ok(named('Трек 4')); assert.equal(selectedTrackId, definition.dancePuzzle.tracks[0].id);
  assert.notEqual(media('audio').props.loop, true);
  media('audio').props.onEnded(); draw();
  assert.equal(pauseCalls, 1); assert.equal(audioPauseCalls, 1);
  assert.ok(find(n => n.props?.['data-playback-ended'] === true));
  media('video').props.onEnded(); assert.equal(playCalls, 1, 'finished audio prevents video restart');
  named('Следующие дорожки').props.onClick(); draw();
  assert.ok(named('Трек 7')); assert.ok(find(n => n.props?.['data-playback-ended'] === true));
  const correctIndex = definition.dancePuzzle.tracks.findIndex(t => t.correct);
  const correctLabel = `Трек ${correctIndex + 1}`;
  let currentPage = 2;
  while (currentPage !== Math.floor(correctIndex / 3)) {
    const forward = currentPage < Math.floor(correctIndex / 3);
    named(forward ? 'Следующие дорожки' : 'Предыдущие дорожки').props.onClick(); draw();
    currentPage += forward ? 1 : -1;
  }
  named(correctLabel).props.onClick(); draw();
  assert.ok(find(n => n.props?.['data-playback-ended'] === false));
  assert.equal(video.currentTime, 6); assert.equal(playCalls, 2);
  assert.notEqual(media('audio').key, audioKey);
  assert.equal(selectedTrackId, definition.dancePuzzle.tracks.find(t => t.correct).id);
  const originalKey = media('audio').key;
  named(correctLabel).props.onClick(); draw();
  assert.notEqual(media('audio').key, originalKey, 'repeat click restarts the same audio');
  const beforeVideoEnd = {video: pauseCalls, audio: audioPauseCalls};
  media('video').props.onEnded(); draw();
  assert.equal(pauseCalls, beforeVideoEnd.video + 1);
  assert.equal(audioPauseCalls, beforeVideoEnd.audio + 1, 'video ending first pauses audio');
  assert.ok(find(n => n.props?.['data-playback-ended'] === true));
  named('Следующие дорожки').props.onClick(); draw();
  find(n => n.type === 'button' && n.props.className && !n.props['aria-label'] && n.props.children?.[1]?.props?.children === `Включить трек ${correctIndex + 1}`).props.onClick();
  assert.deepEqual(confirmations, ['four-count-vogue']);
  console.log('Dance player PASS: page continuity, multiple track pages, either stream ended → both paused + black screen, no autoplay without audio or video loop, new/repeat playback and off-page confirmation.');
} finally { await server.close(); }
