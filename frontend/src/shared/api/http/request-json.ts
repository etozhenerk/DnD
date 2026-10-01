import {apiBaseUrl} from '../../config/api';
import {ApiError} from './api-error';

export type JsonRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
};

export async function requestJson(path: string, options: JsonRequestOptions = {}): Promise<unknown> {
  const headers = new Headers({Accept: 'application/json'});
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  const timeout = AbortSignal.timeout(35000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET', headers, signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'omit',
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw readApiError(value, response.status);
  if (value === null) throw new ApiError('Сервис вернул неполный ответ. Попробуйте ещё раз.', response.status, 'invalid_response');
  return value;
}

function readApiError(value: unknown, status: number): ApiError {
  if (status === 422) {
    return new ApiError('Проверьте анкету перед сохранением.', status, 'validation_failed', value);
  }
  if (typeof value === 'object' && value !== null && 'message' in value && 'code' in value
    && typeof value.message === 'string' && typeof value.code === 'string') {
    return new ApiError(value.message, status, value.code, value);
  }
  return new ApiError('Сервис временно недоступен. Попробуйте ещё раз.', status, 'unavailable');
}
