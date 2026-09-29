import {isGalleryStoryConditionMet} from '../../../../entities/campaign-session/model/galleryGameplay';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
  penisuelaSessionPreview,
} from '../../../../entities/campaign-session/model/playableData';
import {getLastUndoableCommandIdForScene} from '../../../../entities/campaign-session/model/gallerySession';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {InspectableArtifactDialog} from '../../../../entities/campaign-session/ui/InspectableArtifactDialog/InspectableArtifactDialog';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {getStoryCheckSettings} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {SceneCheckPanel} from '../../../../features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel';
import {getAutomaticCheckReward, GREY_WIESE_PERFUME_ID} from '../../../../entities/campaign-session/model/partyRewards';
import {
  SceneHotspotLayer,
  type SceneHotspot,
} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {SceneDecisionModal} from '../../../../features/navigate-campaign-scene/ui/SceneDecisionModal/SceneDecisionModal';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {SceneReturnButton} from '../../../../features/navigate-campaign-scene/ui/SceneReturnButton/SceneReturnButton';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {CombatEncounterHud} from '../CombatEncounterHud/CombatEncounterHud';
import {DanceTrackConsole} from '../DanceTrackConsole/DanceTrackConsole';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';

interface ClosedBarAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

type ClosedBarView = 'overview' | 'stas' | 'dancers' | 'device';

const BEAT_GUARD_SCENE_BACKGROUND = 'assets/concepts/campaigns/penisuela/scenes/closed-bar-beat-guards-combat.png';
const BEAT_GUARD_TOKEN = 'assets/concepts/campaigns/penisuela/ui/enemy-tokens/club-beat-guard.png';
const BUNGALOW_GUARD_ENCOUNTER_ID = 'hotel-bar-arcane-guards';
const BUNGALOW_GUARD_SCENE_BACKGROUND = 'assets/concepts/campaigns/penisuela/scenes/closed-bar-bungalow-guards.png';
const BUNGALOW_GUARD_TOKEN = 'assets/concepts/campaigns/penisuela/ui/enemy-tokens/hotel-arcane-guard.png';
const HERO_TOKEN_PATHS: Record<string, string> = {
  bubsilda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/bubsilda.png',
  linda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/linda.png',
  lambert: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/lambert.png',
  'golovach-lena': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/golovach-lena.png',
  'thorin-pukoshchit': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/thorin-pukoshchit.png',
};

function getClosedBarView(value: string | null): ClosedBarView {
  return value === 'stas' || value === 'dancers' || value === 'device' ? value : 'overview';
}

