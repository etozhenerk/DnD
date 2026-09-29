import {useMemo} from 'react';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from './GameMasterConsole';

interface CampaignSceneWithGameMasterProps {
  backHref?: string;
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

export function CampaignSceneWithGameMaster({
  backHref,
  campaignId,
  campaignScenes,
  scene,
}: CampaignSceneWithGameMasterProps) {
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
  );
  const acquiredInspectableIds = controller.state.inventory;

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      backHref={backHref}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={controller.managedInspectableIds}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={campaignScenes}
          controller={controller}
          definition={penisuelaGalleryGameplay}
          scene={scene}
        />
      )}
      scene={scene}
    />
  );
}
