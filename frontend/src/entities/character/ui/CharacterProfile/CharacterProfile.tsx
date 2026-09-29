import type {Character} from '../../model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getStatLabel} from '../../../../shared/lib/character/getStatLabel';
import styles from './CharacterProfile.module.css';

export function CharacterProfile({character}: {character: Character}) {
  return (
    <article className={styles.profile} role="tabpanel">
      <div className={styles.art}>
        <img src={resolveAsset(character.visual.portrait)} alt={character.visual.alt} />
        <div className={styles.hp}><small>HP</small><strong>{character.maxHp}</strong></div>
        <div className={styles.ac}><small>AC</small><strong>{character.ac}</strong></div>
      </div>
      <div className={styles.sheet}>
        <p className={styles.race}>{character.race}</p>
        <h3>{character.name}</h3>
        <div className={styles.stats}>
          {Object.entries(character.stats).map(([stat, value]) => (
            <span key={stat}>
              <small>{getStatLabel(stat as keyof Character['stats'])}</small>
              <strong>{value >= 0 ? '+' : ''}{value}</strong>
            </span>
          ))}
        </div>
        <p className={styles.story}>{character.story}</p>
        <div className={styles.abilities}>
          {character.abilities.slice(0, 4).map((ability) => (
            <div key={ability.id}><strong>{ability.name}</strong><p>{ability.effect}</p></div>
          ))}
        </div>
      </div>
    </article>
  );
}
