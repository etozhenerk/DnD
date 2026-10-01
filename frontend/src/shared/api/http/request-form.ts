import {apiBaseUrl} from '../../config/api';
import {readJsonResponse} from './read-response';

export async function requestForm(path: string, body: FormData): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST', body, headers: {Accept: 'application/json'},
    signal: AbortSignal.timeout(35000), credentials: 'omit',
  });
  return readJsonResponse(response);
}
