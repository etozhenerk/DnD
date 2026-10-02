import {useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {AdvisorTurn} from '../../../entities/character-advisor';
import type {AdvisorChatController} from '../../../features/chat-with-advisor';
import type {AdvisorProposalController} from './useAdvisorProposal';
import type {CreatorMedia} from './useCreatorMedia';
import {getAdvisorContext} from './advisor-context';

export function useAdvisorArtwork(chat: AdvisorChatController, application: AdvisorProposalController, media: CreatorMedia) {
  const cache = useQueryClient();
  const stop = useRef(false);
  const locked = useRef(false);
  const alive = useRef(true);
  const [progress, setProgress] = useState('');
  const [bundle, setBundle] = useState<{turn: AdvisorTurn; images: AdvisorTurn[]} | null>(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; stop.current = true; };
  }, []);

  async function create() {
    if (locked.current || !chat.canSend) return;
    locked.current = true;
    stop.current = false;
    setError(''); setBundle(null); setApplied(false); setProgress('Собираю образ героя…');
    try {
      const session = await chat.fill();
      const turn = session?.turns.at(-1);
      if (!turn?.proposal || stop.current) return;
      const snapshot = getAdvisorContext(chat.context.stepId, turn.proposal.formData);
      const jobs = [{kind: 'portrait' as const, prompt: 'Портрет героя по предложенной внешности.', target: undefined as string | undefined},
        ...turn.proposal.formData.abilities.items.map((skill) => ({kind: 'icon' as const, prompt: skill.name + '. ' + skill.description, target: skill.id}))];
      const images: AdvisorTurn[] = [];
      for (const [index, job] of jobs.entries()) {
        if (stop.current) break;
        setProgress('Рисую иллюстрации: ' + (index + 1) + ' из ' + jobs.length + '…');
        const result = await chat.generate(job.kind, job.prompt, job.target, snapshot);
        const image = result?.turns.at(-1);
        if (!image?.image) break;
        images.push(image);
      }
      if (alive.current) setBundle({turn, images});
    } finally {
      locked.current = false;
      if (alive.current) setProgress('');
    }
  }

  async function apply() {
    if (!bundle?.turn.proposal || locked.current) return;
    locked.current = true; setProgress('Добавляю набросок в анкету…'); setError('');
    try {
      const files = await Promise.all(bundle.images.map(async (turn) => ({turn, file: await cache.fetchQuery(chat.imageOptions(turn.requestId))})));
      if (!alive.current) return;
      application.apply(bundle.turn.requestId, bundle.turn.proposal);
      for (const {turn, file} of files) {
        if (!await media.acceptAdvisorImage(turn.image!.kind, turn.image!.target, file)) throw new Error('Image not accepted');
      }
      if (alive.current) setApplied(true);
    } catch { if (alive.current) setError('Не все иллюстрации добавились. Проверь лимит портретов и попробуй снова; варианты остаются в чате.'); }
    finally { locked.current = false; if (alive.current) setProgress(''); }
  }
  return {create, apply, progress, error, applied, bundle, busy: !!progress, stop: () => {stop.current = true;}};
}

export type AdvisorArtworkController = ReturnType<typeof useAdvisorArtwork>;
