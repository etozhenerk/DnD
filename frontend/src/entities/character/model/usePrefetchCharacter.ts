import {useQueryClient} from '@tanstack/react-query';
import {createdCharacterQuery} from '../api/character-queries';

export function usePrefetchCharacter(id: string) {
  const client = useQueryClient();
  return () => {void client.prefetchQuery(createdCharacterQuery(id));};
}
