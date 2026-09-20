import {useCallback, useEffect, useState} from 'react';
import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import {useCriticalRollEffect} from '../../../shared/lib/dice/useCriticalRollEffect';
import {readGallerySessionEvents, subscribeToGallerySessionWrites} from './gallerySessionStorage';
import {createManualCheckRewardObserver, type ManualCheckRewardNotice} from './manualCheckRewards';

export function useManualCheckRewards(definition: GalleryGameplayDefinition) {
  const [observe] = useState(() => createManualCheckRewardObserver(readGallerySessionEvents({
    campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version,
  }), definition));
  const [queue, setQueue] = useState<ManualCheckRewardNotice[]>([]);
  const criticalEffect = useCriticalRollEffect();
  useEffect(() => subscribeToGallerySessionWrites((campaignId, events) => {
    if (campaignId !== definition.campaignId) return;
    const {sessionChanged, notices} = observe(events);
    if (sessionChanged) setQueue(notices);
    else if (notices.length) setQueue(current => [...current, ...notices]);
  }), [definition.campaignId, observe]);
  const notice = !criticalEffect ? queue[0] : undefined;
  const dismiss = useCallback(() => {
    // The same click/key event cannot accidentally acknowledge the next queued reward.
    setQueue(current => current[0]?.id === notice?.id ? current.slice(1) : current);
  }, [notice?.id]);
  return {notice, dismiss};
}
