import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import styles from './AdvisorChatStatus.module.css';

export type AdvisorChatStatusProps = {chat: AdvisorChatController};

export function AdvisorChatStatus({chat}: AdvisorChatStatusProps) {
  return (
    <div className={styles.status}>
      {!chat.available && <p>{chat.availabilityError ? 'Не удалось связаться с библиотекой совы.' : 'Сова обустраивает библиотеку — диалог скоро заработает.'}</p>}
      {chat.error && <p role="alert">{chat.error}</p>}
      {chat.session && <small>Учтено {(chat.session.accountedMicroRub / 1000000).toFixed(2)} ₽ из 200 ₽, включая резерв</small>}
      {chat.session && <button type="button" disabled={chat.pending} onClick={chat.refresh}>Проверить ответ</button>}
      {chat.canRetry && <button type="button" onClick={() => void chat.retry()}>Повторить эту отправку</button>}
    </div>
  );
}
