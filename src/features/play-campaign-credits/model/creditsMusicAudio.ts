import type {CampaignCreditsDefinition} from '../../../entities/campaign-session/model/credits';
import {resolveAsset} from '../../../shared/lib/assets/resolveAsset';
import {createCreditsMusicPlayback} from './creditsMusicPlayback';

type CreditsMusic = CampaignCreditsDefinition['music'];

function createSession(music: CreditsMusic, source: string) {
  // A video element plays both the MP3 and the final clip with one user activation.
  const audio = document.createElement('video');
  audio.playsInline = true;
  audio.controls = false;
  audio.disablePictureInPicture = true;
  audio.preload = 'auto';
  if (source) audio.src = source;
  let playback = createCreditsMusicPlayback(audio, () => {});
  let currentSource = source;
  const prepare = (nextSource: string, loop: boolean, volume: number) => {
    if (currentSource !== nextSource) {
      playback.dispose();
      currentSource = nextSource;
      audio.src = nextSource;
      playback = createCreditsMusicPlayback(audio, () => {});
    }
    audio.loop = loop;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.muted = false;
    audio.playbackRate = 1;
  };
  const prepareMusic = () => {if (music) prepare(source, false, music.volume);};
  prepareMusic();
  let owners = 0;
  return {
    source, audio, prepareMusic,
    get playback() {return playback;},
    playVideo(video: NonNullable<CampaignCreditsDefinition['postCreditsVideo']>) {
      prepare(resolveAsset(video.source), false, video.volume);
      playback.update(true, 0);
    },
    retain() {
      ++owners;
      return () => {
        --owners;
        // React StrictMode immediately reacquires the same player. Do not interrupt it.
        queueMicrotask(() => {if (owners === 0) playback.update(false, 0);});
      };
    },
    cancelNavigation() {if (owners === 0) playback.update(false, 0);},
  };
}

let session: ReturnType<typeof createSession> | undefined;

/** The ending action and credits route share the exact same unlocked audio element. */
export function getCreditsMusicSession(music: CreditsMusic) {
  const source = music ? resolveAsset(music.source) : '';
  if (!session || session.source !== source) {
    session?.playback.dispose();
    session = createSession(music, source);
  }
  return session;
}

/** Must run synchronously inside the ending action, before lazy route navigation. */
export function startCreditsMusic(music: CampaignCreditsDefinition['music']) {
  if (!music) return () => {};
  const current = getCreditsMusicSession(music);
  current.prepareMusic();
  current.audio.currentTime = 0;
  current.playback.update(true, 0);
  current.playback.retry();
  return current.cancelNavigation;
}
