import {CharacterLibrary} from '../../../../widgets/character-library';
import {FantasyPage} from '../../../../shared/ui/FantasyPage';
import styles from './CharactersPage.module.css';

export function CharactersPage() {
  return (
    <FantasyPage>
      <header className={styles.header}>
        <p>Хроники Восьми Земель</p>
        <h1>Ваши новые герои</h1>
        <span>Каждое приключение начинается с персонажа. Соберите героя для своей следующей истории.</span>
      </header>
      <CharacterLibrary />
    </FantasyPage>
  );
}
