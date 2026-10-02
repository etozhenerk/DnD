import {queryOptions} from '@tanstack/react-query';
import {apiBaseUrl} from '../../../shared/config/api';
import {ApiError} from '../../../shared/api/http';
import type {AdvisorAccess} from '../model/chat-types';

export function advisorImageOptions(access: AdvisorAccess | null, requestId: string) {
  return queryOptions({
    queryKey: ['advisor', 'session', access?.id ?? 'none', 'image', requestId],
    enabled: !!access,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    queryFn: async ({signal}) => {
      if (!access) throw new Error('Advisor access required');
      const response = await fetch(`${apiBaseUrl}/advisor/sessions/${access.id}/images/${requestId}`, {
        headers: {Authorization: `Bearer ${access.token}`}, signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]), credentials: 'omit',
      });
      if (!response.ok) throw new ApiError('Не удалось открыть изображение Советника.', response.status, 'advisor_image_unavailable');
      const type = response.headers.get('Content-Type')?.split(';')[0];
      if (type !== 'image/jpeg' && type !== 'image/png') throw new Error('Invalid advisor image type');
      const blob = await response.blob();
      if (!blob.size || blob.size > 1024 * 1024) throw new Error('Invalid advisor image size');
      return new File([blob], `advisor-${requestId}.${type === 'image/png' ? 'png' : 'jpg'}`, {type});
    },
  });
}
