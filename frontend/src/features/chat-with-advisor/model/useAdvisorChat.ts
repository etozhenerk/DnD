import {useEffect, useRef, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {advisorAvailabilityOptions, advisorImageOptions, advisorSessionOptions} from '../../../entities/character-advisor';
import type {AdvisorContext, AdvisorInput, AdvisorMode, AdvisorSession} from '../../../entities/character-advisor';
import {getRequestError} from '../../../shared/api/http';
import {useAdvisorTransport} from './useAdvisorTransport';

export function useAdvisorChat(context: AdvisorContext) {
  const {access, action} = useAdvisorTransport();
  const [text, setText] = useState('');
  const [attempt, setAttempt] = useState<AdvisorInput | null>(null);
  const [latestReplyId, setLatestReplyId] = useState<string | null>(null);
  const locked = useRef(false);
  const availability = useQuery(advisorAvailabilityOptions);
  const history = useQuery(advisorSessionOptions(access));
  const turns = history.data?.turns ?? [];
  const unresolved = turns.some((turn) => turn.status === 'reserved');
  const confirmedAttempt = attempt && turns.find((turn) => turn.requestId === attempt.requestId);
  const pending = action.isPending || history.isFetching;
  useEffect(() => {
    if (action.isPending || locked.current || !confirmedAttempt || confirmedAttempt.status === 'reserved') return;
    setAttempt(null);
    if (confirmedAttempt.status === 'succeeded') setLatestReplyId(confirmedAttempt.requestId);
    action.reset();
  }, [confirmedAttempt?.status, confirmedAttempt?.requestId, action.isPending, action.reset]);

  async function send(mode: AdvisorMode, message: string, target?: string, snapshot = context, repeat = false): Promise<AdvisorSession | undefined> {
    if (locked.current || !availability.data?.chat) return;
    const input = repeat ? attempt : {requestId: crypto.randomUUID(), message: message.trim(), context: snapshot, mode, ...(target ? {target} : {})};
    if (!input || !input.message || [...input.message].length > 2000 || (!repeat && ((attempt && !confirmedAttempt) || unresolved))) return;
    locked.current = true;
    setAttempt(input);
    if (!repeat && input.mode !== 'comment') setText('');
    try {
      let session = await action.mutateAsync(input);
      const turn = session.turns.find((item) => item.requestId === input.requestId);
      let completedTurn = turn;
      // Execute only the action returned by this send, never from history polling.
      // Its stable UUID makes a repeated dispatch read the existing image outcome.
      if (turn?.status === 'succeeded' && turn.action) {
        const job = turn.action;
        const imageInput: AdvisorInput = {requestId: job.requestId, mode: job.kind, message: job.prompt, context: input.context, ...(job.target ? {target: job.target} : {})};
        setAttempt(imageInput);
        session = await action.mutateAsync(imageInput);
        completedTurn = session.turns.find((item) => item.requestId === job.requestId);
      }
      if (completedTurn && completedTurn.status !== 'reserved') {
        setAttempt(null);
        if (completedTurn.status === 'succeeded') setLatestReplyId(completedTurn.requestId);
      }
      return session;
    } catch { return undefined; /* Keep the same ID and payload for an explicit repeat. */ }
    finally { locked.current = false; }
  }

  return {
    text, setText, turns, context, session: history.data, latestReplyId,
    canFill: availability.data?.fillCharacter === true,
    canImages: availability.data?.images === true,
    canComment: availability.data?.proactiveComments === true,
    stopAnimation: () => setLatestReplyId(null),
    pending, available: availability.data?.chat === true,
    canSend: availability.data?.chat === true && !pending && !unresolved && (!attempt || confirmedAttempt?.status !== undefined && confirmedAttempt.status !== 'reserved'),
    pendingMessage: attempt && !confirmedAttempt ? attempt : null,
    error: action.error ? getRequestError(action.error) : history.error ? getRequestError(history.error) : null,
    canRetry: !!attempt && !pending && !confirmedAttempt,
    canRefresh: !!access && (!!attempt && !confirmedAttempt || turns.some((turn) => turn.status === 'reserved')),
    submit: () => send('chat', text),
    fill: () => send('fill', text || 'Собери героя по моей задумке и нашему разговору. Заполни все разделы анкеты.'),
    suggest: (target: string) => send('suggest', text || 'Предложи интересный вариант для выбранного раздела.', target),
    comment: (snapshot: AdvisorContext) => send('comment', 'Коротко отреагируй на новый выбор в анкете. Если имя выбивается из мира — мягко предложи один вариант.', undefined, snapshot),
    generate: (kind: 'portrait' | 'icon', message: string, target?: string, snapshot?: AdvisorContext) => send(kind, message, target, snapshot),
    imageOptions: (requestId: string) => advisorImageOptions(access, requestId),
    retry: () => send('chat', '', undefined, context, true),
    refresh: async () => { if (access && !(await history.refetch()).isError) action.reset(); },
    availabilityError: availability.isError,
  };
}

export type AdvisorChatController = ReturnType<typeof useAdvisorChat>;
