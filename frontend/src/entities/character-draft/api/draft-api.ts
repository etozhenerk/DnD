import {ApiError, requestJson} from '../../../shared/api/http';
import {readObject, readString, readUuid} from '../../../shared/lib/json-fields';
import type {CharacterDraft, DraftSession} from '../model/types';

function parseDraft(value: unknown): CharacterDraft {
  const data = readObject(value);
  return {
    id: readUuid(data.id), rulesetId: readString(data.rulesetId), formData: readObject(data.formData),
    createdAt: readString(data.createdAt), updatedAt: readString(data.updatedAt),
  };
}

export async function createCharacterDraft() {
  const value = await requestJson('/drafts', {method: 'POST'});
  try {
    const token = readString(readObject(value).token);
    if (!token) throw new Error('Missing draft token');
    return {draft: parseDraft(value), token};
  } catch {
    throw new ApiError('Не удалось открыть черновик. Попробуйте ещё раз.', 201, 'invalid_response');
  }
}

export async function getCharacterDraft(session: DraftSession, signal?: AbortSignal): Promise<CharacterDraft> {
  const value = await requestJson(`/drafts/${encodeURIComponent(session.id)}`, {token: session.token, signal});
  try {
    const draft = parseDraft(value);
    if (draft.id !== session.id) throw new Error('Unexpected draft ID');
    return draft;
  } catch {
    throw new ApiError('Не удалось прочитать черновик. Попробуйте ещё раз.', 200, 'invalid_response');
  }
}
