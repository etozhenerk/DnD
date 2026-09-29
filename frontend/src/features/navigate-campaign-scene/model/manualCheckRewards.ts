import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import {applyGalleryEvent, replayGalleryEvents, type GalleryEvent} from '../../../entities/campaign-session/model/gallerySession';

export interface ManualCheckRewardNotice {id: string; text: string}

const isPrefix = (prefix: GalleryEvent[], events: GalleryEvent[]) =>
  prefix.length <= events.length && prefix.every((event, index) => event.id === events[index].id);

/** Presentation only: observe live additions, never award coins by replaying a saved game. */
export function createManualCheckRewardObserver(initialEvents: GalleryEvent[], definition: GalleryGameplayDefinition) {
  let previous = initialEvents;
  const presented = new Set<string>();

  return (events: GalleryEvent[]) => {
    const sessionChanged = previous[0]?.id !== events[0]?.id;
    const notices: ManualCheckRewardNotice[] = [];
    if (sessionChanged) presented.clear();
    // A repeated/stale effect must not move the observation cursor backwards.
    if (!sessionChanged && isPrefix(events, previous)) return {sessionChanged, notices};
    const additions = !sessionChanged && previous.length && isPrefix(previous, events)
      ? events.slice(previous.length) : [];
    const reward = definition.manualCheckReward;
    if (reward && additions.length && !additions.some(event => event.type === 'action-corrected' || event.type === 'scene-checkpoint-restored')) {
      let state = replayGalleryEvents(previous, definition);
      for (const event of additions) {
        let text: string | undefined;
        if (!state.combat && event.type === 'roll-entered') {
          const {result} = event;
          if (!result.automatic && result.success && Math.max(...result.rolls) === 20) text = reward.criticalSuccessText;
        }
        if (!state.combat && event.type === 'flag-changed' && event.value && !state.flags[event.flag]) {
          text = reward.questRewards.find(quest => quest.flag === event.flag)?.text;
        }
        if (text && !presented.has(event.id)) {
          notices.push({id: event.id, text});
          presented.add(event.id);
        }
        state = applyGalleryEvent(state, event, definition);
      }
    }
    previous = events;
    return {sessionChanged, notices};
  };
}
