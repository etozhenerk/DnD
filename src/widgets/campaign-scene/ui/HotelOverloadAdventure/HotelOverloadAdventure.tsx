import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useCampaignScene} from '../../../../features/navigate-campaign-scene/model/useCampaignScene';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import styles from './HotelOverloadAdventure.module.css';

interface HotelOverloadAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

export function HotelOverloadAdventure({
  campaignId,
  campaignScenes,
  scene,
}: HotelOverloadAdventureProps) {
  const navigate = useNavigate();
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    campaignScenes.map((item) => item.id),
    {sceneScopeId: 'hotel-overload'},
  );
  const {completeIntro, introRead} = useCampaignScene(
    campaignId,
    scene,
    campaignScenes,
    controller.state.inventory,
    controller.managedInspectableIds,
  );
  const [searchRequested, setSearchRequested] = useState(false);
  const [sceneResetKey, setSceneResetKey] = useState(0);
  const {state} = controller;

  useEffect(() => {
    if (!searchRequested || !introRead) return;
    navigate(`/campaign/${campaignId}/play/hotel-overload-search`);
  }, [campaignId, introRead, navigate, searchRequested]);

  const inspectRoom = () => {
    setSearchRequested(true);
    completeIntro();
  };
  const restartWakeUpScene = () => {
    setSearchRequested(false);
    setSceneResetKey((current) => current + 1);
  };

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      backHref={`/campaign/${campaignId}/prologue?frame=last`}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={campaignScenes}
          controller={controller}
          definition={penisuelaGalleryGameplay}
          scene={scene}
        />
      )}
      onMasterSceneRestart={restartWakeUpScene}
      scene={scene}
      interactiveContent={(
        <>
          <SceneTextPanel
            appearance="narration"
            resetKey={`${scene.id}:${state.events.length}:${sceneResetKey}`}
          >
            <div className={styles.copy} data-scene-narration-copy>
              <p className={styles.speaker} data-scene-narrator>Рассказчик</p>
              <p className={styles.readAloud} data-scene-read-aloud>{scene.readAloud}</p>
            </div>
            <button
              className={styles.inspectButton}
              disabled={searchRequested}
              type="button"
              onClick={inspectRoom}
            >
              Осмотреть номер
            </button>
          </SceneTextPanel>
        </>
      )}
    />
  );
}
