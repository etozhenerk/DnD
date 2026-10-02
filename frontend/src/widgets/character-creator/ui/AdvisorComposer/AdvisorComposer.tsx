import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import styles from './AdvisorComposer.module.css';

export type AdvisorComposerProps = {chat: AdvisorChatController; placeholder: string};

export function AdvisorComposer({chat, placeholder}: AdvisorComposerProps) {
  return (
    <div className={styles.composer}>
      <label>
        <span>Твоя реплика</span>
        <textarea placeholder={placeholder} value={chat.text} onChange={(event) => chat.setText(event.target.value)}
          disabled={!chat.available} readOnly={chat.pending} rows={3} maxLength={2000}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (chat.canSend) void chat.submit();
            }
          }} />
      </label>
      <button type="button" aria-label="Отправить реплику советнику" disabled={!chat.canSend || !chat.text.trim()}
        onClick={() => void chat.submit()}>↑</button>
    </div>
  );
}
