import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay, penisuelaGalleryHeroes} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {getStoryActionAvailability} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {SceneHotspotLayer} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';

interface BedroomRevealAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

export function BedroomRevealAdventure({campaignId, campaignScenes, scene}: BedroomRevealAdventureProps) {
  const navigate = useNavigate();
  const sceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(penisuelaGalleryGameplay, penisuelaGalleryHeroes, sceneIds, {sceneScopeId: scene.id});
  const {state} = controller;
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const story = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id)!;
  const opened = Boolean(state.flags['bedroom-door-revealed'] || state.flags['igor-revealed']);
  const atDoor = Boolean(state.flags['graywise-tour-finished']);
  const viewId = opened ? 'bedroom-open' : atDoor ? 'bedroom-closed' : undefined;
  const view = scene.interactionViews?.find((item) => item.id === viewId);
  const displayedScene = view ? {...scene, background: view.background, alt: view.alt, readAloud: view.readAloud ?? scene.readAloud} : scene;

  useEffect(() => {
    if (!pendingExit || state.lastStoryAction?.sceneId !== scene.id || state.lastStoryAction.actionId !== pendingExit) return;
    const action = story.actions.find((item) => item.id === pendingExit);
    if (action) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
  }, [campaignId, navigate, pendingExit, scene.id, state.lastStoryAction, story.actions]);

  const actions = story.actions.filter((action) => getStoryActionAvailability(action, state, penisuelaGalleryGameplay)).map((action) => ({
    id: action.id, label: action.label,
    onSelect: () => {
      const committed = controller.commitStoryAction(scene.id, action.id);
      if (action.nextSceneId === scene.id) return;
      if (committed) setPendingExit(action.id);
      else if (opened) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
    },
  }));
  const doorAction = actions.find((action) => action.id === (atDoor ? 'open-bedroom-door' : 'approach-bedroom-door'));
  const doorPosition = atDoor
    ? {x: 39, y: 4, width: 27, height: 92}
    : {x: 64.5, y: 3, width: 16.7, height: 69.3};

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId} campaignScenes={campaignScenes} scene={displayedScene}
      backHref={`/campaign/${campaignId}/play/graywise-door-trust`}
      externalRevealedIds={state.inventory} externallyManagedIds={controller.managedInspectableIds}
      masterActions={actions.filter((action) => action.id !== doorAction?.id)}
      onMasterStepBack={controller.canUndoLastActionInScope(scene.id) ? () => {
        setPendingExit(null);
        controller.undoLastAction(scene.id);
      } : undefined}
      gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={penisuelaGalleryGameplay} scene={displayedScene} />}
      interactiveContent={(
        <>
          <SceneHotspotLayer
            background={{src: displayedScene.background, fit: 'contain'}}
            hotspots={doorAction ? [{...doorAction, position: doorPosition}] : []}
          />
          <SceneTextPanel appearance="narration" readAloud={displayedScene.readAloud} resetKey={view?.id ?? scene.id} />
        </>
      )}
    />
  );
}
