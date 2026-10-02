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
  const unresolved = turns.some((turn) => turn.status !== 'succeeded');
  const confirmedAttempt = attempt && turns.find((turn) => turn.requestId === attempt.requestId);
  const pending = action.isPending || history.isFetching;
  useEffect(() => {
    if (confirmedAttempt?.status !== 'succeeded') return;
    if (attempt?.mode !== 'comment') setText('');
    setAttempt(null);
    setLatestReplyId(confirmedAttempt.requestId);
    action.reset();
  }, [confirmedAttempt?.status, confirmedAttempt?.requestId, attempt?.mode, action.reset]);

  async function send(mode: AdvisorMode, message: string, target?: string, snapshot = context, repeat = false): Promise<AdvisorSession | undefined> {
    if (locked.current || !availability.data?.chat) return;
    const input = repeat ? attempt : {requestId: crypto.randomUUID(), message: message.trim(), context: snapshot, mode, ...(target ? {target} : {})};
    if (!input || !input.message || [...input.message].length > 2000 || (!repeat && (attempt || unresolved))) return;
    locked.current = true;
    setAttempt(input);
    try {
      const session = await action.mutateAsync(input);
      if (session.turns.some((turn) => turn.requestId === input.requestId && turn.status === 'succeeded')) {
        setAttempt(null);
        setLatestReplyId(input.requestId);
        if (input.mode !== 'comment') setText('');
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
    canSend: availability.data?.chat === true && !pending && !unresolved && (!attempt || confirmedAttempt?.status === 'succeeded'),
    pendingMessage: attempt && !confirmedAttempt ? attempt : null,
    error: action.error ? getRequestError(action.error) : history.error ? getRequestError(history.error) : null,
    canRetry: !!attempt && !pending && !confirmedAttempt,
    submit: () => send('chat', text),
    fill: () => send('fill', text || 'Собери героя по моей задумке и нашему разговору. Заполни все разделы анкеты.'),
    suggest: (target: string) => send('suggest', text || 'Предложи интересный вариант для выбранного раздела.', target),
    comment: (snapshot: AdvisorContext) => send('comment', 'Коротко отреагируй на новый выбор в анкете. Если имя выбивается из мира — мягко предложи один вариант.', undefined, snapshot),
    generate: (kind: 'portrait' | 'icon', message: string, target?: string, snapshot?: AdvisorContext) => send(kind, message, target, snapshot),
    imageOptions: (requestId: string) => advisorImageOptions(access, requestId),
    retry: () => send('chat', '', undefined, context, true),
    refresh: () => { if (access) void history.refetch(); },
    availabilityError: availability.isError,
  };
}

export type AdvisorChatController = ReturnType<typeof useAdvisorChat>;
