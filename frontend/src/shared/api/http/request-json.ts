import {apiBaseUrl} from '../../config/api';
import {readJsonResponse} from './read-response';

export type JsonRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function requestJson(path: string, options: JsonRequestOptions = {}): Promise<unknown> {
  const headers = new Headers({Accept: 'application/json'});
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 35000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET', headers, signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'omit',
  });
  return readJsonResponse(response);
}
