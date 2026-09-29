type MusicPlayer = Pick<HTMLMediaElement, 'play' | 'pause' | 'paused' | 'volume' | 'loop'>;
interface FadeClock {
  now: () => number;
  request: (callback: (time: number) => void) => number;
  cancel: (id: number) => void;
}

export function createPreviewMusicPlayback(
  audio: MusicPlayer,
  settings: {volume: number; fadeOutMs: number},
  clock: FadeClock = {
    now: () => performance.now(),
    request: callback => requestAnimationFrame(callback),
    cancel: id => cancelAnimationFrame(id),
  },
) {
  const volume = Math.max(0, Math.min(1, settings.volume));
  let mode: 'initial' | 'playing' | 'fading' | 'silent' = 'initial';
  let disposed = false;
  let pending = false;
  let frame: number | null = null;
  audio.loop = true;
  audio.volume = 0;

  const cancelFade = () => {
    if (frame !== null) clock.cancel(frame);
    frame = null;
  };
  const retry = () => {
    if (disposed || mode !== 'playing' || pending || !audio.paused) return;
    pending = true;
    void audio.play().then(() => {
      if (disposed || mode === 'silent') audio.pause();
    }).catch(() => {
      // A later gesture or canplay event can retry, but never during the final fade.
    }).finally(() => {pending = false;});
  };

  return {
    retry,
    setLastSlide(isLast: boolean) {
      if (disposed) return;
      if (!isLast) {
        cancelFade();
        mode = 'playing';
        audio.volume = volume;
        retry();
        return;
      }
      if (mode === 'silent' || mode === 'fading') return;
      cancelFade();
      if (mode === 'initial' || audio.paused || audio.volume === 0) {
        mode = 'silent';
        audio.volume = 0;
        audio.pause();
        return;
      }
      mode = 'fading';
      const fromVolume = audio.volume;
      const startedAt = clock.now();
      const duration = Math.max(1, settings.fadeOutMs);
      const tick = (time: number) => {
        if (disposed || mode !== 'fading') return;
        const progress = Math.max(0, Math.min(1, (time - startedAt) / duration));
        const eased = progress * progress * (3 - 2 * progress);
        audio.volume = fromVolume * (1 - eased);
        if (progress === 1) {
          frame = null;
          mode = 'silent';
          audio.pause();
        } else frame = clock.request(tick);
      };
      frame = clock.request(tick);
    },
    dispose() {
      disposed = true;
      mode = 'silent';
      cancelFade();
      audio.volume = 0;
      audio.pause();
    },
  };
}
