import {useEffect, useRef} from 'react';
import type {CampaignPreviewMusic} from '../../../entities/campaign-preview/model/types';
import {resolveAsset} from '../../../shared/lib/assets/resolveAsset';
import {createPreviewMusicPlayback} from './previewMusicPlayback';

export function usePreviewMusic(music: CampaignPreviewMusic | undefined, isLast: boolean) {
  const playbackRef = useRef<ReturnType<typeof createPreviewMusicPlayback> | null>(null);
  const lastSlideRef = useRef(isLast);
  lastSlideRef.current = isLast;

  useEffect(() => {
    if (!music) return;
    const audio = new Audio(resolveAsset(music.source));
    audio.preload = 'auto';
    const playback = createPreviewMusicPlayback(audio, music);
    playbackRef.current = playback;
    playback.setLastSlide(lastSlideRef.current);
    const retry = () => playback.retry();
    audio.addEventListener('canplay', retry);
    document.addEventListener('pointerdown', retry);
    document.addEventListener('keydown', retry);
    return () => {
      audio.removeEventListener('canplay', retry);
      document.removeEventListener('pointerdown', retry);
      document.removeEventListener('keydown', retry);
      playback.dispose();
      playbackRef.current = null;
    };
  }, [music]);

  useEffect(() => {
    playbackRef.current?.setLastSlide(isLast);
  }, [isLast, music]);
}
