import {createPortal} from 'react-dom';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import {AdvisorOwl, useAdvisorMood} from '../../../../entities/character-advisor';
import {advisorOwl} from '../../config/creator-art';
import {useAdvisorDialog} from '../../model/useAdvisorDialog';
import type {AdvisorProposalController} from '../../model/useAdvisorProposal';
import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import {AdvisorConversation} from '../AdvisorConversation';
import {AdvisorComposer} from '../AdvisorComposer';
import {AdvisorChatStatus} from '../AdvisorChatStatus';
import {AdvisorLimit} from '../AdvisorLimit';
import {AdvisorTools} from '../AdvisorTools';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import type {AdvisorArtworkController} from '../../model/useAdvisorArtwork';
import styles from './CreatorAdvisorDialog.module.css';

export type CreatorAdvisorDialogProps = {
  placeholder: string; onClose: () => void; chat: AdvisorChatController;
  application: AdvisorProposalController; media: CreatorMedia; disabled: boolean;
  artwork: AdvisorArtworkController;
};

export function CreatorAdvisorDialog({placeholder, onClose, chat, application, media, artwork, disabled}: CreatorAdvisorDialogProps) {
  const modal = useAdvisorDialog(onClose);
  const mood = useAdvisorMood(chat.pending, chat.error, chat.latestReplyId, application.appliedId);
  return createPortal(
    <dialog ref={modal.dialog} className={styles.dialog} aria-labelledby={modal.titleId}
      onClick={modal.closeOnBackdrop} onCancel={(event) => {event.preventDefault(); onClose();}}>
      <header className={styles.header}>
        <div id={modal.titleId}><FantasyHeading>Советник</FantasyHeading></div>
        <button className={styles.close} type="button" autoFocus aria-label="Закрыть чат" onClick={onClose}>×</button>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.companion} aria-label="Твой советник">
          <div className={styles.art}><AdvisorOwl image={advisorOwl} mood={mood} /></div>
          <p>{chat.pending ? 'Перебираю идеи…' : 'Устроим герою интересную жизнь?'}</p>
          <AdvisorLimit session={chat.session} />
          <AdvisorTools chat={chat} artwork={artwork} disabled={disabled} />
        </aside>
        <div className={styles.conversation}>
          <AdvisorConversation chat={chat} application={application} media={media} disabled={disabled} />
          <AdvisorComposer chat={chat} placeholder={placeholder} />
          <AdvisorChatStatus chat={chat} />
        </div>
      </div>
    </dialog>, document.body,
  );
}
