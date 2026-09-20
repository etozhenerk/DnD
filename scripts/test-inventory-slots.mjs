import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType:'custom', logLevel:'silent', server:{middlewareMode:true}});
try {
  const {reconcileInventorySlots: slots} = await server.ssrLoadModule('/src/entities/campaign-session/model/inventorySlots.ts');
  assert.deepEqual(slots([], ['a','b','a','c']), ['a','b','c']);
  assert.deepEqual(slots(['a','b','c'], ['c','b','a','d']), ['a','b','c','d']);
  const removed = slots(['a','b','c'], ['a','c']);
  assert.deepEqual(removed, ['a',null,'c']);
  assert.deepEqual(slots(removed, ['a','c','d']), ['a','d','c']);
  assert.deepEqual(slots(['a','b','c'], ['a']), ['a']);
  assert.deepEqual(slots(['a','b','c'], []), []);
  assert.deepEqual(slots(['a','a',null,'b'], ['a','b','c']), ['a','c',null,'b']);
  const many = Array.from({length:19}, (_, i) => `item-${i}`);
  const restored = JSON.parse(JSON.stringify(slots([], many)));
  assert.deepEqual(slots(restored, many), many);
  assert.equal(new Set(restored).size, 19);
  assert.deepEqual(slots(restored, [...many.filter(id => id !== 'item-2'), 'reward']).slice(0,4), ['item-0','item-1','reward','item-3']);
  console.log('Inventory PASS: acquisition order, duplicate IDs, first free cell, stable occupied cells, removal, 19 items, reload, undo.');
} finally { await server.close(); }
