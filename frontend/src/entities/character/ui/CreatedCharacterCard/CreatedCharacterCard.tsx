import {Link} from 'react-router-dom';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import type {CharacterSummary} from '../../model/created-character';
import {CharacterPortrait} from '../CharacterPortrait';
import {CharacterVitals} from '../CharacterVitals';
import {usePrefetchCharacter} from '../../model/usePrefetchCharacter';
import styles from './CreatedCharacterCard.module.css';

export type CreatedCharacterCardProps = {
  character: CharacterSummary;
  race: string;
  className: string;
};

export function CreatedCharacterCard({character, race, className}: CreatedCharacterCardProps) {
  const viewTransition = useViewTransitions();
  const prefetch = usePrefetchCharacter(character.id);
  return (
    <article className={styles.card} onPointerEnter={prefetch} onFocusCapture={prefetch} onPointerDown={prefetch}>
      <Link className={styles.portrait} to={`/characters/${character.id}`} viewTransition={viewTransition}
        aria-label={`Открыть персонажа: ${character.displayName}`}>
        <CharacterPortrait src={character.portraitUrl} name={character.displayName} />
      </Link>
      <div className={styles.content}>
        <header className={styles.identity}>
          <h2><Link to={`/characters/${character.id}`} viewTransition={viewTransition}>{character.displayName}</Link></h2>
          <p className={styles.race}>{race} · {className}</p>
        </header>
        <div className={styles.stats}><CharacterVitals maxHp={character.maxHp} baseAc={character.baseAc} /></div>
        <Link className={styles.open} to={`/characters/${character.id}`} viewTransition={viewTransition}>Открыть персонажа →</Link>
      </div>
    </article>
  );
}
