import {isCombatVictory} from '../../../../entities/combat/model/combatObjectives';
import {useContext, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay, penisuelaGalleryHeroes, penisuelaSessionPreview} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {getStoryActionAvailability} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {getBossUndoScope} from '../../../../features/navigate-campaign-scene/model/bossSequenceCommands';
import {CampaignPresentationContext} from '../../../../features/navigate-campaign-scene/model/campaignPresentation';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {SceneCombatPanel} from '../CombatEncounterHud/SceneCombatPanel';
import {CombatSkillVideoOverlay} from '../CombatSkillVideoOverlay/CombatSkillVideoOverlay';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';

interface AndreyBossAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const definition = penisuelaGalleryGameplay;
const sequence = definition.bossSequence!;
const heroTokens = Object.fromEntries(penisuelaSessionPreview.party.map((hero) => [hero.characterId, hero.token]));

export function AndreyBossAdventure({campaignId, campaignScenes, scene}: AndreyBossAdventureProps) {
  const navigate = useNavigate();
  const enterPortal = useContext(CampaignPresentationContext)?.enterPortal;
  const sceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(definition, penisuelaGalleryHeroes, sceneIds, {sceneScopeId: scene.id});
  const {state, advanceBossSequence} = controller;
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const [returnToVilla, setReturnToVilla] = useState(false);
  const [portalRequested, setPortalRequested] = useState(false);
  const combat = state.combat;
  const undoScope = getBossUndoScope(state.events, scene.id);
  const firstVictory = combat?.encounterId === sequence.firstEncounterId
    && !combat.pendingAttack && !combat.pendingSavingThrow
    && isCombatVictory(combat)
    && controller.sessionHeroes.some((hero) => (state.heroHp[hero.id] ?? 0) > 0)
    && !state.flags['andrey-defeat-fallback'];
  const secondPhase = Boolean(state.flags['andrey-transformation-finished']);
  const completed = Boolean(state.flags['andrey-boss-defeated']);
  const viewId = completed && sequence.aftermath?.returnViewId ? sequence.aftermath.returnViewId : secondPhase ? sequence.secondViewId
    : state.flags['andrey-phase-one-defeated'] ? sequence.intermission?.viewId : undefined;
  const view = scene.interactionViews?.find((item) => item.id === viewId);
  const displayedScene = view ? {...scene, background: view.background, alt: view.alt, readAloud: view.readAloud ?? scene.readAloud} : scene;
  const secondVictory = combat?.encounterId === sequence.secondEncounterId
    && !combat.pendingAttack && !combat.pendingSavingThrow && isCombatVictory(combat)
    && controller.sessionHeroes.some((hero) => (state.heroHp[hero.id] ?? 0) > 0)
    && !state.flags['andrey-defeat-fallback'];
  const defeated = Boolean(state.flags['andrey-defeat-fallback'] || state.flags['andrey-bad-ending']);
  const deathPending = Boolean(!defeated && sequence.aftermath && completed && !state.flags['andrey-death-video-finished']);
  const story = definition.storyScenes.find((item) => item.id === scene.id)!;
  const completedText = definition.encounters.find((item) => item.id === sequence.secondEncounterId)?.victoryText;
  const betweenPhases = Boolean(!defeated && state.flags['andrey-phase-one-defeated'] && !secondPhase && !combat);
  const intermissionPending = Boolean(betweenPhases && sequence.intermission && !state.flags['andrey-transformation-started']);
  const transformationPending = betweenPhases && !intermissionPending;
  const videoCue = useMemo(() => transformationPending && sequence.transformationVideo.source ? {
    id: 'andrey-transformation', title: sequence.transformationVideo.title,
    videoSrc: resolveAsset(sequence.transformationVideo.source), posterSrc: resolveAsset(displayedScene.background),
  } : null, [transformationPending, displayedScene.background]);
  const deathVideoCue = useMemo(() => deathPending && sequence.aftermath?.deathVideo.source ? {
    id: 'andrey-death', title: sequence.aftermath.deathVideo.title,
    videoSrc: resolveAsset(sequence.aftermath.deathVideo.source), posterSrc: resolveAsset(displayedScene.background),
  } : null, [deathPending, displayedScene.background]);

  useEffect(() => {
    if (!sequence.defeat) return;
    const allDown = controller.sessionHeroes.length > 0
      && controller.sessionHeroes.every((hero) => (state.heroHp[hero.id] ?? hero.hp) <= 0);
    if (defeated || (allDown && !combat)) advanceBossSequence('defeat');
    if (defeated && !combat && state.selectedEnding === sequence.defeat.endingId) {
      navigate(`/campaign/${campaignId}/play/${sequence.defeat.returnSceneId}`, {replace: true});
    }
  }, [advanceBossSequence, campaignId, combat, controller.sessionHeroes, defeated, navigate, state.heroHp, state.selectedEnding]);

  useEffect(() => {
    if (returnToVilla && !state.flags['andrey-arena-entered']) navigate(`/campaign/${campaignId}/play/andrey-villa-breach`);
  }, [campaignId, navigate, returnToVilla, state.flags]);
  useEffect(() => {
    if (state.flags['andrey-arena-entered'] && !combat && !state.flags['andrey-phase-one-defeated'] && !completed) advanceBossSequence('start');
  }, [advanceBossSequence, combat, completed, state.flags]);
  useEffect(() => {
    if (deathPending && !sequence.aftermath?.deathVideo.source) {
      setPortalRequested(true);
      advanceBossSequence('death-video-ended');
    }
  }, [advanceBossSequence, deathPending]);
  useEffect(() => {
    if (!defeated && completed && !combat && state.flags['andrey-death-video-finished'] && sequence.aftermath) {
      const target = `/campaign/${campaignId}/play/${sequence.aftermath.returnSceneId}`;
      if (portalRequested && sequence.aftermath.returnTransition === 'portal' && enterPortal) enterPortal(target);
      else navigate(target, {replace: true});
    }
  }, [campaignId, combat, completed, defeated, enterPortal, navigate, portalRequested, state.flags]);
  useEffect(() => {
    // A pending transition also remains playable if the video is removed from the bundle later.
    if (transformationPending && !sequence.transformationVideo.source) advanceBossSequence('video-ended');
  }, [advanceBossSequence, transformationPending]);

  useEffect(() => {
    if (!pendingExit || state.lastStoryAction?.sceneId !== scene.id || state.lastStoryAction.actionId !== pendingExit) return;
    const action = story.actions.find((item) => item.id === pendingExit);
    if (action) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
  }, [campaignId, navigate, pendingExit, scene.id, state.lastStoryAction, story.actions]);

  return (
    <CampaignScene
      campaignId={campaignId} campaignScenes={campaignScenes} scene={displayedScene}
      soundtrackEncounterId={betweenPhases ? sequence.firstEncounterId : deathPending || (completed && portalRequested) ? sequence.secondEncounterId : undefined}
      backHref={`/campaign/${campaignId}/play/andrey-villa-breach`}
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      externalRevealedIds={state.inventory} externallyManagedIds={controller.managedInspectableIds}
      masterActions={deathPending || defeated || (completed && sequence.aftermath) ? [] : completed ? story.actions.filter((action) => getStoryActionAvailability(action, state, definition)).map((action) => ({
        id: action.id, label: action.label, onSelect: () => {
          if (controller.commitStoryAction(scene.id, action.id)) setPendingExit(action.id);
        },
      })) : !combat && !transformationPending && !state.flags['andrey-phase-one-defeated'] ? [{
        id: 'start-andrey-battle', label: 'Начать бой с лордом Нетаком', onSelect: () => advanceBossSequence('start'),
      }] : []}
      onMasterStepBack={!transformationPending && !deathPending && controller.canUndoLastActionInScope(undoScope)
        ? () => {
          setPendingExit(null);
          if (controller.undoLastAction(undoScope) && undoScope === 'andrey-villa-breach') setReturnToVilla(true);
        } : undefined}
      gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={definition} scene={displayedScene} />}
      interactiveContent={(
        <>
          {combat ? (
            <SceneCombatPanel
              key={combat.encounterId} combat={combat} controller={controller} definition={definition} heroTokens={heroTokens}
              onCombatResolved={() => {
                if (controller.sessionHeroes.every((hero) => (state.heroHp[hero.id] ?? 0) <= 0)) advanceBossSequence('defeat');
                else if (firstVictory && !sequence.intermission) advanceBossSequence('first-victory');
              }}
              onContinue={() => {
                if (state.flags['andrey-defeat-fallback']) {
                  advanceBossSequence('defeat');
                } else if (firstVictory) advanceBossSequence('first-victory');
                else if (secondVictory) {
                  setPortalRequested(true);
                  advanceBossSequence('finish');
                }
              }}
            />
          ) : !transformationPending && !deathPending && !firstVictory && !secondVictory && !(completed && sequence.aftermath) ? (
            <SceneTextPanel
              appearance="narration"
              collapsible={!intermissionPending}
              readAloud={completed ? completedText : displayedScene.readAloud}
              resetKey={completed ? 'andrey-defeated' : view?.id ?? scene.id}
              primaryAction={intermissionPending && sequence.intermission ? {
                label: sequence.intermission.continueLabel,
                onSelect: () => advanceBossSequence('start-transformation'),
              } : undefined}
            />
          ) : null}
          <CombatSkillVideoOverlay
            cue={videoCue} playbackRate={1} ariaLabel="Превращение лорда Нетака в дракона"
            onComplete={() => advanceBossSequence('video-ended')}
          />
          <CombatSkillVideoOverlay
            cue={deathVideoCue} playbackRate={1} ariaLabel="Гибель лорда Нетака"
            onComplete={() => {
              setPortalRequested(true);
              advanceBossSequence('death-video-ended');
            }}
          />
        </>
      )}
    />
  );
}
