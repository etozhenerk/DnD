import {Link, useParams} from 'react-router-dom';
import {CreatedCharacterDetails} from '../../../../widgets/created-character';
import {FantasyPage} from '../../../../shared/ui/FantasyPage';
import styles from './CharacterDetailsPage.module.css';

export function CharacterDetailsPage() {
  const {characterId = ''} = useParams();
  return (
    <FantasyPage>
      <Link className={styles.back} to="/characters">← Все персонажи</Link>
      <CreatedCharacterDetails id={characterId} />
    </FantasyPage>
  );
}
