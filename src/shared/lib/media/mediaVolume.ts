export const MEDIA_FADE_MS = 600;

interface FadeClock {
  now: () => number;
  request: (callback: (time: number) => void) => number;
  cancel: (id: number) => void;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {const progress = clamp(value); return progress * progress * (3 - 2 * progress);};

/** Returns a cancellation function; reversing a fade starts at the current volume. */
export function fadeMediaVolume(
  media: Pick<HTMLMediaElement, 'volume'>,
  target: number,
  onComplete?: () => void,
  clock: FadeClock = {
    now: () => performance.now(),
    request: callback => requestAnimationFrame(callback),
    cancel: id => cancelAnimationFrame(id),
  },
) {
  const from = media.volume;
  const to = clamp(target);
  const startedAt = clock.now();
  let frame: number | undefined;
  let cancelled = false;
  const tick = (time: number) => {
    if (cancelled) return;
    const progress = clamp((time - startedAt) / MEDIA_FADE_MS);
    media.volume = from + (to - from) * ease(progress);
    if (progress === 1) {frame = undefined; onComplete?.();}
    else frame = clock.request(tick);
  };
  if (from === to) onComplete?.();
  else frame = clock.request(tick);
  return () => {cancelled = true; if (frame !== undefined) clock.cancel(frame);};
}

/** The fade lasts the same wall-clock time even when a skill plays at 2× speed. */
export function getVideoVolume(currentTime: number, duration: number, playbackRate: number) {
  const rate = Math.max(0.01, playbackRate);
  const fadeIn = ease(currentTime * 1000 / rate / MEDIA_FADE_MS);
  const fadeOut = Number.isFinite(duration) && duration > 0
    ? ease((duration - currentTime) * 1000 / rate / MEDIA_FADE_MS)
    : 1;
  return Math.min(fadeIn, fadeOut);
}
