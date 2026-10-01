import {apiBaseUrl} from '../../../shared/config/api';

export function resolveCharacterMedia(source: string): string {
  return /^\/assets\/[0-9a-f-]{36}$/.test(source) ? apiBaseUrl + source : source;
}
