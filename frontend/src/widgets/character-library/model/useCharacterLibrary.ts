import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {creatorCatalogQuery, characterListQuery} from '../../../entities/character';
import {getQueryResource, getQueryError} from '../../../shared/lib/query-resource';

const pageSize = 20;

export function useCharacterLibrary() {
  const [offset, setOffset] = useState(0);
  const catalog = useQuery(creatorCatalogQuery());
  const characters = useQuery(characterListQuery(offset, pageSize + 1));
  const data = catalog.data && characters.data ? {
    catalog: catalog.data,
    items: characters.data.slice(0, pageSize),
    hasNext: characters.data.length > pageSize,
  } : undefined;
  const state = getQueryResource(data, getQueryError(catalog) ?? getQueryError(characters));
  const retry = () => {void catalog.refetch(); void characters.refetch();};
  return {
    state, retry, hasPrevious: offset > 0, pageNumber: offset / pageSize + 1,
    next: () => setOffset((value) => value + pageSize),
    previous: () => setOffset((value) => Math.max(0, value - pageSize)),
  };
}
