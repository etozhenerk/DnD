import {queryOptions} from '@tanstack/react-query';
import {requestJson} from '../../../shared/api/http';
import type {AdvisorAccess, AdvisorInput} from '../model/chat-types';
import {readAvailability, readCreatedSession, readSession} from './read-chat';

export const advisorAvailabilityOptions = queryOptions({
  queryKey: ['advisor', 'availability'],
  queryFn: async ({signal}) => readAvailability(await requestJson('/creator/advisor', {signal})),
  staleTime: 60_000,
  retry: false,
});

export function advisorSessionOptions(access: AdvisorAccess | null) {
  return queryOptions({
    queryKey: ['advisor', 'session', access?.id ?? 'none'],
    queryFn: async ({signal}) => {
      if (!access) throw new Error('Advisor access required');
      return readSession(await requestJson(`/advisor/sessions/${access.id}`, {token: access.token, signal}));
    },
    enabled: access !== null,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => query.state.data?.turns.some((turn) => turn.status === 'reserved') ? 2000 : false,
  });
}

export async function createAdvisorSession() {
  return readCreatedSession(await requestJson('/advisor/sessions', {method: 'POST'}));
}

export async function sendAdvisorMessage(access: AdvisorAccess, input: AdvisorInput) {
  return readSession(await requestJson(`/advisor/sessions/${access.id}/messages`, {
    method: 'POST', token: access.token, body: input,
    timeoutMs: input.mode === 'portrait' || input.mode === 'icon' ? 115000 : 35000,
  }));
}
