import {createContext, useContext, useEffect, useMemo} from 'react';
import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import {getSoundtrackPlaylist, type CampaignMusicTrack} from '../../../entities/campaign-session/model/soundtrack';
import type {CampaignSceneBlock} from '../../../entities/campaign-session/model/types';

export const CampaignSoundtrackContext = createContext<{
  setPlaylist: (tracks: CampaignMusicTrack[]) => void;
  enabled: boolean;
  blocked: boolean;
  unavailable: boolean;
  volume: number;
  title?: string;
  toggle: () => void;
  next: () => void;
  setVolume: (volume: number) => void;
} | null>(null);

export function useSceneSoundtrack(definition: GalleryGameplayDefinition, sceneId: string, encounterId?: string, flags?: Readonly<Record<string, boolean>>, sceneBlocks?: readonly CampaignSceneBlock[]) {
  const context = useContext(CampaignSoundtrackContext);
  const setPlaylist = context?.setPlaylist;
  const tracks = useMemo(() => getSoundtrackPlaylist(definition.soundtrack, encounterId, sceneId, flags, sceneBlocks), [definition.soundtrack, encounterId, sceneId, flags, sceneBlocks]);
  // History/checkpoint boundaries briefly unmount screens during navigation.
  // Only the successor's explicit playlist (including silence) or leaving play stops the music.
  useEffect(() => {setPlaylist?.(tracks);}, [setPlaylist, tracks]);
  return context;
}
