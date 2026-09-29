import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay, penisuelaSessionPreview} from '../../../../entities/campaign-session/model/playableData';
import {isGalleryStoryConditionMet} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import type {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import type {SceneMasterAction} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneDecisionModal} from '../../../../features/navigate-campaign-scene/ui/SceneDecisionModal/SceneDecisionModal';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {SceneCombatPanel} from '../CombatEncounterHud/SceneCombatPanel';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';

interface EgorikBungalowAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
  controller: ReturnType<typeof useGallerySession>;
}

const heroTokens = Object.fromEntries(penisuelaSessionPreview.party.map((hero) => [hero.characterId, hero.token]));

export function EgorikBungalowAdventure({campaignId, campaignScenes, scene, controller}: EgorikBungalowAdventureProps) {
  const navigate = useNavigate();
  const {state} = controller;
  const [leaving, setLeaving] = useState(false);
  const story = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id);
  const start = story?.actions.find((action) => action.kind === 'combat-start');
  const victory = story?.actions.find((action) => action.kind === 'combat-complete');
  const voiceTest = story?.actions.find((action) => action.id === 'test-egorik-nastasia-voices');
  const voicesTested = Boolean(state.flags['egorik-voices-tested']);
  const showBracelet = story?.actions.find((action) => action.id === 'show-egorik-bracelet');
  const returnToConversation = story?.actions.find((action) => action.id === 'return-to-egorik-conversation');
  const encounter = start?.kind === 'combat-start'
    ? penisuelaGalleryGameplay.encounters.find((item) => item.id === start.encounterId)
    : undefined;
  const combat = state.combat?.encounterId === encounter?.id ? state.combat : null;
  const fallback = story?.actions.find((action) => action.id === encounter?.defeatFallback?.completionActionId);
  const continueAction = story?.actions.find((action) => action.kind === 'automatic' && action.nextSceneId !== scene.id);
  const fallbackUsed = Boolean(encounter && state.flags[`combat-defeat-fallback-${encounter.id}`]);
  const rescued = Boolean(state.flags['bridge-egorik-bungalow-reveal-egorik-first-rescue-attempt-resolved']);
  const braceletVisible = rescued && Boolean(state.flags['egorik-bracelet-visible']);
  const canContinue = Boolean(continueAction && isGalleryStoryConditionMet(continueAction.conditions, state));
  const conversationViewId = braceletVisible ? 'bracelet'
    : voicesTested && !state.flags['egorik-truth-revealed'] ? 'voices' : 'conversation';
  const viewId = combat && !fallbackUsed ? 'combat'
    : rescued || fallbackUsed ? conversationViewId : 'entry';
  const view = scene.interactionViews?.find((item) => item.id === viewId);
  const displayedScene = view ? {...scene, background: view.background, alt: view.alt} : scene;

  useEffect(() => {
    if (!leaving || !continueAction || state.lastStoryAction?.actionId !== continueAction.id) return;
    setLeaving(false);
    navigate(`/campaign/${campaignId}/play/${continueAction.nextSceneId}`);
  }, [campaignId, continueAction, leaving, navigate, state.lastStoryAction]);

  const continueToTunnel = () => {
    if (!continueAction || !canContinue) return;
    if (controller.commitStoryAction(scene.id, continueAction.id)) setLeaving(true);
    else navigate(`/campaign/${campaignId}/play/${continueAction.nextSceneId}`);
  };
  const finishCombat = () => {
    if (fallbackUsed && fallback) controller.completeCombatDefeatFallback(scene.id);
    else if (victory) controller.completeStoryCombat(scene.id, victory.id);
  };
  const masterActions: SceneMasterAction[] = [];
  if (!combat && !rescued && start) {
    masterActions.push({
      id: start.id, label: start.label,
      disabled: Boolean(state.combat) || !isGalleryStoryConditionMet(start.conditions, state),
      onSelect: () => controller.startStoryCombat(scene.id, start.id),
    });
  }
  if (!combat && rescued) {
    if (!voicesTested && voiceTest) masterActions.push({id: voiceTest.id, label: voiceTest.label, onSelect: () => controller.commitStoryAction(scene.id, voiceTest.id)});
    const action = braceletVisible ? returnToConversation : showBracelet;
    if (action && (voicesTested || braceletVisible)) masterActions.push({
      id: action.id, label: action.label,
      disabled: !isGalleryStoryConditionMet(action.conditions, state),
      onSelect: () => controller.commitStoryAction(scene.id, action.id),
    });
    if (!braceletVisible && canContinue && continueAction) masterActions.push({
      id: continueAction.id, label: continueAction.label, onSelect: continueToTunnel,
    });
  }
  const narration = view?.readAloud ?? scene.readAloud;

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      scene={displayedScene}
      backHref={`/campaign/${campaignId}/play/guest-bungalows`}
      externalRevealedIds={state.inventory}
      externallyManagedIds={controller.managedInspectableIds}
      onMasterStepBack={controller.canUndoLastAction ? () => controller.undoLastAction() : undefined}
      masterActions={masterActions}
      gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={penisuelaGalleryGameplay} scene={scene} />}
      interactiveContent={combat && !fallbackUsed ? (
        <SceneCombatPanel
          key={`${combat.encounterId}:${state.events.filter((event) => event.type === 'action-corrected').length}`}
          combat={combat}
          controller={controller}
          definition={penisuelaGalleryGameplay}
          heroTokens={heroTokens}
          onContinue={finishCombat}
        />
      ) : combat && fallbackUsed ? (
        <SceneDecisionModal
          open dismissible={false} eyebrow="Рассказчик" title={scene.title} description=""
          onClose={() => {}} optionsInitiallyVisible
          options={[{id: 'finish-fallback', label: 'Поговорить с Егориком и Настасьей', onSelect: finishCombat}]}
        >
          <SceneTextPanel collapsible={false} resetKey={`${scene.id}:fallback`}>
            <p>{encounter?.defeatFallback?.resolution}</p>
          </SceneTextPanel>
        </SceneDecisionModal>
      ) : (
        <SceneTextPanel
          appearance="narration"

          readAloud={narration ?? scene.readAloud}
          resetKey={`${scene.id}:${viewId}:${canContinue}:${voicesTested}`}
        />
      )}
    />
  );
}
