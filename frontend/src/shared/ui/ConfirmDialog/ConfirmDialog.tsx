import {ActionButton} from '../ActionButton';
import {useConfirmDialog} from './model/useConfirmDialog';
import styles from './ConfirmDialog.module.css';

export type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({title, description, confirmLabel, onConfirm, onCancel}: ConfirmDialogProps) {
  const modal = useConfirmDialog();
  return (
    <dialog ref={modal.dialog} className={styles.dialog} aria-labelledby={modal.titleId}
      aria-describedby={modal.descriptionId} onCancel={(event) => {event.preventDefault(); onCancel();}}>
      <h2 id={modal.titleId}>{title}</h2>
      <p id={modal.descriptionId}>{description}</p>
      <div className={styles.actions}>
        <ActionButton tone="secondary" autoFocus onClick={onCancel}>Отмена</ActionButton>
        <ActionButton onClick={onConfirm}>{confirmLabel}</ActionButton>
      </div>
    </dialog>
  );
}
