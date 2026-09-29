import {getLastUndoableCommandId, type GalleryEvent} from '../../../entities/campaign-session/model/gallerySession';
import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';

/** Scene transitions are independent commands, ordered alongside item pickups and decisions. */
export function createSceneNavigationEvent(fromPath: string, toPath: string, events: GalleryEvent[] = [], definition?: GalleryGameplayDefinition): GalleryEvent | null {
  if (fromPath === toPath) return null;
  const id = `navigate-${crypto.randomUUID()}`;
  const previous = events.at(-1);
  const sourceSceneId = fromPath.split('/').at(-1)?.split('?')[0];
  const targetSceneId = toPath.split('/').at(-1)?.split('?')[0];
  const commandEvents = previous && previous.type !== 'action-corrected' && previous.type !== 'scene-checkpoint-restored'
    ? events.filter((event) => event.commandId === previous.commandId) : [];
  const transitionAction = commandEvents.find((event) =>
    event.type === 'story-action-resolved' && (event.sceneId === sourceSceneId || event.sceneScopeId === sourceSceneId)
    && definition?.storyScenes.find((scene) => scene.id === event.sceneId)?.actions.some((action) => {
      const nextSceneId = event.result === 'failure' && action.kind === 'check'
        ? action.failureNextSceneId ?? action.nextSceneId : action.nextSceneId;
      return action.id === event.actionId && nextSceneId === targetSceneId && nextSceneId !== sourceSceneId;
    }));
  // A transition button and its effects form one step, not an extra invisible undo.
  const manualTransition = commandEvents.find((event) => event.type === 'manual-adjustment'
    && event.adjustment.kind === 'scene' && event.adjustment.previousSceneId === sourceSceneId
    && event.adjustment.sceneId === targetSceneId);
  const boss = definition?.bossSequence;
  const bossTransition = sourceSceneId === boss?.sceneId ? commandEvents.find((event) =>
    event.type === 'flag-changed' && event.value && (
      (event.flag === 'andrey-death-video-finished' && targetSceneId === boss?.aftermath?.returnSceneId)
      || (event.flag === 'andrey-bad-ending' && targetSceneId === boss?.defeat?.returnSceneId))) : undefined;
  const action = transitionAction || manualTransition || bossTransition;
  const commandId = action?.commandId ?? id;
  return {id, commandId, sceneScopeId: action?.sceneScopeId, type: 'scene-navigated', fromPath, toPath};
}

export function getLastCampaignStep(events: GalleryEvent[]) {
  const commandId = getLastUndoableCommandId(events);
  return commandId ? events.find((event) => event.commandId === commandId && event.type === 'scene-navigated')
    ?? events.find((event) => event.commandId === commandId) : undefined;
}

export function createStepCorrection(event: GalleryEvent): GalleryEvent {
  const id = `undo-${crypto.randomUUID()}`;
  return {id, commandId: id, type: 'action-corrected', correctedCommandId: event.commandId};
}
