import type {AdvisorInput, AdvisorTurn} from '../../../entities/character-advisor';

export function isAdvisorPlayerMessage(turn: Pick<AdvisorInput, 'requestId' | 'mode'>, turns: readonly AdvisorTurn[], typedIds: ReadonlySet<string>): boolean {
  if (turn.mode === 'comment' || turns.some((parent) => parent.action?.requestId === turn.requestId)) return false;
  return turn.mode === 'chat' || typedIds.has(turn.requestId);
}
