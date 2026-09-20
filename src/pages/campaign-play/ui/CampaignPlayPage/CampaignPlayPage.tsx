import {CampaignPresentation} from '../../../../features/navigate-campaign-scene/ui/CampaignPresentation/CampaignPresentation';
import {CampaignStepHistoryBoundary} from '../../../../features/navigate-campaign-scene/ui/CampaignStepHistoryBoundary/CampaignStepHistoryBoundary';
import {SceneCheckpointBoundary} from '../../../../features/navigate-campaign-scene/ui/SceneCheckpointBoundary/SceneCheckpointBoundary';
import {GroomTunnelAdventure} from '../../../../widgets/campaign-scene/ui/GroomTunnelAdventure/GroomTunnelAdventure';
import {AndreyBossAdventure} from '../../../../widgets/campaign-scene/ui/AndreyBossAdventure/AndreyBossAdventure';
import {VillaFinaleAdventure} from '../../../../widgets/campaign-scene/ui/VillaFinaleAdventure/VillaFinaleAdventure';
import {GraywiseDoorAdventure} from '../../../../widgets/campaign-scene/ui/GraywiseDoorAdventure/GraywiseDoorAdventure';
import {BedroomRevealAdventure} from '../../../../widgets/campaign-scene/ui/BedroomRevealAdventure/BedroomRevealAdventure';
import {Navigate, useParams} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaSessionPreview,
} from '../../../../entities/campaign-session/model/playableData';
import {ClosedBarAdventure} from '../../../../widgets/campaign-scene/ui/ClosedBarAdventure/ClosedBarAdventure';
import {
  GuestBungalowsAdventure,
  guestBungalowsAdventureSceneIds,
} from '../../../../widgets/campaign-scene/ui/GuestBungalowsAdventure/GuestBungalowsAdventure';
import {CampaignSceneWithGameMaster} from '../../../../widgets/campaign-scene/ui/GameMasterConsole/CampaignSceneWithGameMaster';
import {
  HotelGalleryAdventure,
  hotelGalleryAdventureSceneIds,
} from '../../../../widgets/campaign-scene/ui/HotelGalleryAdventure/HotelGalleryAdventure';
import {HotelOverloadAdventure} from '../../../../widgets/campaign-scene/ui/HotelOverloadAdventure/HotelOverloadAdventure';
import {HotelOverloadSearchAdventure} from '../../../../widgets/campaign-scene/ui/HotelOverloadSearchAdventure/HotelOverloadSearchAdventure';
import {LateStoryAdventure} from '../../../../widgets/campaign-scene/ui/LateStoryAdventure/LateStoryAdventure';
import styles from './CampaignPlayPage.module.css';
import {OlvaDateAdventure} from '../../../../widgets/campaign-scene/ui/OlvaDateAdventure/OlvaDateAdventure';

const storySceneIds = new Set(penisuelaGalleryGameplay.storyScenes.map((scene) => scene.id));
export function CampaignPlayPage() {
  const {sceneId = ""} = useParams();
  return <CampaignPresentation><CampaignStepHistoryBoundary definition={penisuelaGalleryGameplay}><SceneCheckpointBoundary definition={penisuelaGalleryGameplay} blocks={penisuelaSessionPreview.sceneBlocks ?? []} sceneId={sceneId}><CampaignPlayScene /></SceneCheckpointBoundary></CampaignStepHistoryBoundary></CampaignPresentation>;
}

