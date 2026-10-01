import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import type {CreatedCharacterAbility} from '../../../../entities/character';
import {getUsesLabel} from '../../../../entities/character';
import styles from './CharacterAbilities.module.css';

export type CharacterAbilitiesProps = {abilities: CreatedCharacterAbility[]};

export function CharacterAbilities({abilities}: CharacterAbilitiesProps) {
  return (
    <section className={styles.section} aria-label="Навыки персонажа">
      <FantasyHeading>Навыки</FantasyHeading>
      {abilities.length === 0 && <p>Навыки не добавлены.</p>}
      <div className={styles.items}>{abilities.map((ability) => (
        <article key={ability.id} className={styles.ability}>
          <header className={styles.heading}>{ability.iconUrl && <img className={styles.icon} src={ability.iconUrl} alt="" loading="lazy" />}<h3>{ability.name}</h3></header>
          {ability.description && <p>{ability.description}</p>}
          {ability.effectText && <p className={styles.effect}>{ability.effectText}</p>}
          {ability.uses && <small>{getUsesLabel(ability.uses.scope, ability.uses.max)}</small>}
        </article>
      ))}</div>
    </section>
  );
}
