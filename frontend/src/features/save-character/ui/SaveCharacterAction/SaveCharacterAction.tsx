import {Link} from 'react-router-dom';
import {ActionButton} from '../../../../shared/ui/ActionButton';
import type {SaveCharacterController} from '../../model/useSaveCharacter';
import styles from './SaveCharacterAction.module.css';

export type SaveCharacterActionProps = {controller: SaveCharacterController};

export function SaveCharacterAction({controller}: SaveCharacterActionProps) {
  return (
    <div className={styles.action} aria-busy={controller.isPending}>
      {controller.error && <div className={styles.error} role="alert">
        <p>{controller.error}</p>
        {controller.issues.length > 0 && <ul>{controller.issues.map((issue, index) => (
          <li key={issue.path + index}><Link to={'/characters/new/' + issue.step}>{issue.message}</Link></li>
        ))}</ul>}
      </div>}
      <ActionButton disabled={!controller.canSave || controller.isPending}
        onClick={() => {void controller.save();}}>
        {controller.isPending ? 'Сохраняем героя…' : 'Создать героя'}
      </ActionButton>
      <small aria-live="polite">{controller.isPending ? 'Готовим изображения и сохраняем персонажа.' : 'Герой появится в общем списке с выбранным портретом и иконками навыков.'}</small>
    </div>
  );
}
