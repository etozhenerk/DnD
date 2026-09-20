import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {CampaignMusicTrack} from '../../../../entities/campaign-session/model/soundtrack';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {useBackgroundMediaPaused} from '../../../../shared/lib/media/foregroundMedia';
import {fadeMediaVolume} from '../../../../shared/lib/media/mediaVolume';
import {CampaignSoundtrackContext} from '../../model/campaignSoundtrack';

export function CampaignSoundtrack({children, initialVolume = 0.3}: {children: ReactNode; initialVolume?: number}) {
  const [{playlist, index}, setPlayback] = useState<{playlist: CampaignMusicTrack[]; index: number}>({playlist: [], index: 0});
  const [enabled, setEnabled] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousSource = useRef<string | undefined>(undefined);
  const suspended = useBackgroundMediaPaused();
  const track = playlist[index % Math.max(1, playlist.length)];
  const source = track ? resolveAsset(track.source) : undefined;
  const setPlaylist = useCallback((tracks: CampaignMusicTrack[]) => {
    setPlayback((previous) => previous.playlist.length === tracks.length
      && previous.playlist.every((item, position) => item.id === tracks[position].id && item.source === tracks[position].source)
      ? previous : {playlist: tracks, index: 0});
  }, []);
  useEffect(() => {setUnavailable(false);}, [source]);
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    void audio.play().then(() => setBlocked(false)).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setBlocked(true);
    });
  }, [source]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (previousSource.current !== source) audio.volume = 0;
    previousSource.current = source;
    if (enabled && !suspended && source && !unavailable) {
      play();
      return fadeMediaVolume(audio, volume);
    }
    if (enabled && suspended && source && !unavailable && !audio.paused) {
      return fadeMediaVolume(audio, 0, () => audio.pause());
    }
    audio.volume = 0;
    audio.pause();
  }, [enabled, suspended, source, volume, play, unavailable]);
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);
  useEffect(() => {
    if (!enabled || suspended || !blocked || unavailable) return;
    const retry = () => play();
    document.addEventListener('pointerdown', retry, {once: true});
    document.addEventListener('keydown', retry, {once: true});
    return () => {
      document.removeEventListener('pointerdown', retry);
      document.removeEventListener('keydown', retry);
    };
  }, [enabled, suspended, blocked, unavailable, play]);
  const next = useCallback(() => {
    setUnavailable(false);
    if (playlist.length <= 1 && audioRef.current) {
      audioRef.current.currentTime = 0;
      if (enabled && !suspended) play();
    } else setPlayback((current) => ({...current, index: (current.index + 1) % Math.max(1, current.playlist.length)}));
  }, [playlist.length, enabled, suspended, play]);
  const toggle = useCallback(() => {
    if (blocked || unavailable || !enabled) {
      setEnabled(true);
      setUnavailable(false);
      if (!suspended) play();
    } else setEnabled(false);
  }, [blocked, unavailable, enabled, suspended, play]);
  const value = useMemo(() => ({setPlaylist, enabled, blocked, unavailable, volume, title: track?.title, toggle, next, setVolume}),
    [setPlaylist, enabled, blocked, unavailable, volume, track?.title, toggle, next]);
  return <CampaignSoundtrackContext.Provider value={value}>
    {children}
    <audio aria-label="Фоновая музыка кампании" hidden preload="none" ref={audioRef} src={source} loop={playlist.length === 1}
      onEnded={next} onError={() => {if (source) setUnavailable(true);}} />
  </CampaignSoundtrackContext.Provider>;
}
