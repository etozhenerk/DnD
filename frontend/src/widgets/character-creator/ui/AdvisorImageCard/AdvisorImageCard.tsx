import {useState} from 'react';
import type {AdvisorTurn} from '../../../../entities/character-advisor';
import type {AdvisorChatController} from '../../../../features/chat-with-advisor';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import {useAdvisorImage} from '../../model/useAdvisorImage';
import styles from './AdvisorImageCard.module.css';

export type AdvisorImageCardProps = {image: NonNullable<AdvisorTurn['image']>; chat: AdvisorChatController; media: CreatorMedia; disabled: boolean};

export function AdvisorImageCard({image, chat, media, disabled}: AdvisorImageCardProps) {
  const result = useAdvisorImage(chat, image.requestId);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const skills = (chat.context.formData?.abilities as {items?: {id: string}[]} | undefined)?.items ?? [];
  const hasTarget = image.kind === 'portrait' || skills.some((skill) => skill.id === image.target);
  return (
    <figure className={styles.card}>
      {result.url && <img className={image.kind === 'icon' ? styles.icon : styles.portrait} src={result.url}
        alt={image.kind === 'portrait' ? 'Предложенный портрет героя' : 'Предложенная иконка навыка'} />}
      {result.loading && <p role="status">Достаю иллюстрацию…</p>}
      {result.error && <button className={styles.action} type="button" onClick={() => void result.refresh()}>Загрузить иллюстрацию ещё раз</button>}
      {result.file && <figcaption>
        <button className={styles.action} type="button" disabled={disabled || adding || added || !hasTarget} onClick={async () => {
          setAdding(true);
          try { setAdded(await media.acceptAdvisorImage(image.kind, image.target, result.file!)); }
          finally { setAdding(false); }
        }}>{added ? 'Добавлено в анкету' : image.kind === 'portrait' ? 'Выбрать портрет' : 'Добавить к навыку'}</button>
        {!hasTarget && <small>Сначала примени набросок с этим навыком.</small>}
        <small role="status">{media.portraits.error || media.iconError}</small>
      </figcaption>}
    </figure>
  );
}
