import {Link, useParams} from 'react-router-dom';
import {CreatedCharacterDetails} from '../../../../widgets/created-character';
import {FantasyPage} from '../../../../shared/ui/FantasyPage';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import styles from './CharacterDetailsPage.module.css';

export function CharacterDetailsPage() {
  const {characterId = ''} = useParams();
  const viewTransition = useViewTransitions();
  return (
    <FantasyPage animated>
      <Link className={styles.back} to="/characters" viewTransition={viewTransition}>← Все персонажи</Link>
      <CreatedCharacterDetails id={characterId} />
    </FantasyPage>
  );
}
