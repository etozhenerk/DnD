import {parseCharacter} from '../../../entities/character';
import {ApiError, requestJson} from '../../../shared/api/http';
import type {CharacterSubmission} from '../model/submission';

export async function createCharacter(submission: CharacterSubmission) {
  const response = await requestJson('/characters', {method: 'POST', body: submission});
  try {
    const character = parseCharacter(response);
    if (character.id !== submission.requestId) throw new Error('Unexpected character ID');
    return character;
  } catch {
    throw new ApiError('Не удалось прочитать ответ сохранения. Повторите попытку — второй герой не появится.', 200, 'invalid_response');
  }
}
