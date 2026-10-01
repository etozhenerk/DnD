import {ApiError, requestJson} from '../../../shared/api/http';
import {parseCharacter, parseCharacterList, parseCreatorCatalog} from './parse-character';

async function readResponse<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const value = await requestJson(path, {signal});
  try {
    return parse(value);
  } catch {
    throw new ApiError('Не удалось прочитать данные персонажей. Попробуйте ещё раз.', 200, 'invalid_response');
  }
}

export function listCreatedCharacters(offset: number, limit: number, signal?: AbortSignal, fresh = false) {
  const suffix = fresh ? '&fresh=true' : '';
  return readResponse(`/characters?offset=${offset}&limit=${limit}${suffix}`, parseCharacterList, signal);
}

export function getCreatedCharacter(id: string, signal?: AbortSignal) {
  return readResponse(`/characters/${encodeURIComponent(id)}`, parseCharacter, signal);
}

export function getCreatorCatalog(signal?: AbortSignal) {
  return readResponse('/creator/options', parseCreatorCatalog, signal);
}
