import {ApiError} from './api-error';

export async function readJsonResponse(response: Response): Promise<unknown> {
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw readApiError(value, response.status);
  if (value === null) throw new ApiError('Сервис вернул неполный ответ. Попробуйте ещё раз.', response.status, 'invalid_response');
  return value;
}

function readApiError(value: unknown, status: number): ApiError {
  if (status === 422) return new ApiError('Проверьте анкету перед сохранением.', status, 'validation_failed', value);
  if (typeof value === 'object' && value !== null && 'message' in value && 'code' in value
    && typeof value.message === 'string' && typeof value.code === 'string') {
    return new ApiError(value.message, status, value.code, value);
  }
  return new ApiError('Сервис временно недоступен. Попробуйте ещё раз.', status, 'unavailable');
}
