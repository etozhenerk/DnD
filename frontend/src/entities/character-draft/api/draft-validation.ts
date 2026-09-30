import {ApiError, requestJson} from '../../../shared/api/http';
import {readArray, readObject, readString} from '../../../shared/lib/json-fields';
import type {DraftSession, DraftValidation} from '../model/types';

export async function validateCharacterDraft(session: DraftSession, signal?: AbortSignal): Promise<DraftValidation> {
  const value = await requestJson(`/drafts/${encodeURIComponent(session.id)}/validate`, {
    method: 'POST', token: session.token, signal,
  });
  try {
    const data = readObject(value);
    if (typeof data.valid !== 'boolean') throw new Error('Expected a validation result');
    return {
      valid: data.valid,
      issues: readArray(data.issues).map((value) => {
        const issue = readObject(value);
        return {path: readString(issue.path), code: readString(issue.code), message: readString(issue.message)};
      }),
    };
  } catch {
    throw new ApiError('Не удалось проверить заполнение черновика. Попробуйте ещё раз.', 200, 'invalid_response');
  }
}
