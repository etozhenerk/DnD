import type {CreatorMedia} from '../../model/useCreatorMedia';
import type {AdvisorArtworkController} from '../../model/useAdvisorArtwork';
import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import type {AdvisorProposalController} from '../../model/useAdvisorProposal';
import {CreatorAdvisorDialog} from '../CreatorAdvisorDialog';
import {AdvisorTasks} from '../AdvisorTasks';
import styles from './CreatorAdvisorChat.module.css';

export type CreatorAdvisorChatProps = {
  placeholder: string; chat: AdvisorChatController; application: AdvisorProposalController; media: CreatorMedia; disabled: boolean;
  isOpen: boolean; onOpenChange: (open: boolean) => void;
  artwork: AdvisorArtworkController;
};

export function CreatorAdvisorChat({placeholder, chat, application, media, artwork, disabled, isOpen, onOpenChange}: CreatorAdvisorChatProps) {
  return (
    <>
      <button className={styles.open} type="button" aria-label="Поговорить с советником" aria-haspopup="dialog" disabled={disabled} onClick={() => onOpenChange(true)}>
        <span aria-hidden="true">✦</span>
        Открыть чат
      </button>
      <AdvisorTasks disabled={disabled || chat.pending} onChoose={(prompt) => {chat.setText(prompt); onOpenChange(true);}} />
      {isOpen && <CreatorAdvisorDialog placeholder={placeholder} chat={chat} application={application} media={media} artwork={artwork} disabled={disabled}
        onClose={() => {artwork.stop(); onOpenChange(false); chat.stopAnimation();}} />}
    </>
  );
}
