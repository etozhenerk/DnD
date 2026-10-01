import {getRequestError} from '../../api/http';
import type {RemoteResource} from '../remote-resource';

export function getQueryResource<T>(data: T | undefined, error: unknown): RemoteResource<T> {
  if (data !== undefined) return {status: 'ready', data};
  if (error) return {status: 'error', message: getRequestError(error)};
  return {status: 'loading'};
}

export function getQueryError(query: {data: unknown; error: unknown}): unknown {
  return query.data === undefined ? query.error : null;
}