function CampaignPlayScene() {
  const {sceneId} = useParams();

  const scene = penisuelaSessionPreview.scenes.find((item) => item.id === sceneId);
  const hotelOverloadScene = penisuelaSessionPreview.scenes.find((item) => item.id === 'hotel-overload');

  if (sceneId === 'hotel-overload-search' && hotelOverloadScene) {
    return (
      <main className={styles.page}>
        <HotelOverloadSearchAdventure
          campaignId={penisuelaSessionPreview.campaignId}
          campaignScenes={penisuelaSessionPreview.scenes}
          scene={hotelOverloadScene}
        />
      </main>
    );
  }

  const previousScene = penisuelaSessionPreview.scenes.find((item) => item.exit?.nextSceneId === scene?.id);
  const previousHref = previousScene
    ? `/campaign/${penisuelaSessionPreview.campaignId}/play/${previousScene.id}`
    : scene?.id === penisuelaSessionPreview.initialSceneId
      ? `/campaign/${penisuelaSessionPreview.campaignId}/prologue`
      : undefined;

  if (!scene) return <Navigate replace to="/not-found" />;

  if (scene.id === 'olva-date-rehearsal') {
    return <main className={styles.page}><OlvaDateAdventure campaignId={penisuelaSessionPreview.campaignId} campaignScenes={penisuelaSessionPreview.scenes} scene={scene}/></main>;
  }

  if (hotelGalleryAdventureSceneIds.has(scene.id)) {
    return (
      <main className={styles.page}>
        <HotelGalleryAdventure
          campaignId={penisuelaSessionPreview.campaignId}
          campaignScenes={penisuelaSessionPreview.scenes}
          scene={scene}
        />
      </main>
    );
  }

  if (scene.id === 'hotel-overload') {
    return (
      <main className={styles.page}>
        <HotelOverloadAdventure
          campaignId={penisuelaSessionPreview.campaignId}
          campaignScenes={penisuelaSessionPreview.scenes}
          scene={scene}
        />
      </main>
    );
  }

  if (scene.id === 'closed-bar') {
    return (
      <main className={styles.page}>
        <ClosedBarAdventure
          campaignId={penisuelaSessionPreview.campaignId}
          campaignScenes={penisuelaSessionPreview.scenes}
          scene={scene}
        />
      </main>
    );
  }

  if (guestBungalowsAdventureSceneIds.has(scene.id)) {
    return (
      <main className={styles.page}>
        <GuestBungalowsAdventure
          campaignId={penisuelaSessionPreview.campaignId}
          campaignScenes={penisuelaSessionPreview.scenes}
          scene={scene}
        />
      </main>
    );
  }

  if (scene.id === 'groom-tunnel') {
    return <main className={styles.page}><GroomTunnelAdventure campaignId={penisuelaSessionPreview.campaignId} campaignScenes={penisuelaSessionPreview.scenes} scene={scene} /></main>;
  }

  if (scene.id === 'graywise-door-trust') {
    return <main className={styles.page}><GraywiseDoorAdventure campaignId={penisuelaSessionPreview.campaignId} campaignScenes={penisuelaSessionPreview.scenes} scene={scene} /></main>;
  }

  if (scene.id === 'bedroom-reveal') {
    return <main className={styles.page}><BedroomRevealAdventure campaignId={penisuelaSessionPreview.campaignId} campaignScenes={penisuelaSessionPreview.scenes} scene={scene} /></main>;
  }

  if (storySceneIds.has(scene.id)) {
    if (['igor-unboxing', 'andrey-villa-breach', 'villa-after-andrey', 'couple-voice-reset', 'wedding-epilogue', 'bad-ending-villa', 'bad-ending-netak-wedding', 'bad-ending-magical-prison'].includes(scene.id)) {
      return <main className={styles.page}><VillaFinaleAdventure key={scene.id} campaignId={penisuelaSessionPreview.campaignId} campaignScenes={penisuelaSessionPreview.scenes} scene={scene} /></main>;
    }
    if (scene.id === penisuelaGalleryGameplay.bossSequence?.sceneId) {
      return <main className={styles.page}><AndreyBossAdventure campaignId={penisuelaSessionPreview.campaignId} campaignScenes={penisuelaSessionPreview.scenes} scene={scene} /></main>;
    }
    return (
      <main className={styles.page}>
        <LateStoryAdventure
          campaignId={penisuelaSessionPreview.campaignId}
          campaignScenes={penisuelaSessionPreview.scenes}
          scene={scene}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <CampaignSceneWithGameMaster
        key={scene.id}
        campaignId={penisuelaSessionPreview.campaignId}
        campaignScenes={penisuelaSessionPreview.scenes}
        backHref={previousHref}
        scene={scene}
      />
    </main>
  );
}
