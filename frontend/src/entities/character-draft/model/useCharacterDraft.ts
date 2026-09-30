import {useCallback} from 'react';
import {ApiError} from '../../../shared/api/http';
import {useRemoteResource} from '../../../shared/lib/remote-resource';
import {getCharacterDraft} from '../api/draft-api';
import {validateCharacterDraft} from '../api/draft-validation';
import {clearDraftSession} from './draft-session';
import {useDraftSession} from './useDraftSession';

export function useCharacterDraft() {
  const session = useDraftSession();
  const load = useCallback(async (signal: AbortSignal) => {
    if (!session) return null;
    try {
      const draft = await getCharacterDraft(session, signal);
      const validation = await validateCharacterDraft(session, signal);
      return {...draft, validation};
    } catch (error) {
      if (!signal.aborted && error instanceof ApiError && (error.status === 404 || error.status === 401)) {
        clearDraftSession(session.id);
      }
      throw error;
    }
  }, [session]);
  const resource = useRemoteResource(load);
  return {...resource, session};
}
