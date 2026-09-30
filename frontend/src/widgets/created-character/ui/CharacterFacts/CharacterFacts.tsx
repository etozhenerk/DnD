import {FantasyFrame} from '../../../../shared/ui/FantasyFrame';
import type {CreatedCharacter, CreatorCatalog} from '../../../../entities/character';
import {getAttributeLabel, getCharacterLabels} from '../../../../entities/character';
import {FantasySeal} from '../../../../shared/ui/FantasySeal';
import styles from './CharacterFacts.module.css';

export type CharacterFactsProps = {character: CreatedCharacter; catalog: CreatorCatalog};

export function CharacterFacts({character, catalog}: CharacterFactsProps) {
  const labels = getCharacterLabels(catalog, character.raceId, character.classId);
  return (
    <section className={styles.facts} aria-label="Параметры персонажа">
      <FantasyFrame />
      <div className={styles.emblem}><FantasySeal /></div>
      <p>{labels.race} · {labels.className}</p>
      <h1>{character.displayName}</h1>
      {character.pronouns && <p>{character.pronouns}</p>}
      {character.roleLabel && <p>{character.roleLabel}</p>}
      <dl className={styles.vitals}>
        <div><dt>Здоровье</dt><dd>{character.maxHp}</dd></div>
        <div><dt>Защита</dt><dd>{character.baseAc}</dd></div>
      </dl>
      <dl className={styles.attributes}>
        {Object.entries(character.attributes).map(([id, value]) => (
          <div key={id}><dt>{getAttributeLabel(id)}</dt><dd>{value > 0 && '+'}{value}</dd></div>
        ))}
      </dl>
    </section>
  );
}
