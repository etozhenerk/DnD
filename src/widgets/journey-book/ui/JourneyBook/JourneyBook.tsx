import type {CSSProperties} from 'react';
import type {Campaign} from '../../../../entities/campaign/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './JourneyBook.module.css';

export function JourneyBook({campaign}: {campaign: Campaign}) {
  const chronicle = campaign.completedChronicle;
  const bookStyle = {
    '--journey-book-cover': `url("${resolveAsset('assets/concepts/style/planned-campaign-open-book.png')}")`,
  } as CSSProperties;

  return (
    <section className={styles.book} style={bookStyle}>
      <div className={styles.bookInner}>
        <article className={styles.page}>
          <p className={styles.kicker}>Летопись похода</p>
          <h2>{chronicle?.journeyTitle ?? 'Летопись завершённого похода'}</h2>
          <div className={styles.story}>
            {(chronicle?.story ?? [campaign.summary]).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </article>
        <article className={styles.page}>
          <p className={styles.kicker}>Финал легенды</p>
          <h2>{chronicle?.finaleTitle ?? 'Финал легенды'}</h2>
          <p className={styles.ending}>{campaign.ending.readAloud}</p>
          <div className={styles.epilogueText}>
            {campaign.ending.epilogues.slice(0, 3).map((epilogue) => <p key={epilogue}>{epilogue}</p>)}
          </div>
          <p className={styles.reward}>{campaign.ending.reward}</p>
        </article>
      </div>
    </section>
  );
}
