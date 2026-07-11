import type {Character} from '../../model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './CharacterTabs.module.css';

interface CharacterTabsProps {
  characters: Character[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CharacterTabs({characters, activeId, onSelect}: CharacterTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Герои кампании">
      {characters.map((character) => (
        <button
          aria-selected={character.id === activeId}
          className={`${styles.tab} ${character.id === activeId ? styles.active : ''}`}
          key={character.id}
          onClick={() => onSelect(character.id)}
          role="tab"
          type="button"
        >
          <img src={resolveAsset(character.visual.portrait)} alt="" />
          <span><strong>{character.name}</strong><small>{character.role}</small></span>
        </button>
      ))}
    </div>
  );
}
