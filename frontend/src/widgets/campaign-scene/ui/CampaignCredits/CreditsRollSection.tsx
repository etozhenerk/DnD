import type {CreditsRollSectionData} from '../../model/creditsRoll';
import {CreditsPartyPhoto} from './CreditsPartyPhoto';
import styles from './CreditsRollSection.module.css';

export function CreditsRollSection({section}: {section: CreditsRollSectionData}) {
  return (
    <section className={styles.section} aria-labelledby={`credits-${section.id}`}>
      <h2 id={`credits-${section.id}`}>{section.title}</h2>
      <div className={styles.rows}>
        {section.rows.map((row) => (
          <div key={row.id} role="group" aria-labelledby={row.entries.map((entry) => `credit-name-${entry.id}`).join(' ')} className={[
            styles.row,
            row.photos.length > 1 ? styles.multiplePhotos
              : row.photos.length === 1 ? row.photos[0].index % 2 === 0 ? styles.photoLeft : styles.photoRight
                : styles.textOnly,
          ].join(' ')}>
            <ul className={styles.names}>
              {row.entries.map((entry) => (
                <li key={entry.id} id={`credit-name-${entry.id}`}>
                  <span className={entry.prototypeName ? styles.characterName : styles.primaryName}>{entry.name}</span>
                  {entry.prototypeName ? <span className={styles.primaryName}>{entry.prototypeName}</span> : null}
                </li>
              ))}
            </ul>
            {row.photos.length > 0 ? (
              <div className={styles.photos}>
                {row.photos.map(({photo, index}) => <CreditsPartyPhoto key={photo.id} photo={photo} index={index} />)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
