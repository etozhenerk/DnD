import {ActionButton} from '../../../../shared/ui/ActionButton';
import {useStartCharacter} from '../../model/useStartCharacter';
import styles from './StartCharacterButton.module.css';

export function StartCharacterButton() {
  const action = useStartCharacter();
  return (
    <div className={styles.action}>
      <ActionButton disabled={action.state.status === 'pending'} onClick={action.start}>
        {action.label}
      </ActionButton>
      {action.state.status === 'error' && <p role="alert">{action.state.message}</p>}
    </div>
  );
}
