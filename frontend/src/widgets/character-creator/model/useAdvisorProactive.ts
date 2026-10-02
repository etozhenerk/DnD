import {useEffect, useRef, useState} from 'react';
import type {AdvisorChatController} from '../../../features/chat-with-advisor';

export function useAdvisorProactive(chat: AdvisorChatController, paused: boolean) {
  const choice = JSON.stringify([chat.context.name, chat.context.raceId, chat.context.classId]);
  const key = chat.context.stepId + choice;
  const [note, setNote] = useState<{key: string; text: string} | null>(null);
  const current = useRef({chat, key});
  const seen = useRef(new Set<string>());
  const lastAt = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {alive.current = false;};
  }, []);
  useEffect(() => {current.current = {chat, key};}, [chat, key]);
  const eligible = chat.canComment && chat.canSend && !paused && seen.current.size < 6;
  const hasChoice = chat.context.name.trim().length >= 2 || !!chat.context.raceId || !!chat.context.classId;
  useEffect(() => {
    if (!eligible || !hasChoice || seen.current.has(choice)) return;
    const timer = window.setTimeout(async () => {
      const {chat: controller, key: requested} = current.current;
      if (requested !== key || !controller.canSend) return;
      seen.current.add(choice);
      lastAt.current = Date.now();
      const session = await controller.comment(controller.context);
      const turn = session?.turns.filter((item) => item.mode === 'comment' && item.status === 'succeeded').at(-1);
      if (turn && alive.current && current.current.key === key) setNote({key, text: turn.reply});
    }, Math.max(1800, 30000 - (Date.now() - lastAt.current)));
    return () => window.clearTimeout(timer);
  }, [key, choice, eligible, hasChoice]);
  return note?.key === key ? note.text : undefined;
}
