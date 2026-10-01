import {parseCharacter} from '../../../entities/character';
import {ApiError, requestJson, requestForm} from '../../../shared/api/http';
import {prepareCharacterUpload} from '../model/media';
import type {CharacterMedia} from '../model/media';
import type {CharacterSubmission} from '../model/submission';

export async function createCharacter(submission: CharacterSubmission, media?: CharacterMedia) {
  const response = media && (media.portrait || media.icons.length > 0)
    ? await requestForm('/characters', await prepareCharacterUpload(submission, media))
    : await requestJson('/characters', {method: 'POST', body: submission});
  try {
    const character = parseCharacter(response);
    if (character.id !== submission.requestId) throw new Error('Unexpected character ID');
    return character;
  } catch {
    throw new ApiError('Не удалось прочитать ответ сохранения. Повторите попытку — второй герой не появится.', 200, 'invalid_response');
  }
}
