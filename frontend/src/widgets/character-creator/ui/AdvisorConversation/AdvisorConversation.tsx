import {AdvisorProposalCard} from '../AdvisorProposalCard';
import {AdvisorExamples} from '../AdvisorExamples';
import {AdvisorImageCard} from '../AdvisorImageCard';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import type {AdvisorProposalController} from '../../model/useAdvisorProposal';
import {AdvisorReply} from '../../../../entities/character-advisor';
import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import {useAdvisorHistoryScroll} from '../../model/useAdvisorHistoryScroll';
import styles from './AdvisorConversation.module.css';

export type AdvisorConversationProps = {chat: AdvisorChatController; application: AdvisorProposalController; media: CreatorMedia; disabled: boolean};

export function AdvisorConversation({chat, application, media, disabled}: AdvisorConversationProps) {
  const scroll = useAdvisorHistoryScroll();
  return (
    <div ref={scroll.viewport} onScroll={scroll.onScroll} onPointerDown={scroll.pause} onKeyDown={scroll.pause} className={styles.history} role="log" aria-label="Диалог с советником">
      <div ref={scroll.content} className={styles.content}>
        {!chat.turns.length && !chat.pendingMessage && (
          <div className={styles.empty}><span aria-hidden="true">✦</span><p>Есть идея? Неси сюда!</p>
            <AdvisorExamples title="Можно начать так:" disabled={disabled || chat.pending} onSelect={chat.setText} /></div>
        )}
        {chat.turns.map((turn) => (
          <div className={styles.turn} key={turn.requestId}>
            {turn.mode !== 'comment' && <div className={styles.player}><span>Ты</span><p>{turn.message}</p></div>}
            <div className={styles.owl}><span>Советник</span>
              {turn.status === 'succeeded' && <AdvisorReply text={turn.reply} animate={chat.latestReplyId === turn.requestId} />}
              {turn.proposal && <AdvisorProposalCard proposal={turn.proposal} requestId={turn.requestId}
                application={application} disabled={disabled || chat.pending} />}
              {turn.image && <AdvisorImageCard image={turn.image} chat={chat} media={media} disabled={disabled} />}
              {turn.status === 'reserved' && <p className={styles.thinking}>Шуршу страницами…</p>}
              {turn.status === 'uncertain' && <p>Ответ затерялся по дороге. Проверим, успел ли он добраться.</p>}
            </div>
          </div>
        ))}
        {chat.pendingMessage && chat.pendingMessage.mode !== 'comment' && <div className={styles.player}><span>Ты</span><p>{chat.pendingMessage.message}</p></div>}
        {chat.pending && !chat.turns.some((turn) => turn.status === 'reserved') && (
          <p className={styles.thinking} role="status">Советник перебирает идеи…</p>
        )}
      </div>
    </div>
  );
}
