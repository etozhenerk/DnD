import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ActionButton} from '../../../../shared/ui/ActionButton';
import {ConfirmDialog} from '../../../../shared/ui/ConfirmDialog';
import type {SaveCharacterController} from '../../model/useSaveCharacter';
import styles from './SaveCharacterAction.module.css';

export type SaveCharacterActionProps = {controller: SaveCharacterController; hasLocalMedia: boolean};

export function SaveCharacterAction({controller, hasLocalMedia}: SaveCharacterActionProps) {
  const [confirmMedia, setConfirmMedia] = useState(false);
  return (
    <div className={styles.action} aria-busy={controller.isPending}>
      {controller.error && <div className={styles.error} role="alert">
        <p>{controller.error}</p>
        {controller.issues.length > 0 && <ul>{controller.issues.map((issue, index) => (
          <li key={issue.path + index}><Link to={'/characters/new/' + issue.step}>{issue.message}</Link></li>
        ))}</ul>}
      </div>}
      <ActionButton disabled={!controller.canSave || controller.isPending}
        onClick={() => {if (hasLocalMedia) setConfirmMedia(true); else void controller.save();}}>
        {controller.isPending ? 'Сохраняем героя…' : 'Создать героя'}
      </ActionButton>
      <small aria-live="polite">{controller.isPending ? 'Проверяем анкету и сохраняем персонажа.' : 'Герой появится в общем списке персонажей. Портрет и иконки пока доступны только в предпросмотре.'}</small>
      {confirmMedia && <ConfirmDialog title="Сохранить героя без изображений?"
        description="Облачная загрузка ещё не подключена. Анкета и навыки сохранятся, а в карточке будет портрет путешественника в капюшоне."
        confirmLabel="Сохранить без изображений" onCancel={() => setConfirmMedia(false)}
        onConfirm={() => {setConfirmMedia(false); void controller.save();}} />}
    </div>
  );
}
