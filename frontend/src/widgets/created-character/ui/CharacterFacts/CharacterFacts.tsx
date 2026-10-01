import type {CreatedCharacter} from '../../../../entities/character';
import {CharacterAttributeList, CharacterVitals, getCharacterAttributeRows} from '../../../../entities/character';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import styles from './CharacterFacts.module.css';

export type CharacterFactsProps = {character: CreatedCharacter};

export function CharacterFacts({character}: CharacterFactsProps) {
  return (
    <section className={styles.facts} aria-label="Параметры персонажа">
      <FantasyHeading>Параметры</FantasyHeading>
      <div className={styles.vitals}><CharacterVitals maxHp={character.maxHp} baseAc={character.baseAc} /></div>
      <h3 className={styles.caption}>Характеристики</h3>
      <CharacterAttributeList rows={getCharacterAttributeRows(character.attributes)} columns={1} />
    </section>
  );
}
