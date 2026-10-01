import assert from 'node:assert/strict';
import {QueryClient} from '@tanstack/react-query';
import {createQueryClient} from '../src/app/model/create-query-client';
import {createdCharacterQuery, characterListQuery, creatorCatalogQuery} from '../src/entities/character/api/character-queries';
import {parseCharacter, parseCreatorCatalog} from '../src/entities/character/api/parse-character';
import {getQueryResource, getQueryError} from '../src/shared/lib/query-resource';

const character = parseCharacter({
  id: 'cdfe3446-d207-4f64-9056-d3dc39947fdc',
  displayName: 'Герой проверки', raceId: 'ice-wardens', classId: 'fighter',
  maxHp: 40, baseAc: 14, createdAt: '2026-09-30T09:31:44Z',
});
const client: QueryClient = createQueryClient();
let reads = 0;
const detail = {
  ...createdCharacterQuery(character.id),
  queryFn: async () => {reads++; return character;},
};

try {
  await Promise.all([client.fetchQuery(detail), client.fetchQuery(detail)]);
  assert.equal(reads, 1, 'simultaneous consumers share one request');
  await client.fetchQuery(detail);
  assert.equal(reads, 1, 'returning to a fresh character uses cached data');

  const anotherID = 'cdfe3446-d207-4f64-9056-d3dc39947fd1';
  await client.fetchQuery({...createdCharacterQuery(anotherID), queryFn: async () => ({...character, id: anotherID})});
  assert.equal(client.getQueryData(detail.queryKey)?.id, character.id, 'different character IDs cannot share a cache record');

  const firstPage = {...characterListQuery(0, 21), queryFn: async () => [character]};
  const secondPage = {...characterListQuery(20, 21), queryFn: async () => []};
  await client.fetchQuery(firstPage);
  await client.fetchQuery(secondPage);
  assert.equal(client.getQueryData(firstPage.queryKey)?.length, 1);
  assert.equal(client.getQueryData(secondPage.queryKey)?.length, 0);

  let catalogReads = 0;
  const catalog = {
    ...creatorCatalogQuery(),
    queryFn: async () => {
      catalogReads++;
      return parseCreatorCatalog({rulesetId: 'character-creation-v3', races: [], rules: {classProfiles: []}});
    },
  };
  await Promise.all([client.fetchQuery(catalog), client.fetchQuery(catalog)]);
  await client.fetchQuery(catalog);
  assert.equal(catalogReads, 1, 'list and detail use the same catalog query');

  client.setQueryData(detail.queryKey, character, {updatedAt: Date.now() - 5 * 60_000});
  await client.fetchQuery(detail);
  assert.equal(reads, 2, 'expired character data can refresh');
  await client.invalidateQueries({queryKey: ['characters']});
  await client.fetchQuery(detail);
  assert.equal(reads, 3, 'a future save can invalidate the character query family');
  assert.equal(client.getQueryState(catalog.queryKey)?.isInvalidated, false, 'character invalidation preserves the catalog');

  assert.equal(getQueryResource(character, new Error('background refresh failed')).status, 'ready', 'refresh failure does not replace existing data with a loading panel');
  assert.equal(getQueryError({data: character, error: new Error('background refresh failed')}), null,
    'cached catalog refresh errors do not interrupt loading another character');
  assert.equal(getQueryResource(undefined, new Error('request failed')).status, 'error');
  assert.equal(client.getDefaultOptions().queries?.retry, false, 'initial errors do not accumulate automatic retry delays');
} finally {
  client.clear();
}

console.log('Character query cache: deduplication, re-entry, pagination, catalog, freshness and invalidation passed.');
