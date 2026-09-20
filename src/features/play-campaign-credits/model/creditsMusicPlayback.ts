type MusicPlayer = Pick<HTMLMediaElement, 'play' | 'pause' | 'currentTime' | 'ended'>;

/** Ignore late autoplay results after a pause, restart or route change. */
export function createCreditsMusicPlayback(audio: MusicPlayer, onBlocked: (blocked: boolean) => void) {
  let playing = false;
  let disposed = false;
  let revision = 0;
  let lastRestart = 0;
  let pending: number | null = null;

  const play = () => {
    if (disposed || !playing || pending !== null || audio.ended) return;
    const request = ++revision;
    pending = request;
    void audio.play().then(() => {
      if (!disposed && playing && request === revision) onBlocked(false);
    }).catch(() => {
      if (disposed || !playing || request !== revision) return;
      onBlocked(true);
    }).finally(() => {
      if (pending === request) pending = null;
    });
  };

  return {
    update(nextPlaying: boolean, restartCount: number) {
      if (disposed) return;
      const restart = restartCount !== lastRestart;
      const changed = playing !== nextPlaying;
      playing = nextPlaying;
      lastRestart = restartCount;
      if (restart) audio.currentTime = 0;
      if (!playing) {
        ++revision;
        pending = null;
        audio.pause();
      } else if (changed || restart) play();
    },
    retry: play,
    dispose() {
      disposed = true;
      playing = false;
      ++revision;
      pending = null;
      audio.pause();
    },
  };
}

/** Keep trying on later gestures when an earlier gesture still lacked activation. */
export function listenForCreditsMusicUnlock(target: EventTarget, retry: () => void) {
  const events = ['pointerup', 'click', 'keydown'];
  events.forEach((event) => target.addEventListener(event, retry));
  return () => events.forEach((event) => target.removeEventListener(event, retry));
}
