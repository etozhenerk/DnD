import {CharacterLibrary} from '../../../../widgets/character-library';
import {FantasyPage} from '../../../../shared/ui/FantasyPage';
import styles from './CharactersPage.module.css';

export function CharactersPage() {
  return (
    <FantasyPage animated>
      <header className={styles.header}>
        <p>Хроники Восьми Земель</p>
        <h1>Персонажи</h1>
        <span>Готовые герои и начало вашей новой истории.</span>
      </header>
      <CharacterLibrary />
    </FantasyPage>
  );
}
