import {useCallback, useState} from 'react';
import {getCreatorCatalog, listCreatedCharacters} from '../../../entities/character';
import {useRemoteResource} from '../../../shared/lib/remote-resource';

const pageSize = 20;

export function useCharacterLibrary() {
  const [offset, setOffset] = useState(0);
  const load = useCallback(async (signal: AbortSignal) => {
    const [catalog, items] = await Promise.all([
      getCreatorCatalog(signal), listCreatedCharacters(offset, pageSize + 1, signal),
    ]);
    return {catalog, items: items.slice(0, pageSize), hasNext: items.length > pageSize};
  }, [offset]);
  const {state, retry} = useRemoteResource(load);
  return {
    state, retry, hasPrevious: offset > 0, pageNumber: offset / pageSize + 1,
    next: () => setOffset((value) => value + pageSize),
    previous: () => setOffset((value) => Math.max(0, value - pageSize)),
  };
}
