import definition from '../../../../content/campaigns/penisuela-olva-quest.json';
import type {GallerySessionSnapshot} from './gallerySession';
export const olvaQuest = definition;
export type OlvaEvidence = (typeof definition.evidence[number] | typeof definition.gift.evidence) & {artwork?: string; artworkAlt?: string};
export type OlvaSide = 'stas' | 'middle' | 'polina';
export type OlvaVerdict = 'polina' | 'separate' | 'gift';
export const OLVA_VOTERS = ['bubsilda', 'linda', 'lambert', 'golovach-lena', 'thorin-pukoshchit'];
export const olvaFlag = (key: string) => `olva-table-${key}`;
export function canEnterOlvaConsultation(state: Pick<GallerySessionSnapshot, 'flags'>) {
  // Already opened tables from earlier saves remain playable.
  return Boolean(state.flags['olva-stas-recruited'] || state.flags['olva-table-opened'] || state.flags['olva-table-complete']);
}
export function getOlvaQuestView(state: Pick<GallerySessionSnapshot, 'flags' | 'inventory' | 'combat'>) {
  const has = (key: string) => Boolean(state.flags[olvaFlag(key)]);
  const complete = has('complete');
  const ending = definition.endings.find(e => has(`ending-${e.id}`)) ?? (has('ending-stas') ? definition.endings.find(e => e.id === 'polina') : undefined);
  const giftAvailable = state.inventory.includes(definition.gift.itemId);
  const giftOnTable = has('gift-offered') && (giftAvailable || (complete && ending?.id === 'gift'));
  const evidence: OlvaEvidence[] = [...definition.evidence, ...(giftOnTable ? [definition.gift.evidence] : [])];
  const placements = Object.fromEntries(evidence.map(e => [e.id,
    definition.sides.find(s => has(`place-${e.id}-${s.id}`))?.id ?? 'middle'])) as Record<string, OlvaSide>;
  const votes = Object.fromEntries(OLVA_VOTERS.map(id => [id,
    definition.endings.find(e => has(`vote-${id}-${e.id}`) && (e.id !== 'gift' || giftOnTable))?.id ?? (has(`vote-${id}-stas`) ? 'polina' : null)])) as Record<string, OlvaVerdict | null>;
  const counts = Object.fromEntries(definition.endings.map(e => [e.id, Object.values(votes).filter(v => v === e.id).length])) as Record<OlvaVerdict, number>;
  const voted = Object.values(votes).filter(Boolean).length;
  const highest = Math.max(...Object.values(counts));
  const leaders = definition.endings.filter(e => counts[e.id as OlvaVerdict] === highest);
  const winner = voted === OLVA_VOTERS.length && leaders.length === 1 ? leaders[0] : null;
  const readCount = evidence.filter(e => has(`read-${e.id}`)).length;
  return {has, evidence, giftIntroduction: has('gift-introduction') && giftOnTable && !complete && !has('voting'), complete, ending, giftAvailable, giftOnTable, placements, votes, counts, voted, winner, readCount,
    voting: has('voting'), canConfirm: Boolean(winner && has('voting') && !complete && !state.combat),
    rewardShown: complete && has('reward-shown'), rewardClaimed: complete && has('reward-claimed'),
    narration: complete && has('reward-shown')
      ? has('reward-claimed') ? definition.reward.presentation.receivedText : definition.reward.presentation.readAloud
      : complete && ending ? ending.readAloud : definition.intro};
}
export function canResolveOlvaVerdict(state: Pick<GallerySessionSnapshot, 'flags' | 'inventory' | 'combat'>, actionId: string) {
  const view = getOlvaQuestView(state);
  return view.canConfirm && actionId === `table-finish-${view.winner?.id}`;
}
