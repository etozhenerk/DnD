import {FantasyFrame} from '../../../../shared/ui/FantasyFrame';
import {Link} from 'react-router-dom';
import type {CharacterSummary} from '../../model/created-character';
import {FantasySeal} from '../../../../shared/ui/FantasySeal';
import styles from './CreatedCharacterCard.module.css';

export type CreatedCharacterCardProps = {
  character: CharacterSummary;
  race: string;
  className: string;
};

export function CreatedCharacterCard({character, race, className}: CreatedCharacterCardProps) {
  return (
    <article className={styles.card}>
      <FantasyFrame />
      <div className={styles.emblem}><FantasySeal /></div>
      <p className={styles.race}>{race} · {className}</p>
      <h2><Link to={`/characters/${character.id}`}>{character.displayName}</Link></h2>
      <dl className={styles.stats}>
        <div><dt>Здоровье</dt><dd>{character.maxHp}</dd></div>
        <div><dt>Защита</dt><dd>{character.baseAc}</dd></div>
      </dl>
      <Link className={styles.open} to={`/characters/${character.id}`}>Открыть персонажа →</Link>
    </article>
  );
}
