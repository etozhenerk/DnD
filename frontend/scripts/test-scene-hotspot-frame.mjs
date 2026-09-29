import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', logLevel: 'silent', server: {middlewareMode: true}});
try {
  const {getFittedImageRect: fit} = await server.ssrLoadModule('/src/shared/lib/image/getFittedImageRect.ts');
  assert.deepEqual(fit(1024, 768, 1600, 900, 'contain'), {x: 0, y: 96, width: 1024, height: 576});
  assert.deepEqual(fit(1280, 800, 1600, 900, 'contain'), {x: 0, y: 40, width: 1280, height: 720});
  const cover = fit(1024, 768, 1600, 900, 'cover');
  assert.equal(cover.height, 768);
  assert.ok(cover.x < 0);
  assert.equal(cover.y, 0);
  assert.equal(cover.x + cover.width / 2, 512, 'Image centre stays aligned despite cropping');
  const ultrawide = fit(1920, 720, 1600, 900, 'contain');
  assert.deepEqual(ultrawide, {x: 320, y: 0, width: 1280, height: 720});
  console.log('Hotspot frame PASS: contain letterboxing and cover cropping at 1024/1280/ultrawide.');
} finally { await server.close(); }
