import type {CampaignCreditsDefinition} from '../../../entities/campaign-session/model/credits';
import type {getCreditsMusicSession} from './creditsMusicAudio';
import {listenForCreditsMusicUnlock} from './creditsMusicPlayback';

/** Stop the song, hold the closing line, then reuse its activated player for the clip. */
export function playCreditsPostlude(
  current: ReturnType<typeof getCreditsMusicSession>,
  video: NonNullable<CampaignCreditsDefinition['postCreditsVideo']>,
  stage: HTMLElement,
  onComplete: () => void,
  onStarted: () => void,
) {
  const release = current.retain();
  const media = current.audio;
  current.playback.update(false, 0);
  let started = false;
  let completed = false;
  let disposed = false;
  let announced = false;
  const complete = () => {
    if (!started || completed || disposed) return;
    completed = true;
    current.playback.update(false, 0);
    onComplete();
  };
  const retry = () => {
    if (!started || completed || disposed || !media.paused) return;
    if (media.error) media.load();
    current.playback.retry();
  };
  const removeUnlock = listenForCreditsMusicUnlock(document, retry);
  const revealVideo = () => {
    if (!started || completed || disposed || announced) return;
    announced = true;
    onStarted();
  };
  media.addEventListener('ended', complete);
  media.addEventListener('error', complete);
  media.addEventListener('canplay', retry);
  media.addEventListener('playing', revealVideo);
  media.setAttribute('aria-label', video.title);
  const timer = window.setTimeout(() => {
    if (disposed) return;
    started = true;
    stage.append(media);
    current.playVideo(video);
  }, video.delayMs);
  return () => {
    disposed = true;
    window.clearTimeout(timer);
    removeUnlock();
    media.removeEventListener('ended', complete);
    media.removeEventListener('error', complete);
    media.removeEventListener('canplay', retry);
    media.removeEventListener('playing', revealVideo);
    current.playback.update(false, 0);
    if (media.parentNode === stage) media.remove();
    release();
  };
}
