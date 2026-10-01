import {Link} from 'react-router-dom';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import styles from './StartCharacterButton.module.css';

export function StartCharacterButton() {
  const viewTransition = useViewTransitions();
  return (
    <Link className={styles.action} to="/characters/new/appearance" viewTransition={viewTransition}>Создать персонажа</Link>
  );
}
