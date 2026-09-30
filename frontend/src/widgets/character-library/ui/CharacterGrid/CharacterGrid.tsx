import {CreatedCharacterCard, getCharacterLabels} from '../../../../entities/character';
import type {CharacterSummary, CreatorCatalog} from '../../../../entities/character';
import styles from './CharacterGrid.module.css';

export type CharacterGridProps = {items: CharacterSummary[]; catalog: CreatorCatalog};

export function CharacterGrid({items, catalog}: CharacterGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((character) => (
        <CreatedCharacterCard key={character.id} character={character}
          {...getCharacterLabels(catalog, character.raceId, character.classId)} />
      ))}
    </div>
  );
}
