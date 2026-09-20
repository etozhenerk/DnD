import assert from 'node:assert/strict';
import {createServer} from 'vite';

// Resolve the actual browser module graph without opening a browser.
const server = await createServer({
  appType: 'custom', logLevel: 'silent',
  server: {middlewareMode: true, hmr: false},
});
try {
  assert.ok(server.config.cacheDir.endsWith('/.vite-checks'));
  assert.ok(server.config.optimizeDeps.exclude.includes('@3d-dice/dice-box'));
  const roller = await server.transformRequest('/src/shared/ui/D20Roller/D20Roller.tsx');
  const diceUrl = roller.code.match(/import\("([^"]*dice-box[^"\n]*)"\)/)?.[1];
  assert.ok(diceUrl, 'D20Roller must load DiceBox');
  assert.doesNotMatch(diceUrl, /\.vite\/deps/);
  const dice = await server.transformRequest(diceUrl);
  const renderers = [...dice.code.matchAll(/import\("([^"]*world\.[^"]*)"\)/g)].map((match) => match[1]);
  assert.equal(renderers.length, 3, 'offscreen, onscreen and fallback renderers');
  for (const renderer of renderers) {
    assert.doesNotMatch(renderer, /\.vite\/deps/);
    assert.ok((await server.transformRequest(renderer))?.code.length > 0);
  }
  console.log('DiceBox and all three renderer modules resolve outside the Vite dependency cache.');
  console.log('SSR check cache is isolated from the running game.');
} finally {
  await server.close();
}
