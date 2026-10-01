import {CharacterPortrait} from '../../../../entities/character';
import type {CreatedCharacter, CreatorCatalog} from '../../../../entities/character';
import {CharacterHeader} from '../CharacterHeader';
import {CharacterFacts} from '../CharacterFacts';
import {CharacterStory} from '../CharacterStory';
import {CharacterAbilities} from '../CharacterAbilities';
import {CharacterEquipment} from '../CharacterEquipment';
import styles from './CharacterSheet.module.css';

export type CharacterSheetProps = {character: CreatedCharacter; catalog: CreatorCatalog};

export function CharacterSheet({character, catalog}: CharacterSheetProps) {
  return (
    <article aria-labelledby={`character-title-${character.id}`}>
      <CharacterHeader character={character} catalog={catalog} />
      <div className={styles.overview}>
        <div className={styles.portrait}><CharacterPortrait src={character.portraitUrl} name={character.displayName} /></div>
        <div className={styles.facts}><CharacterFacts character={character} /></div>
        <div className={styles.story}><CharacterStory character={character} /></div>
      </div>
      <div className={styles.collections}>
        <CharacterAbilities abilities={character.abilities} />
        <CharacterEquipment items={character.equipment} />
      </div>
    </article>
  );
}
