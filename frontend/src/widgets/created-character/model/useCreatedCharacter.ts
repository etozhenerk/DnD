import {useQuery} from '@tanstack/react-query';
import {createdCharacterQuery, creatorCatalogQuery} from '../../../entities/character';
import {getQueryResource, getQueryError} from '../../../shared/lib/query-resource';

export function useCreatedCharacter(id: string) {
  const character = useQuery(createdCharacterQuery(id));
  const catalog = useQuery(creatorCatalogQuery());
  const data = character.data && catalog.data ? {character: character.data, catalog: catalog.data} : undefined;
  const state = getQueryResource(data, getQueryError(character) ?? getQueryError(catalog));
  const retry = () => {void character.refetch(); void catalog.refetch();};
  return {state, retry};
}
