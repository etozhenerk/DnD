import {Navigate} from 'react-router-dom';
import type {CampaignCreditsDefinition} from '../../../../entities/campaign-session/model/credits';
import {useCreditsPlayback} from '../../../../features/play-campaign-credits/model/useCreditsPlayback';
import {useCreditsMusic} from '../../../../features/play-campaign-credits/model/useCreditsMusic';
import {buildCreditsRollSections} from '../../model/creditsRoll';
import {CreditsRollSection} from './CreditsRollSection';
import {CreditsPostlude} from './CreditsPostlude';
import styles from './CampaignCredits.module.css';

interface CampaignCreditsProps {
  credits: CampaignCreditsDefinition;
  returnHref?: string;
}

export function CampaignCredits({credits, returnHref}: CampaignCreditsProps) {
  const playback = useCreditsPlayback(Boolean(credits.postCreditsVideo));
  useCreditsMusic(credits.music, playback.phase === 'roll', playback.restartCount);
  const sections = buildCreditsRollSections(credits);

  if (playback.phase === 'end' && returnHref) return <Navigate replace to={returnHref} />;

  return (
    <main className={styles.page} aria-label="Финальные титры">
      {playback.phase === 'roll' ? (
        <div
          ref={playback.viewportRef}
          className={styles.viewport}
          tabIndex={0}
          role="region"
          aria-label="Лента титров и фотографий"
          onWheel={playback.pause}
          onTouchStart={playback.pause}
          onKeyDown={(event) => {
            if (event.key === ' ') {
              event.preventDefault();
              playback.togglePaused();
            } else if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) {
              playback.pause();
            }
          }}
        >
          <div className={styles.roll}>
            <p className={styles.eyebrow}>Хроники Восьми Земель</p>
            <h1>{credits.title}</h1>
            {sections.map((section) => <CreditsRollSection key={section.id} section={section} />)}
            <p className={styles.thanks}>{credits.closingText}</p>
          </div>
        </div>
      ) : playback.phase === 'video' && credits.postCreditsVideo ? (
        <CreditsPostlude music={credits.music} video={credits.postCreditsVideo} closingText={credits.closingText} onComplete={playback.completeVideo} />
      ) : credits.postCreditsVideo ? <section className={styles.end} aria-label="Конец истории" /> : (
        <section className={styles.end} aria-label="Конец титров">
          <p className={styles.eyebrow}>До следующего приключения</p>
          <h1>{credits.closingText}</h1>
        </section>
      )}
    </main>
  );
}
