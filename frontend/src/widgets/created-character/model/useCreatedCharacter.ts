import {useCallback} from 'react';
import {getCreatedCharacter, getCreatorCatalog} from '../../../entities/character';
import {useRemoteResource} from '../../../shared/lib/remote-resource';

export function useCreatedCharacter(id: string) {
  const load = useCallback(async (signal: AbortSignal) => {
    const [character, catalog] = await Promise.all([
      getCreatedCharacter(id, signal), getCreatorCatalog(signal),
    ]);
    return {character, catalog};
  }, [id]);
  return useRemoteResource(load);
}
