import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import type {GalleryEvent, GallerySessionSnapshot} from '../../../entities/campaign-session/model/gallerySession';
import {getLastUndoableCommandId} from '../../../entities/campaign-session/model/gallerySession';
import type {CombatHeroSource} from '../../../entities/combat/model/types';
import {createClearCombatCommand, createStartCombatCommand} from '../../run-combat/model/combatCommands';

type WithoutMeta<T> = T extends unknown ? Omit<T, 'id' | 'commandId'> : never;
export type BossSequenceCommand = 'start' | 'first-victory' | 'start-transformation' | 'video-ended' | 'finish' | 'death-video-ended' | 'defeat';

export function getBossUndoScope(events: GalleryEvent[], sceneId: string) {
  const commandId = getLastUndoableCommandId(events);
  const lastEvent = [...events].reverse().find((event) => event.commandId === commandId);
  return lastEvent?.type === 'combat-started' && lastEvent.sceneScopeId === 'andrey-villa-breach'
    ? 'andrey-villa-breach' : sceneId;
}

export function createBossSequenceEvents(
  definition: GalleryGameplayDefinition,
  state: GallerySessionSnapshot,
  heroes: CombatHeroSource[],
  command: BossSequenceCommand,
  roll?: (sides: number) => number,
): WithoutMeta<GalleryEvent>[] {
  const sequence = definition.bossSequence;
  if (!sequence) return [];
  if (command === 'defeat') {
    const defeat = sequence.defeat;
    const combat = state.combat;
    const legacyDefeat = Boolean(state.flags['andrey-defeat-fallback']);
    if (!defeat || state.selectedEnding === defeat.endingId || state.flags['andrey-boss-defeated']) return [];
    if (combat && (![sequence.firstEncounterId, sequence.secondEncounterId].includes(combat.encounterId)
      || combat.pendingAttack || combat.pendingSavingThrow)) return [];
    if (!legacyDefeat && (!combat || !heroes.length || heroes.some((hero) => (state.heroHp[hero.id] ?? hero.hp) > 0)
      || (combat.enemies[combat.encounterId]?.hp ?? 0) <= 0)) return [];
    return [
      ...heroes.filter((hero) => (state.heroHp[hero.id] ?? hero.hp) <= 0).map((hero) => ({
        type: 'healing-applied' as const, targetId: hero.id, amount: 1, maxHp: hero.maxHp,
        text: `${hero.name} приходит в себя у разрушенной виллы с 1 HP.`,
      })),
      ...(combat ? [
        {type: 'combat-ended' as const, text: defeat.resolution},
        {type: 'combat-cleared' as const, encounterId: combat.encounterId},
        {type: 'flag-changed' as const, flag: `combat-defeat-fallback-${combat.encounterId}`, value: true},
      ] : []),
      ...['andrey-defeat-fallback', 'andrey-bad-ending', 'andrey-hostages-captured', 'final-outcome-selected'].map((flag) => ({type: 'flag-changed' as const, flag, value: true})),
      {type: 'ending-selected', endingId: defeat.endingId},
      {type: 'view-changed', view: 'gallery'},
    ];
  }
  if (state.flags['andrey-defeat-fallback'] || state.flags['andrey-bad-ending']) return [];
  const first = definition.encounters.find((item) => item.id === sequence.firstEncounterId);
  const second = definition.encounters.find((item) => item.id === sequence.secondEncounterId);
  if (!first || !second) return [];
  const flag = (name: string): WithoutMeta<GalleryEvent> => ({type: 'flag-changed', flag: name, value: true});
  if (command === 'death-video-ended') {
    if (!sequence.aftermath || state.combat || !state.flags['andrey-boss-defeated'] || state.flags['andrey-death-video-finished']) return [];
    return [flag('andrey-death-video-finished'), {type: 'flag-changed', flag: 'andrey-hostages-captured', value: false}];
  }
  const livingHeroes = heroes.filter((hero) => (state.heroHp[hero.id] ?? 0) > 0);
  if (!livingHeroes.length) return [];
  if (command === 'start') {
    if (state.combat || state.flags['andrey-phase-one-defeated'] || state.flags['andrey-boss-defeated']) return [];
    return [createStartCombatCommand(first, heroes, roll)];
  }
  if (command === 'video-ended') {
    if (state.combat || !state.flags['andrey-phase-one-defeated'] || state.flags['andrey-transformation-finished']
      || (sequence.intermission && !state.flags['andrey-transformation-started'])) return [];
    return [flag('andrey-transformation-finished'), createStartCombatCommand(second, heroes, roll)];
  }
  if (command === 'start-transformation') {
    if (!sequence.intermission || state.combat || !state.flags['andrey-phase-one-defeated']
      || state.flags['andrey-transformation-started'] || state.flags['andrey-transformation-finished']) return [];
    return [flag('andrey-transformation-started'), ...(sequence.transformationVideo.source
      ? [] : [flag('andrey-transformation-finished'), createStartCombatCommand(second, heroes, roll)])];
  }
  const combat = state.combat;
  const expectedId = command === 'first-victory' ? first.id : second.id;
  if (!combat || combat.encounterId !== expectedId || state.flags[`combat-defeat-fallback-${expectedId}`]) return [];
  const clear = createClearCombatCommand(combat);
  if (!clear) return [];
  if (command === 'finish') return [clear, flag('andrey-boss-defeated'), {type: 'view-changed', view: 'gallery'},
    ...(sequence.aftermath && !sequence.aftermath.deathVideo.source
      ? [flag('andrey-death-video-finished'), {type: 'flag-changed' as const, flag: 'andrey-hostages-captured', value: false}] : [])];
  if (state.flags['andrey-phase-one-defeated']) return [];
  return [clear, flag('andrey-phase-one-defeated'), ...(sequence.intermission || sequence.transformationVideo.source
    ? [{type: 'view-changed' as const, view: 'gallery' as const}]
    : [flag('andrey-transformation-finished'), createStartCombatCommand(second, heroes, roll)])];
}
