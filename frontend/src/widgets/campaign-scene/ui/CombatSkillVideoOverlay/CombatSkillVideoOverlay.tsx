import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import type {CombatSkillVideoCue} from '../../../../entities/combat/model/skillVideo';
import styles from './CombatSkillVideoOverlay.module.css';
import {useForegroundMedia} from '../../../../shared/lib/media/foregroundMedia';
import {useCriticalRollEffect} from '../../../../shared/lib/dice/useCriticalRollEffect';
import {fadeMediaVolume, getVideoVolume} from '../../../../shared/lib/media/mediaVolume';

interface CombatSkillVideoOverlayProps {
  cue: CombatSkillVideoCue | null;
  onComplete: () => void;
  preloadCues?: readonly CombatSkillVideoCue[];
  playbackRate?: number;
  ariaLabel?: string;
  fit?: 'cover' | 'contain';
}

function getCueKey(cue: CombatSkillVideoCue) {
  return `${cue.id}:${cue.videoSrc ?? ''}`;
}

export function CombatSkillVideoOverlay({
  cue: requestedCue,
  onComplete,
  preloadCues = [],
  playbackRate = 2,
  ariaLabel,
  fit = 'cover',
}: CombatSkillVideoOverlayProps) {
  const criticalEffect = useCriticalRollEffect();
  const cue = criticalEffect ? null : requestedCue;
  useForegroundMedia(Boolean(cue));
  const onCompleteRef = useRef(onComplete);
  const finishRef = useRef(onComplete);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const [failedVideoKeys, setFailedVideoKeys] = useState<Set<string>>(() => new Set());
  const [progress, setProgress] = useState(0);
  onCompleteRef.current = onComplete;

  const availableCues = useMemo(() => {
    const cues = new Map<string, CombatSkillVideoCue>();
    preloadCues.forEach((item) => cues.set(getCueKey(item), item));
    if (requestedCue) cues.set(getCueKey(requestedCue), requestedCue);
    return [...cues.values()];
  }, [requestedCue, preloadCues]);
  const activeKey = cue ? getCueKey(cue) : null;

  useEffect(() => {
    finishRef.current = () => onCompleteRef.current();
    if (!cue || !activeKey) {
      videoRefs.current.forEach((video) => video.pause());
      setProgress(0);
      return;
    }

    const video = videoRefs.current.get(activeKey);
    if (!video) return;

    let progressFrame = 0;
    let completionFrame = 0;
    let paintFrame = 0;
    let cancelled = false;
    let completing = false;
    let cancelFade = () => {};

    videoRefs.current.forEach((item, key) => {
      if (key === activeKey) return;
      item.pause();
      if (item.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) item.currentTime = 0.001;
    });

    const updateProgress = () => {
      if (cancelled || completing) return;
      const duration = video.duration;
      video.volume = getVideoVolume(video.currentTime, duration, playbackRate);
      if (Number.isFinite(duration) && duration > 0) {
        setProgress(Math.min(1, Math.max(0, video.currentTime / duration)));
      }
      if (!video.paused && !video.ended) progressFrame = requestAnimationFrame(updateProgress);
    };

    const startPlayback = () => {
      if (cancelled || completing) return;
      setProgress(0);
      video.defaultPlaybackRate = playbackRate;
      video.playbackRate = playbackRate;
      video.currentTime = 0.001;
      video.volume = 0;
      const playback = video.play();
      if (playback) {
        void playback.then(() => {
          if (!cancelled && !completing) progressFrame = requestAnimationFrame(updateProgress);
        }).catch(() => {
          if (!cancelled) setFailedVideoKeys((keys) => new Set(keys).add(activeKey));
        });
      } else {
        progressFrame = requestAnimationFrame(updateProgress);
      }
    };

    const complete = () => {
      if (cancelled) return;
      video.pause();
      video.volume = 0;
      setProgress(1);
      completionFrame = requestAnimationFrame(() => {
        if (!cancelled) paintFrame = requestAnimationFrame(() => {if (!cancelled) onCompleteRef.current();});
      });
    };
    const handleEnded = () => {
      if (completing) return;
      completing = true;
      cancelAnimationFrame(progressFrame);
      complete();
    };
    finishRef.current = () => {
      if (cancelled || completing) return;
      completing = true;
      cancelAnimationFrame(progressFrame);
      cancelFade = fadeMediaVolume(video, 0, complete);
    };
    const handleError = () => {
      setFailedVideoKeys((keys) => new Set(keys).add(activeKey));
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startPlayback();
    else video.addEventListener('loadeddata', startPlayback, {once: true});

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finishRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelled = true;
      cancelFade();
      video.pause();
      video.volume = 0;
      video.removeEventListener('loadeddata', startPlayback);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(progressFrame);
      cancelAnimationFrame(completionFrame);
      cancelAnimationFrame(paintFrame);
    };
  }, [activeKey, cue, playbackRate]);

  if (availableCues.length === 0) return null;

  const activeVideoAvailable = Boolean(
    cue?.videoSrc
    && activeKey
    && !failedVideoKeys.has(activeKey),
  );
  const progressStyle = {'--combat-skill-video-progress': progress} as CSSProperties;

  return (
    <section
      aria-hidden={cue ? undefined : true}
      aria-label={cue ? ariaLabel ?? `Видео навыка: ${cue.title}` : undefined}
      aria-modal={cue ? true : undefined}
      className={cue ? styles.overlay : requestedCue ? styles.waiting : styles.preload}
      role={cue ? 'dialog' : undefined}
    >
      <div className={`${styles.media} ${fit === 'contain' ? styles.contain : ''}`}>
        {availableCues.map((item) => {
          if (!item.videoSrc) return null;
          const itemKey = getCueKey(item);
          const isActive = itemKey === activeKey && !failedVideoKeys.has(itemKey);
          return (
            <video
              aria-hidden="true"
              className={isActive ? styles.activeMedia : styles.preloadedMedia}
              key={itemKey}
              playsInline
              poster={item.posterSrc}
              preload="auto"
              ref={(node) => {
                if (node) videoRefs.current.set(itemKey, node);
                else videoRefs.current.delete(itemKey);
              }}
              src={item.videoSrc}
              onLoadedData={(event) => {
                const video = event.currentTarget;
                video.defaultPlaybackRate = playbackRate;
                video.playbackRate = playbackRate;
                if (itemKey !== activeKey && video.currentTime === 0) video.currentTime = 0.001;
              }}
            />
          );
        })}
        {cue && !activeVideoAvailable && cue.posterSrc ? (
          <img alt="" aria-hidden="true" src={cue.posterSrc} />
        ) : null}
        {cue && !activeVideoAvailable && !cue.posterSrc ? (
          <div className={styles.emptyMedia} aria-hidden="true" />
        ) : null}
      </div>

      {cue ? (
        <>
          <button className={styles.skip} type="button" onClick={() => finishRef.current()}>
            Пропустить
          </button>
          {activeVideoAvailable ? (
            <div className={styles.progress} aria-hidden="true">
              <span style={progressStyle} />
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
