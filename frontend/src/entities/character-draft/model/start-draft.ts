import {createCharacterDraft} from '../api/draft-api';
import {getDraftSession, saveDraftSession} from './draft-session';
import type {DraftSession} from './types';

let pending: Promise<DraftSession> | null = null;

export async function startCharacterDraft(): Promise<DraftSession> {
  const existing = getDraftSession();
  if (existing) return existing;
  if (pending) return pending;
  pending = createCharacterDraft().then(({draft, token}) => saveDraftSession(draft.id, token));
  try {
    return await pending;
  } finally {
    pending = null;
  }
}
