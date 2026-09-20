import type {GalleryGameplayDefinition} from './galleryGameplay';
import type {CampaignSceneBlock} from './types';

export type CampaignSoundtrackDefinition = NonNullable<GalleryGameplayDefinition['soundtrack']>;
export type CampaignMusicTrack = CampaignSoundtrackDefinition['tracks'][number];

export function getSoundtrackPlaylist(
  definition: CampaignSoundtrackDefinition | undefined,
  encounterId?: string,
  sceneId?: string,
  flags: Readonly<Record<string, boolean>> = {},
  sceneBlocks: readonly CampaignSceneBlock[] = [],
): CampaignMusicTrack[] {
  if (!definition) return [];
  const requiredFlags = sceneId ? definition.sceneRequiredFlags?.[sceneId] : undefined;
  if (requiredFlags?.some(flag => !flags[flag])) return [];
  const block = sceneBlocks.find(item => sceneId && item.sceneIds.includes(sceneId));
  const blockPlaylist = block ? definition.blocks?.[block.id] : undefined;
  const ids = encounterId
    ? definition.encounters[encounterId] ?? definition.combat
    : (sceneId ? definition.scenes?.[sceneId] : undefined) ?? blockPlaylist ?? definition.exploration;
  return ids.flatMap((id) => {
    const track = definition.tracks.find((item) => item.id === id);
    return track ? [track] : [];
  });
}
