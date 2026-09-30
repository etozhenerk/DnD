import assert from 'node:assert/strict';
import {startCharacterDraft} from '../src/entities/character-draft/model/start-draft';
import {clearDraftSession, getDraftSession} from '../src/entities/character-draft/model/draft-session';
import {getCharacterDraft} from '../src/entities/character-draft/api/draft-api';
import {ApiError} from '../src/shared/api/http';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const storage = new Map<string, string>();
let storageAvailable = true;
const requests: {url: string; options?: RequestInit}[] = [];
let releaseResponse: (() => void) | undefined;
const responseBarrier = new Promise<void>((resolve) => {releaseResponse = resolve;});
const draft = {
  id: 'cdfe3446-d207-4f64-9056-d3dc39947fdc', rulesetId: 'character-creation-v2', formData: {},
  createdAt: '2026-09-30T09:31:44Z', updatedAt: '2026-09-30T09:31:44Z',
};
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (!storageAvailable) throw new Error('Storage unavailable');
      storage.set(key, value);
    },
    removeItem: (key: string) => storage.delete(key),
  }},
});

try {
  globalThis.fetch = async (input, options) => {
    requests.push({url: String(input), options});
    if (options?.method === 'POST') {
      await responseBarrier;
      return Response.json({...draft, token: 'test-draft-token'}, {status: 201});
    }
    return Response.json(draft);
  };
  const first = startCharacterDraft();
  const second = startCharacterDraft();
  assert.equal(requests.length, 1, 'Concurrent starts must create only one draft');
  if (!releaseResponse) throw new Error('Missing response barrier');
  releaseResponse();
  const [session, sameSession] = await Promise.all([first, second]);
  assert.deepEqual(session, sameSession);
  assert.equal(session.persistent, true);
  assert.equal(storage.size, 1, 'The one-time token must be saved before start resolves');
  assert.equal(JSON.parse([...storage.values()][0]).token, 'test-draft-token');
  assert.deepEqual(await startCharacterDraft(), session);
  assert.equal(requests.length, 1, 'Resuming must not create a new draft');
  assert.deepEqual(await getCharacterDraft(session), draft);
  const readRequest = requests[1];
  assert.equal(new Headers(readRequest.options?.headers).get('Authorization'), 'Bearer test-draft-token');
  assert.equal(readRequest.options?.credentials, 'omit');
  assert.ok(!readRequest.url.includes(session.token), 'Tokens must not appear in URLs');

  clearDraftSession('foreign-id');
  assert.equal(getDraftSession()?.id, draft.id, 'An old request cannot clear another draft');
  clearDraftSession(draft.id);
  assert.equal(getDraftSession(), null);
  assert.equal(storage.size, 0);

  storageAvailable = false;
  const memorySession = await startCharacterDraft();
  assert.equal(memorySession.persistent, false);
  assert.equal(memorySession.token, 'test-draft-token');
  assert.equal(storage.size, 0);
  assert.deepEqual(await startCharacterDraft(), memorySession, 'Blocked storage must retain the token in memory');
  clearDraftSession(draft.id);

  globalThis.fetch = async () => Response.json({code: 'unavailable', message: 'Позже'}, {status: 503});
  await assert.rejects(startCharacterDraft(), (error: unknown) => error instanceof ApiError && error.status === 503);
  assert.equal(getDraftSession(), null, 'Failed creation must not save a session');
  globalThis.fetch = async () => Response.json({...draft, token: 'retry-token'}, {status: 201});
  assert.equal((await startCharacterDraft()).token, 'retry-token', 'A failed start must allow retry');
  clearDraftSession(draft.id);
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
console.log('Anonymous drafts: single creation, resume, bearer transport, storage failure and retry passed.');
