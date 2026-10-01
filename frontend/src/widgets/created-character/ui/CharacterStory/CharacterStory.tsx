import type {CreatedCharacter} from '../../../../entities/character';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import styles from './CharacterStory.module.css';

export type CharacterStoryProps = {character: CreatedCharacter};

export function CharacterStory({character}: CharacterStoryProps) {
  return (
    <SceneTextPanel className={styles.story} collapsible={false} resetKey={character.id}>
      <FantasyHeading>Образ героя</FantasyHeading>
      {character.story && <p>{character.story}</p>}
      {character.appearance && <><h3>Внешность</h3><p>{character.appearance}</p></>}
      {character.motivation && <><h3>Мотивация</h3><p>{character.motivation}</p></>}
      {character.personality.length > 0 && <><h3>Характер</h3><p>{character.personality.join(' · ')}</p></>}
      {!character.story && !character.appearance && !character.motivation && character.personality.length === 0 && <p>Описание пока не задано.</p>}
    </SceneTextPanel>
  );
}
