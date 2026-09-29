import {useEffect, useRef} from 'react';
import type {CampaignCreditsDefinition} from '../../../entities/campaign-session/model/credits';
import {getCreditsMusicSession} from './creditsMusicAudio';
import {listenForCreditsMusicUnlock} from './creditsMusicPlayback';

export function useCreditsMusic(music: CampaignCreditsDefinition['music'], active: boolean, restartCount: number) {
  const player = useRef<ReturnType<typeof getCreditsMusicSession> | null>(null);

  useEffect(() => {
    if (!music) return;
    const current = getCreditsMusicSession(music);
    current.prepareMusic();
    player.current = current;
    const release = current.retain();
    const retry = () => {
      if (current.audio.error) current.audio.load();
      current.playback.retry();
    };
    const removeUnlock = listenForCreditsMusicUnlock(document, () => {
      if (current.audio.paused || current.audio.error) retry();
    });
    current.audio.addEventListener('canplay', retry);
    return () => {
      removeUnlock();
      current.audio.removeEventListener('canplay', retry);
      player.current = null;
      release();
    };
  }, [music]);

  useEffect(() => {
    player.current?.playback.update(active, restartCount);
  }, [active, restartCount, music]);
}
