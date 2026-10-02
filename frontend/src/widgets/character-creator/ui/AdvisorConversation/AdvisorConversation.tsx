import {AdvisorReply} from '../../../../entities/character-advisor';
import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import {useAdvisorHistoryScroll} from '../../model/useAdvisorHistoryScroll';
import styles from './AdvisorConversation.module.css';

export type AdvisorConversationProps = {chat: AdvisorChatController};

export function AdvisorConversation({chat}: AdvisorConversationProps) {
  const scroll = useAdvisorHistoryScroll();
  return (
    <div ref={scroll.viewport} onScroll={scroll.onScroll} className={styles.history} role="log" aria-label="Диалог с советником">
      <div ref={scroll.content} className={styles.content}>
        {!chat.turns.length && !chat.pendingMessage && (
          <div className={styles.empty}><span aria-hidden="true">✦</span><p>Есть идея? Неси сюда!</p>
            <small>Имена, навыки, странные задумки — всё обсудим.</small></div>
        )}
        {chat.turns.map((turn) => (
          <div className={styles.turn} key={turn.requestId}>
            <div className={styles.player}><span>Ты</span><p>{turn.message}</p></div>
            <div className={styles.owl}><span>Сова</span>
              {turn.status === 'succeeded' && <AdvisorReply text={turn.reply} animate={chat.latestReplyId === turn.requestId} />}
              {turn.status === 'reserved' && <p className={styles.thinking}>Шуршу страницами…</p>}
              {turn.status === 'uncertain' && <p>Ответ затерялся по дороге. Резерв сохранён до проверки.</p>}
            </div>
          </div>
        ))}
        {chat.pendingMessage && <div className={styles.player}><span>Ты</span><p>{chat.pendingMessage.message}</p></div>}
        {chat.pending && !chat.turns.some((turn) => turn.status === 'reserved') && (
          <p className={styles.thinking} role="status">Сова собирается с мыслями…</p>
        )}
      </div>
    </div>
  );
}
