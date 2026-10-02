import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import styles from './AdvisorChatStatus.module.css';

export type AdvisorChatStatusProps = {chat: AdvisorChatController};

export function AdvisorChatStatus({chat}: AdvisorChatStatusProps) {
  return (
    <div className={styles.status}>
      {!chat.available && <p>{chat.availabilityError ? 'Советник пока не на связи. Попробуй чуть позже.' : 'Советник готовится к разговору…'}</p>}
      {chat.error && <p role="alert">{chat.error}</p>}
      {chat.error && chat.session && <button type="button" disabled={chat.pending} onClick={chat.refresh}>Проверить ответ</button>}
      {chat.canRetry && <button type="button" onClick={() => void chat.retry()}>Повторить эту отправку</button>}
    </div>
  );
}