export function ClosedBarAdventure({
  campaignId,
  campaignScenes,
  scene,
}: ClosedBarAdventureProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view = getClosedBarView(searchParams.get('view'));
  const sceneScopeId = `closed-bar-${view}`;
  const overviewHref = `/campaign/${campaignId}/play/closed-bar`;
  const hallHref = `/campaign/${campaignId}/play/hotel-gallery`;
  const bungalowsHref = `/campaign/${campaignId}/play/guest-bungalows`;
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
    {sceneScopeId},
  );
  const {state} = controller;
  const acquiredInspectableIds = state.inventory;
  const dancePuzzle = penisuelaGalleryGameplay.dancePuzzle;
  const beatGuardCombat = state.combat?.encounterId === dancePuzzle.wrongTrackPenalty.encounterId
    ? state.combat
    : null;
  const bungalowGuardCombat = state.combat?.encounterId === BUNGALOW_GUARD_ENCOUNTER_ID
    ? state.combat
    : null;
  const activeClosedBarCombat = beatGuardCombat ?? bungalowGuardCombat;
  const stasInteractionView = scene.interactionViews?.find((item) => item.id === 'stas');
  const dancersInteractionView = scene.interactionViews?.find((item) => item.id === 'dancers');
  const danceTroupeFreed = Boolean(state.flags['dance-troupe-freed']);
  const beatGuardSummonPending = Boolean(state.flags['dance-guard-wave-pending']);
  const showDancersGratitude = danceTroupeFreed && !beatGuardSummonPending && !state.combat;
  const dancersSceneView = (showDancersGratitude
    ? scene.interactionViews?.find((item) => item.id === 'dancers-freed')
    : undefined) ?? dancersInteractionView;
  const lastDanceTrack = dancePuzzle.tracks.find(
    (track) => state.flags[`dance-last-track-${track.id}`],
  );
  const danceGuardPrompt = lastDanceTrack?.correct && dancePuzzle.firstCorrectTrackCombat
    ? dancePuzzle.firstCorrectTrackCombat
    : dancePuzzle.wrongTrackPenalty;
  const [combatRoll, setCombatRoll] = useState('');
  const [combatDiceExpression, setCombatDiceExpression] = useState('1d20');
  const [combatDiceLabel, setCombatDiceLabel] = useState('Бросок d20');
  const [combatDiceSelection, setCombatDiceSelection] = useState<DiceSelectionMode>('sum');
  const [combatDiceRequestId, setCombatDiceRequestId] = useState(0);
  const [combatDiceRolling, setCombatDiceRolling] = useState(false);
  const [combatDiceReady, setCombatDiceReady] = useState(false);
  const [combatDiceError, setCombatDiceError] = useState(false);
  const [bungalowPassageBlocked, setBungalowPassageBlocked] = useState(false);
  const [pendingBungalowsActionId, setPendingBungalowsActionId] = useState<string | null>(null);
  const [selectedDanceTrackId, setSelectedDanceTrackId] = useState<string | null>(null);
  const [stasCheckOpen, setStasCheckOpen] = useState(false);
  const [stasPassModalOpen, setStasPassModalOpen] = useState(false);
  const [stasSpeakerId, setStasSpeakerId] = useState(penisuelaGalleryHeroes[0].id);
  const lastScopedCommandId = useMemo(
    () => getLastUndoableCommandIdForScene(state.events, sceneScopeId),
    [sceneScopeId, state.events],
  );
  const undoRestoresBlockedPassage = Boolean(
    bungalowGuardCombat
    && lastScopedCommandId
    && state.events.some((event) => (
      event.commandId === lastScopedCommandId && event.type === 'combat-started'
    )),
  );
  const bungalowsRouteAction = useMemo(() => {
    const action = penisuelaGalleryGameplay.storyScenes
      .find((storyScene) => storyScene.id === scene.id)
      ?.actions.find((candidate) => candidate.nextSceneId === 'guest-bungalows');
    return action?.kind === 'automatic' ? action : undefined;
  }, [scene.id]);
  const stasPassAction = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id)?.actions.find((item) => item.id === 'receive-stas-bungalow-pass');
  const stasPassArtifact = scene.inspectables.find((item) => item.id === 'stas-bungalow-pass');
  const hasStasPass = (state.inventoryState['stas-bungalow-pass']?.quantity ?? 0) > 0;
  const receiveStasPass = () => {
    if (!stasPassAction || !stasPassArtifact) return;
    if (controller.commitStoryAction(scene.id, stasPassAction.id)) setStasPassModalOpen(true);
  };
  const troupePassAction = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id)?.actions.find((item) => item.id === 'receive-troupe-bungalow-passes');
  const bungalowPassesReady = Boolean(bungalowsRouteAction && isGalleryStoryConditionMet(bungalowsRouteAction.conditions, state));
  const troupeRewardActions = troupePassAction && isGalleryStoryConditionMet(troupePassAction.conditions, state) ? [{id: troupePassAction.id, label: troupePassAction.label, onSelect: () => controller.commitStoryAction(scene.id, troupePassAction.id)}] : [];
  const gameMasterConsole = (
    <GameMasterConsole
      campaignScenes={campaignScenes}
      controller={controller}
      definition={penisuelaGalleryGameplay}
      scene={scene}
    />
  );

  const resetCombatDie = useCallback(() => {
    setCombatRoll('');
    setCombatDiceRolling(false);
    setCombatDiceError(false);
    setCombatDiceSelection('sum');
  }, []);

  const undoClosedBarStep = useCallback(() => {
    if (!controller.undoLastAction()) return;
    if (undoRestoresBlockedPassage) setBungalowPassageBlocked(true);
    setPendingBungalowsActionId(null);
    setStasPassModalOpen(false);
    resetCombatDie();
  }, [controller, resetCombatDie, undoRestoresBlockedPassage]);

  const startCombatDiceRoll = useCallback((
    expression: string,
    label: string,
    selectionMode: DiceSelectionMode = 'sum',
  ) => {
    if (combatDiceRolling || !combatDiceReady) return;
    setCombatRoll('');
    setCombatDiceExpression(expression);
    setCombatDiceLabel(label);
    setCombatDiceSelection(selectionMode);
    setCombatDiceError(false);
    setCombatDiceRolling(true);
    setCombatDiceRequestId((current) => current + 1);
  }, [combatDiceReady, combatDiceRolling]);

  useEffect(() => {
    resetCombatDie();
  }, [activeClosedBarCombat?.turnIndex, resetCombatDie]);

  useEffect(() => {
    if (view !== 'device') setSelectedDanceTrackId(null);
    if (view !== 'stas') setStasPassModalOpen(false);
  }, [view]);

  useEffect(() => {
    if (
      !pendingBungalowsActionId
      || state.lastStoryAction?.sceneId !== scene.id
      || state.lastStoryAction.actionId !== pendingBungalowsActionId
    ) return;

    setPendingBungalowsActionId(null);
    navigate(bungalowsHref);
  }, [bungalowsHref, navigate, pendingBungalowsActionId, scene.id, state.lastStoryAction]);

  const goToGuestBungalows = useCallback(() => {
    if (!bungalowsRouteAction || state.combat) return;
    if (!bungalowPassesReady) { navigate(overviewHref); setBungalowPassageBlocked(true); return; }

    const correctedCommandIds = new Set(state.events.flatMap((event) => (
      event.type === 'action-corrected' ? [event.correctedCommandId] : []
    )));
    const alreadyResolved = state.events.some((event) => (
      event.type === 'story-action-resolved'
      && event.sceneId === scene.id
      && event.actionId === bungalowsRouteAction.id
      && !correctedCommandIds.has(event.commandId)
    ));

    if (alreadyResolved) {
      navigate(bungalowsHref);
      return;
    }

    if (controller.commitStoryAction(scene.id, bungalowsRouteAction.id)) {
      setPendingBungalowsActionId(bungalowsRouteAction.id);
    }
  }, [
    bungalowsHref,
    bungalowPassesReady,
    overviewHref,
    state.combat,
    bungalowsRouteAction,
    controller,
    navigate,
    scene.id,
    state.events,
  ]);

  if (activeClosedBarCombat) {
    const bungalowGuardEncounterActive = activeClosedBarCombat.encounterId === BUNGALOW_GUARD_ENCOUNTER_ID;
    const encounter = penisuelaGalleryGameplay.encounters.find(
      (item) => item.id === activeClosedBarCombat.encounterId,
    );
    const combatScene: CampaignSessionScene = {
      ...scene,
      id: bungalowGuardEncounterActive
        ? 'closed-bar-bungalow-guards-combat'
        : 'closed-bar-beat-guards-combat',
      title: encounter?.name ?? (bungalowGuardEncounterActive
        ? 'Руническая охрана прохода'
        : 'Четыре Бит-стража'),
      eyebrow: bungalowGuardEncounterActive
        ? 'Закрытый бар · Проход к бунгало'
        : 'Закрытый бар · Бой',
      background: bungalowGuardEncounterActive
        ? BUNGALOW_GUARD_SCENE_BACKGROUND
        : BEAT_GUARD_SCENE_BACKGROUND,
      alt: bungalowGuardEncounterActive
        ? 'Три красно-золотых рунических стража перекрывают закрытый проход к гостевым бунгало.'
        : 'Четыре бирюзовых голографических стража стоят перед пятью танцорами WOK в чёрной одежде, ярких перчатках и туфлях на каблуках. Позади танцоров светится неоновый треугольник.',
      readAloud: encounter?.startText
        ?? (bungalowGuardEncounterActive
          ? 'Красный считыватель вспыхивает, и перед закрытым проходом собираются три рунических стража.'
          : 'Перед сценой загораются четыре бирюзовые голограммы и перекрывают путь к музыкальному пульту.'),
      inspectables: [],
      exit: null,
    };

    return (
      <CampaignScene
      soundtrackSceneId={scene.id}
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        gameMasterConsole={gameMasterConsole}
        externalRevealedIds={acquiredInspectableIds}
        externallyManagedIds={controller.managedInspectableIds}
        onMasterStepBack={controller.canUndoLastAction ? undoClosedBarStep : undefined}
        scene={combatScene}
        interactiveContent={(
          <>
            <CombatEncounterHud
              combat={activeClosedBarCombat}
              definition={penisuelaGalleryGameplay}
              diceError={combatDiceError}
              diceReady={combatDiceReady}
              fallbackEnemyToken={bungalowGuardEncounterActive
                ? BUNGALOW_GUARD_TOKEN
                : BEAT_GUARD_TOKEN}
              heroes={controller.sessionHeroes}
              heroHp={state.heroHp}
              participantTemporaryModifiers={state.participantTemporaryModifiers}
              participantConditions={Object.fromEntries(controller.sessionHeroes.map((hero) => [
                hero.id,
                controller.getParticipantConditions(hero.id),
              ]))}
              inventoryState={state.inventoryState}
              resourceUses={state.resourceUses}
              heroTokens={HERO_TOKEN_PATHS}
              inputValue={combatRoll}
              isRolling={combatDiceRolling}
              onApplyDamage={controller.applyCombatDamage}
              onCancelPendingAttack={controller.cancelPendingCombatAttackWithRedButton}
              onContinue={() => {
                if (bungalowGuardEncounterActive) {
                  setBungalowPassageBlocked(false);
                  controller.clearCombat('closed-bar');
                  return;
                }
                controller.clearCombat('gallery');
              }}
              onDefeatFallback={controller.resolveCombatDefeatFallback}
              onEnemyAttack={controller.enemyAttack}
              onEquipItem={controller.equipCombatItem}
              onHeroAttack={controller.heroAttack}
              onSummonedAllyAttack={controller.summonedAllyAttack}
              onResolveSavingThrow={controller.resolveCombatSavingThrow}
              onInputChange={(value) => {
                setCombatRoll(value);
                setCombatDiceError(false);
              }}
              onResetDie={resetCombatDie}
              onRoll={startCombatDiceRoll}
              onSelectAction={controller.selectCombatAction}
              onUseAction={controller.useCombatAction}
              suggestedEnemyTargetId={controller.getNpcDecision(
                activeClosedBarCombat.initiativeOrder[activeClosedBarCombat.turnIndex] ?? '',
              )?.suggestion.targetIds[0]}
              timelineEvents={state.events}
            />
            <D20Roller
              diceExpression={combatDiceExpression}
              requestId={combatDiceRequestId}
              rollLabel={combatDiceLabel}
              rolling={combatDiceRolling}
              selectionMode={combatDiceSelection}
              onError={() => {
                setCombatDiceRolling(false);
                setCombatDiceError(true);
              }}
              onReadyChange={setCombatDiceReady}
              onResult={(result) => {
                setCombatRoll(String(result));
                setCombatDiceRolling(false);
              }}
            />
          </>
        )}
      />
    );
  }

  if (view === 'stas') {
    const storyActions = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id)?.actions ?? [];
    const recruitmentActions = storyActions.filter((action) => ['invite-stas-to-olva', 'persuade-stas-to-consultation', 'promise-stas-a-voice'].includes(action.id));
    const persuasion = recruitmentActions.find((action) => action.kind === 'check');
    const check = persuasion?.kind === 'check' ? persuasion : undefined;
    const settings = check ? getStoryCheckSettings(check.check, state, stasSpeakerId, 'charisma') : undefined;
    const checkVisible = stasCheckOpen && check && isGalleryStoryConditionMet(check.conditions, state);
    const stasNarrationId = state.flags['olva-stas-recruited'] ? 'stas-agreed'
      : state.flags['olva-stas-persuasion-failed'] ? 'stas-hesitates'
        : state.flags['olva-stas-invited'] ? 'stas-invited' : 'stas';
    const recruitmentNarration = scene.interactionViews?.find((item) => item.id === stasNarrationId)?.readAloud;
    const stasScene: CampaignSessionScene = {
      ...scene,
      id: 'closed-bar-stas-view',
      title: 'Станис у барной стойки',
      eyebrow: 'Закрытый бар · Разговор',
      background: stasInteractionView?.background ?? scene.background,
      alt: stasInteractionView?.alt ?? 'Станис сидит у стойки закрытого бара с кружкой пива.',
      readAloud: stasInteractionView?.readAloud
        ?? 'Тёплый свет скользит по стойке. Станис сидит перед кружкой пива, тяжело опустив плечи.',
      inspectables: [],
      exit: null,
    };
    return (
      <CampaignScene
      soundtrackSceneId={scene.id}
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        gameMasterConsole={gameMasterConsole}
        backHref={overviewHref}
        onMasterStepBack={checkVisible ? () => setStasCheckOpen(false) : controller.canUndoLastAction ? undoClosedBarStep : undefined}
        externalRevealedIds={acquiredInspectableIds}
        externallyManagedIds={controller.managedInspectableIds}
        masterActions={[
          ...(stasPassAction && stasPassArtifact && isGalleryStoryConditionMet(stasPassAction.conditions, state)
            ? [{id: stasPassAction.id, label: stasPassAction.label, onSelect: receiveStasPass}] : []),
          ...(hasStasPass && stasPassArtifact ? [{
            id: 'show-stas-bungalow-pass',
            label: 'Показать полученный пропуск',
            onSelect: () => setStasPassModalOpen(true),
          }] : []),
          {id: 'continue-to-bar', label: 'Вернуться в бар', href: overviewHref},
          ...recruitmentActions.filter((action) => isGalleryStoryConditionMet(action.conditions, state)).map((action) => ({
            id: action.id, label: action.label,
            onSelect: () => action.kind === 'check' ? setStasCheckOpen(true) : controller.commitStoryAction(scene.id, action.id),
          })),
        ]}
        scene={stasScene}
        interactiveContent={(
          <><SceneTextPanel
            appearance="narration"

            readAloud={recruitmentNarration ?? stasScene.readAloud}
            resetKey={`${stasScene.id}:${recruitmentNarration ?? 'opening'}`}
          />
          <SceneReturnButton onClick={() => navigate(overviewHref)}>Вернуться в бар</SceneReturnButton>
          {stasPassModalOpen && hasStasPass && stasPassArtifact ? (
            <InspectableArtifactDialog
              artifact={stasPassArtifact}
              title="Пропуск Станиса получен"
              onClose={() => setStasPassModalOpen(false)}
            />
          ) : null}
          {checkVisible && settings ? <SceneCheckPanel
            key={check.id} checkId={check.id} label={check.label} hint={check.description}
            dc={(heroId) => getStoryCheckSettings(check.check, state, heroId, 'charisma').dc}
            selectedHeroId={stasSpeakerId} selectedStat="charisma" stats={check.check.stats} advantage={settings.advantage}
            heroes={controller.sessionHeroes.map((hero) => ({id: hero.id, name: hero.name,
              stats: {...hero.stats, charisma: getStoryCheckSettings(check.check, state, hero.id, 'charisma').modifier},
              token: penisuelaSessionPreview.party.find((member) => member.characterId === hero.id)!.token,
            }))}
            onSelectHero={setStasSpeakerId} onClose={() => setStasCheckOpen(false)}
            automaticSuccess={getAutomaticCheckReward(state, stasSpeakerId, 'charisma') ? {
              ...getAutomaticCheckReward(state, stasSpeakerId, 'charisma')!,
              onUse: () => {
                const result = controller.resolveStoryActionCheck(scene.id, check.id, stasSpeakerId, 'charisma', undefined, false, GREY_WIESE_PERFUME_ID);
                if (result) setStasCheckOpen(false);
                return Boolean(result);
              },
            } : undefined}
            onResolve={(_roll, rolls) => {
              if (controller.resolveStoryActionCheck(scene.id, check.id, stasSpeakerId, 'charisma', rolls)) setStasCheckOpen(false);
            }}
          /> : null}</>
        )}
      />
    );
  }

  if (view === 'dancers' || (view === 'device' && showDancersGratitude)) {
    const dancersScene: CampaignSessionScene = {
      ...scene,
      id: 'closed-bar-dancers-view',
      title: showDancersGratitude ? 'Благодарность труппы WOK' : 'Сцена WOK: застывший танец',
      eyebrow: 'Закрытый бар · Сцена',
      background: dancersSceneView?.background ?? scene.background,
      backgroundLayout: showDancersGratitude ? 'contain' : scene.backgroundLayout,
      alt: dancersSceneView?.alt
        ?? 'Пятеро танцоров WOK повторяют заколдованный танец рядом с электронным музыкальным пультом.',
      readAloud: dancersSceneView?.readAloud ?? dancePuzzle.opening,
      inspectables: [],
      exit: null,
    };
    const danceText = showDancersGratitude
      ? dancersSceneView?.readAloud ?? dancePuzzle.success
      : lastDanceTrack
        ? `${lastDanceTrack.feedback} ${dancePuzzle.clue}`
        : `${dancePuzzle.opening} ${dancePuzzle.clue}`;

    return (
      <CampaignScene
      soundtrackSceneId={scene.id}
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        gameMasterConsole={gameMasterConsole}
        backHref={overviewHref}
        onMasterStepBack={controller.canUndoLastAction ? undoClosedBarStep : undefined}
        externalRevealedIds={acquiredInspectableIds}
        externallyManagedIds={controller.managedInspectableIds}
        masterActions={[
          ...troupeRewardActions,
          {id: 'continue-to-bar', label: 'Вернуться в бар', href: overviewHref},
        ]}
        scene={dancersScene}
        interactiveContent={(
          <>
            {showDancersGratitude ? (
              <SceneReturnButton onClick={() => navigate(overviewHref)}>Вернуться в бар</SceneReturnButton>
            ) : <SceneHotspotLayer
              ariaLabel="Электронный музыкальный пульт"
              hotspots={[{
                id: 'closed-bar-dance-device',
                label: 'Открыть экран электронного музыкального пульта',
                href: `${overviewHref}?view=device`,
                presentation: 'soft-object',
                position: {x: 68, y: 37, width: 29, height: 57},
              }]}
            />}
            <SceneTextPanel
              appearance="narration"

              readAloud={danceText}
              resetKey={`${dancersScene.id}:${danceTroupeFreed ? 'freed' : lastDanceTrack?.id ?? 'enchanted'}`}
            />

          </>
        )}
      />
    );
  }

  if (view === 'device') {
    const deviceScene: CampaignSessionScene = {
      ...scene,
      id: 'closed-bar-dance-device-view',
      title: 'Электронный музыкальный пульт',
      eyebrow: 'Закрытый бар · Система сцены',
      background: dancersInteractionView?.background ?? scene.background,
      alt: dancersInteractionView?.alt
        ?? 'Электронный музыкальный пульт управляет заколдованным танцем труппы WOK.',
      readAloud: dancePuzzle.clue,
      inspectables: [],
      exit: null,
    };
    const deviceText = danceTroupeFreed
      ? dancePuzzle.success
      : lastDanceTrack?.feedback ?? deviceScene.readAloud;

    return (
      <CampaignScene
      soundtrackSceneId={scene.id}
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        gameMasterConsole={gameMasterConsole}
        backHref={`${overviewHref}?view=dancers`}
        onMasterStepBack={selectedDanceTrackId ? () => setSelectedDanceTrackId(null) : controller.canUndoLastAction ? undoClosedBarStep : undefined}
        externalRevealedIds={acquiredInspectableIds}
        externallyManagedIds={controller.managedInspectableIds}
        masterActions={[
          ...troupeRewardActions,
          {id: 'continue-to-bar', label: 'Вернуться в бар', href: overviewHref},
        ]}
        scene={deviceScene}
        interactiveContent={(
          <>
            <SceneDecisionModal
              description={danceGuardPrompt.modalText}
              dismissible={false}
              eyebrow={danceGuardPrompt.modalEyebrow}
              onClose={undoClosedBarStep}
              open={beatGuardSummonPending}
              options={[{
                id: 'start-beat-guard-combat',
                closeOnSelect: false,
                label: danceGuardPrompt.confirmLabel,
                onSelect: controller.startDanceGuardCombat,
              }]}
              optionsInitiallyVisible
              title={danceGuardPrompt.modalTitle}
            />
            <DanceTrackConsole
              closeHref={`${overviewHref}?view=dancers`}
              fallbackImage={deviceScene.background}
              freed={danceTroupeFreed}
              lastTrack={lastDanceTrack}
              onSelect={controller.selectDanceTrack}
              onSelectedTrackChange={setSelectedDanceTrackId}
              puzzle={dancePuzzle}
              rejectedTrackIds={dancePuzzle.tracks
                .filter((track) => state.flags[`dance-track-${track.id}-rejected`])
                .map((track) => track.id)}
              selectedTrackId={selectedDanceTrackId}
            />
            <SceneTextPanel
              appearance="narration"

              readAloud={deviceText}
              resetKey={`${deviceScene.id}:${danceTroupeFreed ? 'freed' : lastDanceTrack?.id ?? 'opening'}`}
            />

          </>
        )}
      />
    );
  }

  const hotspots: SceneHotspot[] = [
    {
      id: 'closed-bar-stas',
      label: 'Подойти к Станису у барной стойки',
      href: `${overviewHref}?view=stas`,
      presentation: 'soft-object',
      position: {x: 17, y: 22, width: 22, height: 62},
    },
    {
      id: 'closed-bar-dancers',
      label: 'Пройти к сцене с заколдованными танцорами WOK',
      href: `${overviewHref}?view=dancers`,
      position: {x: 52, y: 14, width: 30, height: 57},
    },
    {
      id: 'closed-bar-bungalow-passage',
      label: bungalowPassesReady
        ? 'Выйти к гостевым бунгало'
        : 'Проверить закрытый проход к гостевым бунгало',
      onSelect: () => {
        if (bungalowPassesReady) {
          goToGuestBungalows();
          return;
        }
        setBungalowPassageBlocked(true);
      },
      position: {x: 82, y: 8, width: 18, height: 68},
    },
  ];

  return (
    <CampaignScene
      soundtrackSceneId={scene.id}
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      gameMasterConsole={gameMasterConsole}
      backHref={hallHref}
      masterActions={[{id: 'continue-to-bungalows', label: 'Пройти к гостевым бунгало', onSelect: goToGuestBungalows}, {id: 'return-to-hall', label: 'Вернуться в холл', href: hallHref}]}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={controller.managedInspectableIds}
      onMasterStepBack={bungalowPassageBlocked
        ? () => setBungalowPassageBlocked(false)
        : undefined}
      scene={scene}
      interactiveContent={(
        <>
          <SceneDecisionModal
            description="Считывателю нужны пять пропусков: один от Станиса и четыре от освобождённых танцоров. Без полного комплекта попытка открыть проход вызовет трёх рунических стражей."
            eyebrow="Система доступа"
            onClose={() => setBungalowPassageBlocked(false)}
            open={bungalowPassageBlocked}
            options={[
              {
                id: 'start-bungalow-guard-combat',
                label: 'Попытаться открыть проход',
                onSelect: () => {
                  controller.startCombat(BUNGALOW_GUARD_ENCOUNTER_ID);
                },
              },
              {
                id: 'return-to-bar-overview',
                label: 'Остаться в баре',
                onSelect: () => {
                  setBungalowPassageBlocked(false);
                },
              },
            ]}
            optionsInitiallyVisible
            title="Проход к бунгало под охраной"
          />
          <SceneHotspotLayer
            ariaLabel="Интерактивные области закрытого бара"
            hotspots={hotspots}
          />
          <SceneTextPanel
            appearance="narration"

            readAloud={scene.readAloud}
            resetKey={`${scene.id}:overview`}
          />
        </>
      )}
    />
  );
}
