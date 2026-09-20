import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {CombatEffectView} from '../../../entities/combat/model/view';
import {getCombatEffectTransitions} from './combatEffectTransitions';

export const COMBAT_EFFECT_ANIMATION_MS = 1300;
export interface CombatEffectCue {key: number; effect: CombatEffectView}
interface EffectSubject {id: string; effects?: CombatEffectView[]}
interface EffectQueue {cues: CombatEffectCue[]; until: number}

/** One short application at a time per character. Restored effects and passive properties stay still. */
export function useCombatEffectFeedback(subjects: readonly EffectSubject[]) {
  const previous = useRef(new Map(subjects.map((subject) => [subject.id, subject.effects ?? []])));
  const serial = useRef(0);
  const [queues, setQueues] = useState<Record<string, EffectQueue>>({});
  useLayoutEffect(() => {
    const next = new Map(subjects.map((subject) => [subject.id, subject.effects ?? []]));
    const additions = subjects.flatMap((subject) => {
      const old = previous.current.get(subject.id);
      const changes = old ? getCombatEffectTransitions(old, subject.effects ?? []) : [];
      return changes.length ? [{id: subject.id, cues: changes.map(({effect}) => ({effect, key: ++serial.current}))}] : [];
    });
    previous.current = next;
    setQueues((current) => {
      const removed = Object.entries(current).some(([id, queue]) => !next.has(id)
        || queue.cues.some((cue) => !next.get(id)?.some((effect) => effect.id === cue.effect.id)));
      if (!additions.length && !removed) return current;
      const result: Record<string, EffectQueue> = Object.fromEntries(Object.entries(current).flatMap(([id, queue]) => {
        const cues = queue.cues.filter((cue) => next.get(id)?.some((effect) => effect.id === cue.effect.id));
        if (!cues.length) return [];
        return [[id, {cues, until: cues[0] === queue.cues[0] ? queue.until : Date.now() + COMBAT_EFFECT_ANIMATION_MS}]];
      }));
      additions.forEach(({id, cues}) => {
        result[id] = {cues: [...(result[id]?.cues ?? []), ...cues], until: result[id]?.until ?? Date.now() + COMBAT_EFFECT_ANIMATION_MS};
      });
      return result;
    });
  }, [subjects]);
  useEffect(() => {
    const deadlines = Object.values(queues).map((queue) => queue.until);
    if (!deadlines.length) return;
    const timer = setTimeout(() => setQueues((current) => {
      const now = Date.now();
      return Object.fromEntries(Object.entries(current).flatMap(([id, queue]) => {
        if (queue.until > now) return [[id, queue]];
        const cues = queue.cues.slice(1);
        return cues.length ? [[id, {cues, until: now + COMBAT_EFFECT_ANIMATION_MS}]] : [];
      }));
    }), Math.max(0, Math.min(...deadlines) - Date.now()));
    return () => clearTimeout(timer);
  }, [queues]);
  return {
    cueFor: (id: string) => queues[id]?.cues[0],
    visibleEffects: (id: string, effects: CombatEffectView[] = []) => effects.filter((effect) =>
      !queues[id]?.cues.some((cue) => cue.effect.id === effect.id)),
  };
}
