import {getCharacterLabels} from '../../../../entities/character';
import type {CreatedCharacter, CreatorCatalog} from '../../../../entities/character';
import styles from './CharacterHeader.module.css';

export type CharacterHeaderProps = {character: CreatedCharacter; catalog: CreatorCatalog};

export function CharacterHeader({character, catalog}: CharacterHeaderProps) {
  const labels = getCharacterLabels(catalog, character.raceId, character.classId);
  return (
    <header className={styles.header}>
      <p className={styles.origin}>{labels.race} <span aria-hidden="true">·</span> {labels.className}</p>
      <h1 id={`character-title-${character.id}`}>{character.displayName}</h1>
      {(character.roleLabel || character.pronouns) && (
        <div className={styles.details}>
          {character.roleLabel && <span>{character.roleLabel}</span>}
          {character.pronouns && <span>{character.pronouns}</span>}
        </div>
      )}
    </header>
  );
}
