import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {AdvisorChatController} from '../../../features/chat-with-advisor';

export function useAdvisorImage(chat: AdvisorChatController, requestId: string) {
  const query = useQuery(chat.imageOptions(requestId));
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!query.data) return;
    const local = URL.createObjectURL(query.data);
    setUrl(local);
    return () => URL.revokeObjectURL(local);
  }, [query.data]);
  return {url, file: query.data, loading: query.isPending, error: query.isError, refresh: query.refetch};
}
