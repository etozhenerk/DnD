import {apiBaseUrl} from '../../../shared/config/api';
import {readObject, readString, readUuid} from '../../../shared/lib/json-fields';
import type {DraftSession} from './types';

const storageKey = `dnd.character-draft.v1:${apiBaseUrl}`;
const listeners = new Set<() => void>();
let current: DraftSession | null | undefined;

function readStorage(): DraftSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const data = readObject(JSON.parse(raw));
    const token = readString(data.token);
    if (!token) return null;
    return {id: readUuid(data.id), token, persistent: true};
  } catch {
    return null;
  }
}

export function getDraftSession(): DraftSession | null {
  if (current === undefined) current = readStorage();
  return current;
}

export function saveDraftSession(id: string, token: string): DraftSession {
  let persistent = false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({id, token}));
    persistent = true;
  } catch { /* Keep the one-time token in memory when browser storage is unavailable. */ }
  current = {id, token, persistent};
  listeners.forEach((listener) => listener());
  return current;
}

export function clearDraftSession(id: string): void {
  if (getDraftSession()?.id !== id) return;
  try {window.localStorage.removeItem(storageKey);} catch { /* In-memory recovery still works. */ }
  current = null;
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== storageKey && event.key !== null) return;
  current = readStorage();
  listeners.forEach((listener) => listener());
}

export function subscribeDraftSession(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', handleStorage);
  };
}
