import {useEffect, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  advisorAvailabilityOptions, advisorSessionOptions, createAdvisorSession, sendAdvisorMessage,
} from '../../../entities/character-advisor';
import type {AdvisorAccess, AdvisorContext, AdvisorInput} from '../../../entities/character-advisor';
import {getRequestError} from '../../../shared/api/http';

export function useAdvisorChat(context: AdvisorContext) {
  const cache = useQueryClient();
  const [access, setAccess] = useState<AdvisorAccess | null>(null);
  const [text, setText] = useState('');
  const [attempt, setAttempt] = useState<AdvisorInput | null>(null);
  const [latestReplyId, setLatestReplyId] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const currentAccess = useRef<AdvisorAccess | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (currentAccess.current) {
        cache.removeQueries({queryKey: advisorSessionOptions(currentAccess.current).queryKey});
      }
    };
  }, [cache]);
  const availability = useQuery(advisorAvailabilityOptions);
  const options = advisorSessionOptions(access);
  const history = useQuery(options);
  const action = useMutation({
    retry: false,
    mutationFn: async (input: AdvisorInput) => {
      let current = access;
      if (!current) {
        const created = await createAdvisorSession();
        current = {id: created.session.id, token: created.token};
        currentAccess.current = current;
        if (!mounted.current) return created.session;
        cache.setQueryData(advisorSessionOptions(current).queryKey, created.session);
        setAccess(current);
      }
      try {
        const session = await sendAdvisorMessage(current, input);
        if (mounted.current) cache.setQueryData(advisorSessionOptions(current).queryKey, session);
        return session;
      } catch (error) {
        if (mounted.current) void cache.invalidateQueries({queryKey: advisorSessionOptions(current).queryKey});
        throw error;
      }
    },
    onSuccess: (session, input) => {
      if (session.turns.some((turn) => turn.requestId === input.requestId && turn.status === 'succeeded')) {
        setAttempt(null);
        setLatestReplyId(input.requestId);
        setText('');
      }
    },
  });
  const turns = history.data?.turns ?? [];
  const unresolved = turns.some((turn) => turn.status !== 'succeeded');
  const confirmedAttempt = attempt && turns.find((turn) => turn.requestId === attempt.requestId);
  const pending = action.isPending || history.isFetching;
  useEffect(() => {
    if (confirmedAttempt?.status !== 'succeeded') return;
    setAttempt(null);
    setLatestReplyId(confirmedAttempt.requestId);
    setText('');
    action.reset();
  }, [confirmedAttempt?.status, confirmedAttempt?.requestId, action.reset]);

  async function submit(retry = false) {
    if (locked.current || !availability.data?.chat) return;
    const input = retry ? attempt : {requestId: crypto.randomUUID(), message: text.trim(), context};
    if (!input || !input.message || [...input.message].length > 2000 || (!retry && (attempt || unresolved))) return;
    locked.current = true;
    setAttempt(input);
    try { await action.mutateAsync(input); } catch { /* Preserve the ID and payload for an explicit repeat. */ }
    finally { locked.current = false; }
  }

  return {
    text, setText, turns, session: history.data, latestReplyId,
    stopAnimation: () => setLatestReplyId(null),
    pending, available: availability.data?.chat === true,
    canSend: availability.data?.chat === true && !pending && !unresolved && (!attempt || confirmedAttempt?.status === 'succeeded'),
    pendingMessage: attempt && !confirmedAttempt ? attempt : null,
    error: action.error ? getRequestError(action.error) : history.error ? getRequestError(history.error) : null,
    canRetry: !!attempt && !pending && !confirmedAttempt,
    submit: () => submit(), retry: () => submit(true),
    refresh: () => { if (access) void history.refetch(); },
    availabilityError: availability.isError,
  };
}

export type AdvisorChatController = ReturnType<typeof useAdvisorChat>;
