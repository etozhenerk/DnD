import {CampaignPresentationContext} from '../../../../features/navigate-campaign-scene/model/campaignPresentation';
import {canShowCampaignCredits, penisuelaCredits} from '../../../../entities/campaign-session/model/credits';
import {startCreditsMusic} from '../../../../features/play-campaign-credits/model/creditsMusicAudio';
import {useContext, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay as definition, penisuelaGalleryHeroes} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {getStoryActionAvailability} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {SceneHotspotLayer} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';

interface VillaFinaleAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const backSceneIds: Record<string, string> = {
  'igor-unboxing': 'bedroom-reveal',
  'andrey-villa-breach': 'igor-unboxing',
  'villa-after-andrey': 'last-take-boss',
  'couple-voice-reset': 'villa-after-andrey',
  'wedding-epilogue': 'couple-voice-reset',
  'bad-ending-villa': 'last-take-boss',
  'bad-ending-netak-wedding': 'bad-ending-villa',
  'bad-ending-magical-prison': 'bad-ending-netak-wedding',
};

export function VillaFinaleAdventure({campaignId, campaignScenes, scene}: VillaFinaleAdventureProps) {
  const navigate = useNavigate();
  const presentation = useContext(CampaignPresentationContext);
  const enterPortal = presentation?.enterPortal;
  const sceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(definition, penisuelaGalleryHeroes, sceneIds, {sceneScopeId: scene.id});
  const {state} = controller;
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const story = definition.storyScenes.find((item) => item.id === scene.id)!;
  const viewId = scene.id === 'igor-unboxing'
    ? state.flags['thorin-birkin-received'] ? 'bag-exchanged' : null
    : scene.id === 'wedding-epilogue' && state.flags['grey-wiese-reward-received'] ? 'grey-wiese-thanks'
    : scene.id === 'andrey-villa-breach'
      ? state.flags['andrey-plan-revealed'] ? 'andrey-confession'
        : state.flags['andrey-appeared'] ? 'andrey-appearance' : null
      : scene.id === 'couple-voice-reset' && state.flags['couple-voice-reset-completed'] ? 'voices-accepted' : null;
  const undoScope = controller.canUndoLastActionInScope(scene.id) ? scene.id : backSceneIds[scene.id];
  const view = scene.interactionViews?.find((item) => item.id === viewId);
  const displayedScene = view ? {...scene, background: view.background, alt: view.alt, readAloud: view.readAloud ?? scene.readAloud} : scene;
  const corrected = new Set(state.events.filter((event) => event.type === 'action-corrected').map((event) => event.correctedCommandId));
  const resolved = new Set(state.events.filter((event) => event.type === 'story-action-resolved' && event.sceneId === scene.id && !corrected.has(event.commandId)).map((event) => event.type === 'story-action-resolved' ? event.actionId : ''));
  const actions = story.actions.filter((action) => getStoryActionAvailability(action, state, definition)
    && (!resolved.has(action.id) || action.nextSceneId !== scene.id)).map((action) => ({
      id: action.id, label: action.label, onSelect: () => {
        if (controller.commitStoryAction(scene.id, action.id)) {
          if (action.nextSceneId !== scene.id) setPendingExit(action.id);
        } else if (resolved.has(action.id) && action.nextSceneId !== scene.id) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
      },
    }));
  const villaDoorAction = scene.id === 'villa-after-andrey' ? actions.find((action) => action.id === 'approach-couple-device') : undefined;
  const masterActions = canShowCampaignCredits(penisuelaCredits, scene.id, state.flags)
    ? [...actions, {
      id: 'open-campaign-credits',
      label: 'Завершить историю — титры',
      onSelect: () => {
        const cancelMusic = startCreditsMusic(penisuelaCredits.music);
        void Promise.resolve(navigate(`/campaign/${campaignId}/credits?ending=${scene.id}`)).catch(cancelMusic);
      },
    }]
    : actions;
  useEffect(() => {
    if (!pendingExit || state.lastStoryAction?.sceneId !== scene.id || state.lastStoryAction.actionId !== pendingExit) return;
    const action = story.actions.find((item) => item.id === pendingExit);
    if (!action) return;
    setPendingExit(null);
    const target = `/campaign/${campaignId}/play/${action.nextSceneId}`;
    if (action.id === 'andrey-teleport-to-arena' && enterPortal) enterPortal(target);
    else navigate(target);
  }, [campaignId, enterPortal, navigate, pendingExit, scene.id, state.lastStoryAction, story.actions]);

  return <CampaignScene
    campaignId={campaignId} campaignScenes={campaignScenes} scene={displayedScene}
    itemController={controller} inventoryArtwork={controller.inventoryArtwork}
    externalRevealedIds={state.inventory} externallyManagedIds={controller.managedInspectableIds}
    backHref={`/campaign/${campaignId}/play/${backSceneIds[scene.id]}`}
    masterActions={masterActions}
    onMasterStepBack={controller.canUndoLastActionInScope(undoScope) ? () => {
      setPendingExit(null);
      if (controller.undoLastAction(undoScope) && undoScope !== scene.id) navigate(`/campaign/${campaignId}/play/${undoScope}`);
    } : undefined}
    gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={definition} scene={displayedScene} />}
    interactiveContent={<>
      {villaDoorAction ? <SceneHotspotLayer
        background={{src: displayedScene.background, fit: 'contain'}}
        hotspots={[{...villaDoorAction, label: 'Открыть дверь виллы — к Angel и Kreed', presentation: 'object', position: {x: 50, y: 28, width: 8, height: 32}}]}
      /> : null}
      <SceneTextPanel appearance="narration" readAloud={displayedScene.readAloud} resetKey={`${scene.id}:${viewId ?? 'intro'}`} />
    </>}
  />;
}
