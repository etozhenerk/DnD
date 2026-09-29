import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import type {
  GalleryDancePuzzleDefinition,
  GalleryDanceTrackDefinition,
} from '../../../../entities/campaign-session/model/galleryGameplay';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {restartSilentVideo} from '../../../../shared/lib/media/restartSilentVideo';
import styles from './DanceTrackConsole.module.css';
import {useForegroundMedia} from '../../../../shared/lib/media/foregroundMedia';

interface DanceTrackConsoleProps {
  closeHref: string;
  fallbackImage: string;
  freed: boolean;
  lastTrack?: GalleryDanceTrackDefinition;
  onSelect: (trackId: string) => void;
  onSelectedTrackChange: (trackId: string | null) => void;
  puzzle: GalleryDancePuzzleDefinition;
  rejectedTrackIds: string[];
  selectedTrackId: string | null;
}

export function DanceTrackConsole({
  closeHref,
  fallbackImage,
  freed,
  lastTrack,
  onSelect,
  onSelectedTrackChange,
  puzzle,
  rejectedTrackIds,
  selectedTrackId,
}: DanceTrackConsoleProps) {
  const [page, setPage] = useState(0);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [playbackEnded, setPlaybackEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [failedVideoSource, setFailedVideoSource] = useState<string>();
  const pageCount = Math.max(1, Math.ceil(puzzle.tracks.length / 3));
  const visiblePage = Math.min(page, pageCount - 1);
  const visibleTracks = puzzle.tracks.slice(visiblePage * 3, visiblePage * 3 + 3);
  const selectedTrack = puzzle.tracks.find((track) => track.id === selectedTrackId);
  const selectedTrackNumber = puzzle.tracks.findIndex((track) => track.id === selectedTrackId) + 1;
  const videoSource = puzzle.video.source ? resolveAsset(puzzle.video.source) : undefined;
  const videoStartSeconds = puzzle.video.startSeconds ?? 0;
  const audioSlot = selectedTrack?.audio ?? puzzle.enchantedMusic;
  const audioSource = audioSlot.source ? resolveAsset(audioSlot.source) : undefined;
  useForegroundMedia(Boolean(audioSource) && !playbackEnded);
  useEffect(() => {
    if (!audioSource) videoRef.current?.pause();
  }, [audioSource]);

  useEffect(() => {
    if (
      selectedTrackId
      && (freed || rejectedTrackIds.includes(selectedTrackId))
    ) onSelectedTrackChange(null);
  }, [freed, onSelectedTrackChange, rejectedTrackIds, selectedTrackId]);

  const confirmTrack = () => {
    if (!selectedTrackId || freed) return;
    onSelect(selectedTrackId);
    onSelectedTrackChange(null);
  };

  const previewTrack = (trackId: string) => {
    setPlaybackEnded(false);
    setFailedVideoSource(undefined);
    onSelectedTrackChange(trackId);
    setPlaybackRevision((revision) => revision + 1);
    if (videoRef.current) restartSilentVideo(videoRef.current, videoStartSeconds);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
  };

  const finishPlayback = () => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    setPlaybackEnded(true);
  };

  return (
    <section className={styles.console} aria-label="Музыкальный пульт">
      <Link
        aria-label="Закрыть музыкальный пульт и вернуться к танцорам"
        className={styles.closeButton}
        title="Закрыть пульт"
        to={closeHref}
      >
        ×
      </Link>
      <div className={styles.innerFrame}>
        <figure className={styles.monitor}>
          <div className={styles.viewport} data-playback-ended={playbackEnded || !audioSource}>
            {videoSource && failedVideoSource !== videoSource ? (
              <video
                aria-label={puzzle.video.label}
                autoPlay={Boolean(audioSource) && !playbackEnded}
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                key={`${videoSource}:${videoStartSeconds}`}
                muted
                playsInline
                poster={resolveAsset(fallbackImage)}
                preload="metadata"
                ref={videoRef}
                onError={() => {
                  setFailedVideoSource(videoSource);
                  finishPlayback();
                }}
                onLoadedData={() => setFailedVideoSource(undefined)}
                onLoadedMetadata={(event) => {
                  event.currentTarget.currentTime = videoStartSeconds;
                  if (audioSource && !playbackEnded) restartSilentVideo(event.currentTarget, videoStartSeconds);
                  else event.currentTarget.pause();
                }}
                onEnded={finishPlayback}
              >
                <source src={videoSource} type="video/mp4" onError={() => {
                  setFailedVideoSource(videoSource);
                  finishPlayback();
                }} />
              </video>
            ) : (
              <img
                alt="Камера показывает пятерых танцоров WOK на сцене рядом с электронным пультом."
                src={resolveAsset(fallbackImage)}
              />
            )}
          </div>
          <div className={styles.monitorTrim} aria-hidden="true">
            <span /><i /><i /><i /><span />
          </div>
        </figure>
        <section className={styles.trackDisplay} aria-label="Музыкальные дорожки">
          <div className={styles.trackGrid}>
            {visibleTracks.map((track, index) => {
              const rejected = rejectedTrackIds.includes(track.id);
              const selected = selectedTrackId === track.id
                || (freed && lastTrack?.id === track.id);
              const disabled = freed || rejected;

              return (
                <button
                  aria-label={`Трек ${visiblePage * 3 + index + 1}`}
                  aria-pressed={selected}
                  className={styles.track}
                  data-current={selected}
                  data-rejected={rejected}
                  disabled={disabled}
                  key={track.id}
                  type="button"
                  onClick={() => previewTrack(track.id)}
                >
                  <span className={styles.trackNumber}>Трек {visiblePage * 3 + index + 1}</span>
                  <span className={styles.waveform} aria-hidden="true">
                    {Array.from({length: 35}, (_, bar) => (
                      <i key={bar} style={{
                        height: `${18 + ((bar * 31 + index * 17) % 77)}%`,
                        animationDelay: `${-bar * .073}s`,
                        animationDuration: `${.65 + (bar % 7) * .13}s`,
                      }} />
                    ))}
                  </span>
                  <span className={styles.selectGlyph} aria-hidden="true">{selected ? '✓' : rejected ? '×' : '▶'}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.controlDeck} aria-label="Запуск выбранной дорожки">
            {pageCount > 1 && <nav className={styles.pagination} aria-label="Страницы дорожек">
              <button type="button" aria-label="Предыдущие дорожки" disabled={visiblePage === 0} onClick={() => changePage(visiblePage - 1)}>‹</button>
              <span className={styles.dial} role="status" aria-label={`Страница ${visiblePage + 1} из ${pageCount}`}><b aria-hidden="true">{visiblePage + 1} / {pageCount}</b></span>
              <button type="button" aria-label="Следующие дорожки" disabled={visiblePage + 1 >= pageCount} onClick={() => changePage(visiblePage + 1)}>›</button>
            </nav>}

            {audioSource && (
              <audio
                aria-label="Прослушивание выбранного трека"
                autoPlay
                controls={false}
                hidden
                key={`${audioSource}:${playbackRevision}`}
                onEnded={finishPlayback}
                onError={finishPlayback}
                preload="metadata"
                ref={audioRef}
                src={audioSource}
              />
            )}
            <button
              className={styles.acceptButton}
              disabled={!selectedTrack || freed}
              type="button"
              onClick={confirmTrack}
            >
              <span className={styles.acceptGlyph} aria-hidden="true">{freed ? '✓' : '▶'}</span>
              <span>{freed ? 'Танцоры свободны' : selectedTrack ? `Включить трек ${selectedTrackNumber}` : 'Включить для танцоров'}</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
