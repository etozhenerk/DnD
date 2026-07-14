import type {RaceAppearance, RaceCatalogueEntry} from '../../model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './RaceCard.module.css';

const groupLabels = {
  hero: 'Герои',
  history: 'Прежний облик',
  npc: 'NPC',
  enemy: 'Противники',
} as const;

function AppearanceGroup({kind, people}: {kind: RaceAppearance['kind']; people: RaceAppearance[]}) {
  if (!people.length) return null;

  return (
    <section className={styles.appearanceGroup} aria-label={groupLabels[kind]}>
      <h3>{groupLabels[kind]}</h3>
      <ul>
        {people.map((person) => (
          <li key={person.id}>
            {person.image ? <img src={resolveAsset(person.image)} alt="" loading="lazy" decoding="async" /> : person.video ? <video src={resolveAsset(person.video)} aria-label={person.alt} autoPlay loop muted playsInline preload="metadata" /> : <span className={styles.monogram} aria-hidden="true">{person.name.slice(0, 1)}</span>}
            <span><strong>{person.name}</strong>{person.context ? <small>{person.context}</small> : null}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RaceCard({entry}: {entry: RaceCatalogueEntry}) {
  const {race, cover, heroes, history, npcs, enemies} = entry;
  const hasAppearances = heroes.length || history.length || npcs.length || enemies.length;

  return (
    <article className={styles.card} id={`race-${race.id}`}>
      <figure className={styles.visual}>
        {cover.image ? <img src={resolveAsset(cover.image)} alt={cover.alt} loading="lazy" decoding="async" /> : <video src={resolveAsset(cover.video ?? '')} aria-label={cover.alt} autoPlay loop muted playsInline preload="metadata" />}
      </figure>

      <div className={styles.copy}>
        <header>
          <span className={styles.status}>{race.status === 'playable' ? 'Игровая раса' : 'Встречена в летописи'}</span>
          <h2 className={race.id === 'dragonborn' ? styles.longTitle : undefined}>{race.name}</h2>
          <p>{race.description}</p>
        </header>

        {hasAppearances ? (
          <div className={styles.appearances}>
            <AppearanceGroup kind="hero" people={heroes} />
            <AppearanceGroup kind="history" people={history} />
            <AppearanceGroup kind="npc" people={npcs} />
            <AppearanceGroup kind="enemy" people={enemies} />
          </div>
        ) : <p className={styles.empty}>В текущих летописях пока нет прямо связанного персонажа.</p>}

      </div>
    </article>
  );
}
