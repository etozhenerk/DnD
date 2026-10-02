import {useEffect, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {advisorSessionOptions, createAdvisorSession, sendAdvisorMessage} from '../../../entities/character-advisor';
import type {AdvisorAccess, AdvisorInput} from '../../../entities/character-advisor';

export function useAdvisorTransport() {
  const cache = useQueryClient();
  const [access, setAccess] = useState<AdvisorAccess | null>(null);
  const current = useRef<AdvisorAccess | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (current.current) cache.removeQueries({queryKey: advisorSessionOptions(current.current).queryKey});
    };
  }, [cache]);
  const action = useMutation({
    retry: false,
    mutationFn: async (input: AdvisorInput) => {
      if (!current.current) {
        const created = await createAdvisorSession();
        current.current = {id: created.session.id, token: created.token};
        if (!alive.current) return created.session;
        cache.setQueryData(advisorSessionOptions(current.current).queryKey, created.session);
        setAccess(current.current);
      }
      const options = advisorSessionOptions(current.current);
      try {
        const session = await sendAdvisorMessage(current.current, input);
        if (alive.current) cache.setQueryData(options.queryKey, session);
        return session;
      } catch (error) {
        if (alive.current) void cache.invalidateQueries({queryKey: options.queryKey});
        throw error;
      }
    },
  });
  return {access, action};
}
