import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import {getAdvisorSuggestionTarget} from '../../model/advisor-target';
import type {AdvisorArtworkController} from '../../model/useAdvisorArtwork';
import styles from './AdvisorTools.module.css';

export type AdvisorToolsProps = {chat: AdvisorChatController; artwork: AdvisorArtworkController; disabled: boolean};

export function AdvisorTools({chat, artwork: art, disabled}: AdvisorToolsProps) {
  const target = getAdvisorSuggestionTarget(chat.context.stepId);
  const skills = chat.imageTargets;
  const skill = skills.find((item) => item.id === chat.imageTargetId) ?? skills[0];
  const blocked = disabled || !chat.canSend || art.busy;
  return (
    <div className={styles.tools}>
      {chat.canFill && <>
        {target !== 'full' && <button className={styles.action} type="button" disabled={blocked} onClick={() => void chat.suggest(target)}>Придумать для этого этапа</button>}
        <button className={styles.action} type="button" disabled={blocked} onClick={() => void chat.fill()}>✦ Собрать всего героя</button>
      </>}
      {chat.canImages && <>
        <button className={styles.action} type="button" disabled={blocked} onClick={() => void chat.generate('portrait', chat.text || 'Портрет героя по текущей анкете.')}>Нарисовать портрет</button>
        {!!skills.length && <><label>Иконка навыка<select value={skill?.id ?? ''} disabled={blocked} onChange={(event) => chat.setImageTargetId(event.target.value)}>
          {skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label><button className={styles.action} type="button" disabled={blocked || !skill} onClick={() => void chat.generate('icon', chat.text || skill!.name + '. ' + skill!.description, skill?.id)}>Нарисовать иконку</button></>}
        {chat.canFill && <button className={styles.action} type="button" disabled={blocked} onClick={() => void art.create()}>Герой с портретом и иконками</button>}
      </>}
      {art.busy && <><p role="status">{art.progress}</p><button className={styles.action} type="button" onClick={art.stop}>Остановиться после текущего шага</button></>}
      {art.bundle && !art.busy && <><small>Набросок и {art.bundle.images.length} иллюстрации — в чате. Применение заменит поля анкеты и выберет новый портрет.</small>
        <button className={styles.action} type="button" disabled={disabled || chat.pending || art.applied} onClick={() => void art.apply()}>{art.applied ? 'Добавлено в анкету' : 'Применить набросок и иллюстрации'}</button></>}
      {art.error && <p role="status">{art.error}</p>}
      <small>Напиши пожелания в поле сообщения. Я покажу варианты до применения.</small>
    </div>
  );
}
