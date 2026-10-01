import {queryOptions} from '@tanstack/react-query';
import {getCreatedCharacter, getCreatorCatalog, listCreatedCharacters} from './character-api';

export function creatorCatalogQuery() {
  return queryOptions({
    queryKey: ['creator', 'catalog'],
    queryFn: ({signal}) => getCreatorCatalog(signal),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function characterListQuery(offset: number, limit: number) {
  return queryOptions({
    queryKey: ['characters', 'list', {offset, limit}],
    queryFn: ({signal}) => listCreatedCharacters(offset, limit, signal),
    staleTime: 30_000,
  });
}

export function createdCharacterQuery(id: string) {
  return queryOptions({
    queryKey: ['characters', 'detail', id],
    queryFn: ({signal}) => getCreatedCharacter(id, signal),
    staleTime: 2 * 60_000,
  });
}
