import {createPortal} from 'react-dom';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import {useAdvisorDialog} from '../../model/useAdvisorDialog';
import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import {AdvisorConversation} from '../AdvisorConversation';
import {AdvisorComposer} from '../AdvisorComposer';
import {AdvisorChatStatus} from '../AdvisorChatStatus';
import styles from './CreatorAdvisorDialog.module.css';

export type CreatorAdvisorDialogProps = {placeholder: string; onClose: () => void; chat: AdvisorChatController};

export function CreatorAdvisorDialog({placeholder, onClose, chat}: CreatorAdvisorDialogProps) {
  const modal = useAdvisorDialog(onClose);
  return createPortal(
    <dialog ref={modal.dialog} className={styles.dialog} aria-labelledby={modal.titleId}
      onClick={modal.closeOnBackdrop} onCancel={(event) => {event.preventDefault(); onClose();}}>
      <header className={styles.header}>
        <div id={modal.titleId}><FantasyHeading>Разговор с совой</FantasyHeading></div>
        <button className={styles.close} type="button" autoFocus aria-label="Закрыть чат" onClick={onClose}>×</button>
      </header>
      <AdvisorConversation chat={chat} />
      <AdvisorComposer chat={chat} placeholder={placeholder} />
      <AdvisorChatStatus chat={chat} />
    </dialog>,
    document.body,
  );
}
