import {useSyncExternalStore} from 'react';
import {getDraftSession, subscribeDraftSession} from './draft-session';

export function useDraftSession() {
  return useSyncExternalStore(subscribeDraftSession, getDraftSession, () => null);
}
