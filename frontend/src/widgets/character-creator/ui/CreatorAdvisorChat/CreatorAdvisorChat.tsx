import {useState} from 'react';
import {useAdvisorChat} from '../../../../features/chat-with-advisor';
import type {AdvisorContext} from '../../../../entities/character-advisor';
import {CreatorAdvisorDialog} from '../CreatorAdvisorDialog';
import styles from './CreatorAdvisorChat.module.css';

export type CreatorAdvisorChatProps = {placeholder: string; context: AdvisorContext};

export function CreatorAdvisorChat({placeholder, context}: CreatorAdvisorChatProps) {
  const [isOpen, setOpen] = useState(false);
  const chat = useAdvisorChat(context);
  return (
    <>
      <button className={styles.open} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span aria-hidden="true">✦</span>
        Поговорить с совой
      </button>
      {isOpen && <CreatorAdvisorDialog placeholder={placeholder} chat={chat}
        onClose={() => {setOpen(false); chat.stopAnimation();}} />}
    </>
  );
}
