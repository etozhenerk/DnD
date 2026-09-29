import type {DialogueBankDefinition} from './dialoguePresets';
import type {GalleryGameplayDefinition} from './galleryGameplay';
import type {CampaignSessionPreview} from './types';

/** Presentation-only projection. The complete source and event journal remain intact. */
export function createPlayableCampaign(preview: CampaignSessionPreview, gameplay: GalleryGameplayDefinition, dialogue: DialogueBankDefinition) {
  const truth = gameplay.storyTruth;
  if (!truth) return {preview, gameplay, dialogue};
  const activeIds = new Set([...truth.currentRouteSceneIds, ...(truth.optionalSceneIds ?? []), ...truth.badEndingSceneIds, ...Object.keys(truth.compatibilityAliases)]);
  const dialogueSceneIds = new Set([...activeIds, 'tavern-invitation']);
  const retiredCharacters = new Set(truth.retiredDialogueCharacterIds);
  const retiredPresets = new Set(truth.retiredDialoguePresetIds);
  const presets = dialogue.presets
    .filter((preset) => !retiredCharacters.has(preset.characterId) && !retiredPresets.has(preset.id))
    .map((preset) => ({...preset, sceneIds: preset.sceneIds.filter((id) => dialogueSceneIds.has(id))}))
    .filter((preset) => preset.sceneIds.length > 0);
  const speakers = new Set(presets.map((preset) => preset.characterId));
  return {
    preview: {...preview, scenes: preview.scenes.filter((scene) => activeIds.has(scene.id)).map((scene) => ({
      ...scene,
      exit: scene.exit && activeIds.has(scene.exit.nextSceneId) ? scene.exit : null,
    }))},
    gameplay: {...gameplay, storyScenes: gameplay.storyScenes.filter((scene) => activeIds.has(scene.id)).map((scene) => ({
      ...scene,
      actions: scene.actions.filter((action) => activeIds.has(action.nextSceneId) && !('failureNextSceneId' in action && action.failureNextSceneId && !activeIds.has(action.failureNextSceneId))),
    }))},
    dialogue: {...dialogue, presets, voices: dialogue.voices.filter((voice) => speakers.has(voice.characterId))},
  };
}
