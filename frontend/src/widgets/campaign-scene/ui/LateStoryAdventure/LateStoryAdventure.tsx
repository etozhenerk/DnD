import {SceneCheckPanel} from '../../../../features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel';
import {getStoryCheckSettings} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {getAutomaticCheckReward, GREY_WIESE_PERFUME_ID} from '../../../../entities/campaign-session/model/partyRewards';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import {isGalleryStoryConditionMet} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {
  GalleryStoryActionDefinition,
  GalleryStoryEpilogueDefinition,
  HeroStat,
} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {
  SceneHotspotLayer,
  type SceneHotspot,
} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import type {SceneMasterAction} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {useManualCriticalRollEffect} from '../../../../shared/lib/dice/useManualCriticalRollEffect';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {getCampaignCombatPresentation} from '../../../../entities/campaign-session/model/itemSkins';
import {CombatEncounterHud} from '../CombatEncounterHud/CombatEncounterHud';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import styles from './LateStoryAdventure.module.css';

interface LateStoryAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const statLabels: Record<HeroStat, string> = {strength: 'Сила', dexterity: 'Ловкость', wisdom: 'Мудрость', intelligence: 'Интеллект', charisma: 'Харизма'};

const heroTokens: Record<string, string> = {
  bubsilda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/bubsilda.png',
  linda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/linda.png',
  lambert: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/lambert.png',
  'golovach-lena': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/golovach-lena.png',
  'thorin-pukoshchit': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/thorin-pukoshchit.png',
};

const earlyStoryBackSceneIds: Readonly<Record<string, string>> = {
  'guest-bungalows': 'closed-bar',
  'bungalow-courtyard': 'guest-bungalows',
  'olva-passes-handoff': 'bungalow-courtyard',
  'egorik-bungalow-reveal': 'guest-bungalows',
  'couples-session-entry': 'bungalow-courtyard',
  'groom-tunnel': 'egorik-bungalow-reveal',
  'groom-preparation-room': 'groom-tunnel',
  'kreed-disclosure': 'groom-preparation-room',
  'post-kreed-route': 'kreed-disclosure',
};

function getFamilySummary(
  flags: Record<string, boolean>,
  epilogue: GalleryStoryEpilogueDefinition,
) {
  if (flags['womanizer-given-to-polina']) return epilogue.familyWomanizer;
  if (flags['stas-marriage-ended']) return epilogue.familyStas;
  if (flags['polina-family-plan']) return epilogue.familyPolina;
  return epilogue.familyUnresolved;
}

function getStoryScene(sceneId: string) {
  return penisuelaGalleryGameplay.storyScenes.find((scene) => scene.id === sceneId);
}

function getActionResultText(
  action: GalleryStoryActionDefinition,
  result: 'automatic' | 'success' | 'failure',
) {
  return result === 'failure' && action.kind === 'check'
    ? action.failureResolution
    : action.resolution;
}

function getActionNextSceneId(
  action: GalleryStoryActionDefinition,
  result: 'automatic' | 'success' | 'failure',
) {
  return result === 'failure' && action.kind === 'check'
    ? action.failureNextSceneId ?? action.nextSceneId
    : action.nextSceneId;
}

type AutomaticStoryAction = Extract<GalleryStoryActionDefinition, {kind: 'automatic'}>;

const spatialActionKeys = new Set([
  'closed-bar:continue-1-artists-dressing-room',
  'egorik-bungalow-reveal:continue-1-bungalow-courtyard',
  'bungalow-courtyard:continue-1-couples-session-entry',
  'bungalow-courtyard:continue-2-groom-tunnel',
  'groom-tunnel:continue-1-groom-preparation-room',
  'post-kreed-route:continue-2-graywise-door-trust',
  'restore-control-log:continue-1-responsible-control-log',
  'restore-control-log:continue-2-graywise-door-trust',
  'responsible-control-log:continue-1-graywise-door-trust',
  'graywise-door-trust:continue-1-bedroom-reveal',
  'bedroom-reveal:continue-1-igor-unboxing',
  'igor-unboxing:continue-1-wedding-reminder',
  'early-physical-assault:continue-1-doom-five-cable-junction',
  'doom-five-cable-junction:continue-1-groom-preparation-room',
  'final-choice:continue-1-last-take-boss',
]);

const directMasterTransitionScenes = new Set(['groom-preparation-room', 'kreed-disclosure']);
const kreedNarrationScenes = new Set([
  ...directMasterTransitionScenes,
  'post-kreed-route',
  'graywise-door-trust',
]);

const storyHotspotPositions: Record<string, Record<string, SceneHotspot['position']>> = {
  'closed-bar': {
    'continue-1-artists-dressing-room': {x: 41, y: 18, width: 20, height: 46},
  },
  'egorik-bungalow-reveal': {
    'continue-1-bungalow-courtyard': {x: 72, y: 15, width: 26, height: 58},
  },
  'bungalow-courtyard': {
    'continue-1-couples-session-entry': {x: 0, y: 8, width: 47, height: 65},
    'continue-2-groom-tunnel': {x: 70, y: 16, width: 28, height: 57},
  },
  'groom-tunnel': {
    'continue-1-groom-preparation-room': {x: 41, y: 33, width: 18, height: 34},
  },
  'groom-preparation-room': {
    'continue-1-kreed-disclosure': {x: 38, y: 8, width: 33, height: 68},
  },
  'kreed-disclosure': {
    'continue-1-post-kreed-route': {x: 42, y: 11, width: 18, height: 57},
  },
  'post-kreed-route': {
    'continue-1-restore-control-log': {x: 0, y: 14, width: 36, height: 52},
    'continue-2-graywise-door-trust': {x: 62, y: 34, width: 9, height: 24},
  },
  'restore-control-log': {
    'continue-1-responsible-control-log': {x: 0, y: 14, width: 36, height: 52},
    'continue-2-graywise-door-trust': {x: 40, y: 16, width: 14, height: 40},
  },
  'responsible-control-log': {
    'continue-1-graywise-door-trust': {x: 40, y: 16, width: 14, height: 40},
  },
  'graywise-door-trust': {
    'continue-1-bedroom-reveal': {x: 42, y: 11, width: 18, height: 57},
  },
  'bedroom-reveal': {
    'continue-1-igor-unboxing': {x: 40, y: 16, width: 14, height: 40},
  },
  'igor-unboxing': {
    'continue-1-wedding-reminder': {x: 62, y: 10, width: 27, height: 57},
  },
  'early-physical-assault': {
    'continue-1-doom-five-cable-junction': {x: 41, y: 33, width: 18, height: 34},
  },
  'doom-five-cable-junction': {
    'continue-1-groom-preparation-room': {x: 42, y: 64, width: 34, height: 25},
  },
  'final-choice': {
    'continue-1-last-take-boss': {x: 36, y: 2, width: 34, height: 66},
  },
};

interface ResolvedTransitionHotspotConfig {
  label: string;
  position: NonNullable<SceneHotspot['position']>;
}

const resolvedTransitionHotspotConfigs: Record<string, ResolvedTransitionHotspotConfig> = {
  'closed-bar:continue-2-early-physical-assault': {
    label: 'К силовому контуру',
    position: {x: 42, y: 18, width: 20, height: 46},
  },
  'bungalow-courtyard:continue-3-early-physical-assault': {
    label: 'К силовому контуру',
    position: {x: 72, y: 16, width: 26, height: 57},
  },
  'bungalow-courtyard:continue-4-doom-five-cable-junction': {
    label: 'К кабельной развязке',
    position: {x: 44, y: 39, width: 22, height: 33},
  },
  'couples-session-entry:continue-1-couples-session-stas': {
    label: 'К Станису',
    position: {x: 0, y: 8, width: 44, height: 65},
  },
  'couples-session-stas:continue-1-couples-session-polina': {
    label: 'К Полинетте',
    position: {x: 54, y: 9, width: 42, height: 64},
  },
  'couples-session-stas:continue-2-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'couples-session-polina:continue-1-olva-relationship-review': {
    label: 'К Оливии',
    position: {x: 49, y: 8, width: 35, height: 65},
  },
  'couples-session-polina:continue-2-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'olva-relationship-review:continue-1-show-18-pavilion': {
    label: 'В павильон Show18',
    position: {x: 66, y: 13, width: 32, height: 60},
  },
  'olva-relationship-review:continue-2-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'show-18-pavilion:abort-show-18-broadcast': {
    label: 'Вернуться к развилке',
    position: {x: 73, y: 16, width: 25, height: 57},
  },
  'show-18-pavilion:continue-1-couples-session-plan': {
    label: 'К Станису, Полинетте и Оливии',
    position: {x: 5, y: 16, width: 33, height: 57},
  },
  'show-18-pavilion:continue-2-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 73, y: 16, width: 25, height: 57},
  },
  'couples-session-plan:continue-1-couples-session-choice': {
    label: 'К подарку Pussy Sultan',
    position: {x: 44, y: 42, width: 23, height: 29},
  },
  'couples-session-plan:continue-2-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'couples-session-plan:continue-3-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'couples-session-choice:continue-1-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'couples-session-choice:continue-2-groom-tunnel': {
    label: 'Вернуться к развилке',
    position: {x: 75, y: 18, width: 23, height: 55},
  },
  'groom-tunnel:continue-2-doom-five-cable-junction': {
    label: 'К кабельной развязке',
    position: {x: 5, y: 27, width: 28, height: 44},
  },
  'groom-tunnel:continue-3-early-physical-assault': {
    label: 'К силовому контуру',
    position: {x: 67, y: 27, width: 28, height: 44},
  },
  'groom-tunnel:complete-corp-de-ballet-fight': {
    label: 'В комнату подготовки',
    position: {x: 41, y: 33, width: 18, height: 34},
  },
  'wedding-reminder:continue-1-wedding-reminder-resolution': {
    label: 'К Angel',
    position: {x: 62, y: 10, width: 27, height: 57},
  },
  'wedding-reminder-resolution:continue-1-final-choice': {
    label: 'К силовому контуру',
    position: {x: 71, y: 18, width: 27, height: 55},
  },
  'wedding-reminder-resolution:continue-2-final-choice': {
    label: 'К силовому контуру',
    position: {x: 71, y: 18, width: 27, height: 55},
  },
  'wedding-reminder-resolution:continue-3-igor-orientation': {
    label: 'К Angel',
    position: {x: 62, y: 10, width: 27, height: 57},
  },
  'igor-orientation:continue-1-igor-consent-decisions': {
    label: 'К ответам Angel',
    position: {x: 62, y: 10, width: 27, height: 57},
  },
  'igor-orientation:continue-2-final-choice': {
    label: 'К силовому контуру',
    position: {x: 71, y: 18, width: 27, height: 55},
  },
  'igor-consent-decisions:continue-after-consent-and-gift-window': {
    label: 'К силовому контуру',
    position: {x: 71, y: 18, width: 27, height: 55},
  },
  'last-take-boss:continue-1-post-crisis-orientation-wedding': {
    label: 'Выйти из ядра',
    position: {x: 36, y: 2, width: 34, height: 66},
  },
  'last-take-boss:continue-2-post-crisis-orientation-director': {
    label: 'Выйти из ядра',
    position: {x: 36, y: 2, width: 34, height: 66},
  },
  'last-take-boss:continue-3-post-crisis-orientation-shutdown': {
    label: 'Выйти из ядра',
    position: {x: 36, y: 2, width: 34, height: 66},
  },
  'last-take-boss:continue-4-last-take-emergency-action': {
    label: 'К аварийному кабелю',
    position: {x: 42, y: 65, width: 34, height: 24},
  },
  'last-take-emergency-action:continue-1-post-crisis-orientation-evacuation': {
    label: 'К выходу из ядра',
    position: {x: 36, y: 2, width: 34, height: 66},
  },
  'post-crisis-orientation-wedding:continue-1-post-crisis-publication-wedding': {
    label: 'К записи церемонии',
    position: {x: 65, y: 17, width: 31, height: 55},
  },
  'post-crisis-orientation-director:continue-1-post-crisis-publication-director': {
    label: 'К монтажному пульту',
    position: {x: 65, y: 17, width: 31, height: 55},
  },
  'post-crisis-orientation-shutdown:continue-1-post-crisis-publication-shutdown': {
    label: 'К сохранённой записи',
    position: {x: 65, y: 17, width: 31, height: 55},
  },
  'post-crisis-orientation-evacuation:continue-1-post-crisis-publication-evacuation': {
    label: 'К сохранённой записи',
    position: {x: 65, y: 17, width: 31, height: 55},
  },
  'post-crisis-publication-wedding:continue-1-wedding-epilogue': {
    label: 'Выйти к церемонии',
    position: {x: 37, y: 13, width: 34, height: 58},
  },
  'post-crisis-publication-director:continue-1-director-epilogue': {
    label: 'Открыть финальный монтаж',
    position: {x: 37, y: 13, width: 34, height: 58},
  },
  'post-crisis-publication-shutdown:continue-1-shutdown-epilogue': {
    label: 'Выйти со сцены',
    position: {x: 37, y: 13, width: 34, height: 58},
  },
  'post-crisis-publication-evacuation:continue-1-evacuation-epilogue': {
    label: 'К точке эвакуации',
    position: {x: 37, y: 13, width: 34, height: 58},
  },
};

function isSpatialTransitionAction(
  action: GalleryStoryActionDefinition,
  sceneId: string,
): action is AutomaticStoryAction {
  return action.kind === 'automatic'
    && action.nextSceneId !== sceneId
    && spatialActionKeys.has(`${sceneId}:${action.id}`);
}

function getSpatialActionLabel(action: AutomaticStoryAction) {
  const label = action.label.toLocaleLowerCase('ru-RU');
  if (label.includes('подойти') && label.includes('двер')) return 'Подойти к двери';
  if (label.includes('постучать')) return 'Постучать';
  if (label.includes('вернуться')) return 'Вернуться';
  if (label.includes('догнать')) return 'Догнать';
  if (label.includes('реквизитор')) return 'Войти в реквизиторскую';
  if (label.includes('гримёр')) return 'Войти в гримёрку';
  if (label.includes('комнат') && (label.includes('войти') || label.includes('зайти'))) return 'Войти в комнату';
  if (label.includes('двер')) return 'Открыть дверь';
  if (label.includes('бар')) return 'Идти к бару';
  if (label.includes('тоннел')) return 'Идти в тоннель';
  if (label.includes('кабел')) return 'Идти по кабелю';
  if (label.includes('ядр')) return 'Войти в ядро';
  if (label.includes('штурм')) return 'Идти к силовому контуру';
  if (label.includes('войти')) return 'Войти';
  if (label.includes('открыть')) return 'Открыть';
  return 'Пройти дальше';
}

export function LateStoryAdventure({
  campaignId,
  campaignScenes,
  scene,
}: LateStoryAdventureProps) {
  const navigate = useNavigate();
  const storyScene = getStoryScene(scene.id);
  const backSceneId = earlyStoryBackSceneIds[scene.id];
  const backHref = backSceneId
    ? `/campaign/${campaignId}/play/${backSceneId}`
    : undefined;
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
    {sceneScopeId: scene.id},
  );
  const {state} = controller;
  const groomArrival = scene.id === 'groom-preparation-room' && state.flags['groom-tunnel-noisy-entry']
    ? scene.interactionViews?.find((view) => view.id === 'noisy-arrival') : undefined;
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState('');
  const [selectedStat, setSelectedStat] = useState<HeroStat | null>(null);
  const [rollInput, setRollInput] = useState('');
  const [useClearChoiceConfirmation, setUseClearChoiceConfirmation] = useState(false);
  const [dismissedCommandId, setDismissedCommandId] = useState<string | null>(null);
  const [isDieRolling, setIsDieRolling] = useState(false);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [diceError, setDiceError] = useState(false);
  const [dieRollRequestId, setDieRollRequestId] = useState(0);
  const [diceExpression, setDiceExpression] = useState('1d20');
  const [diceLabel, setDiceLabel] = useState('Бросок d20');
  const [diceSelection, setDiceSelection] = useState<DiceSelectionMode>('sum');
  const [pendingSpatialAction, setPendingSpatialAction] = useState<{
    actionId: string;
    nextSceneId: string;
  } | null>(null);
  const {markManualRoll, resetManualRoll} = useManualCriticalRollEffect();

  const activeAction = storyScene?.actions.find((action) => action.id === activeActionId);
  const activeCheck = activeAction?.kind === 'check' ? activeAction.check : undefined;
  const eligibleHeroes = activeCheck
    ? controller.sessionHeroes.filter((hero) => (
        !activeCheck.eligibleHeroIds || activeCheck.eligibleHeroIds.includes(hero.id)
      ))
    : [];
  const selectedHero = eligibleHeroes.find((hero) => hero.id === selectedHeroId);
  const resolvedStat = selectedStat && activeCheck?.stats.includes(selectedStat) ? selectedStat : activeCheck?.stats[0] ?? null;
  const advantageActive = Boolean(
    (activeCheck?.advantageIfFlag && state.flags[activeCheck.advantageIfFlag])
    || activeCheck?.advantageIfHeroId === selectedHeroId,
  );
  const clearChoiceAvailable = state.inventory.includes('clear-choice-confirmation')
    && (state.itemCharges['clear-choice-confirmation'] ?? 0) > 0;
  const activeStoryResult = state.lastStoryAction?.sceneId === scene.id
    && state.lastStoryAction.commandId !== dismissedCommandId
    ? state.lastStoryAction
    : null;
  const resolvedAction = activeStoryResult
    ? storyScene?.actions.find((action) => action.id === activeStoryResult.actionId)
    : undefined;
  const resolvedChallengeTrack = resolvedAction
    ? storyScene?.challenge?.tracks.find((track) => track.actionId === resolvedAction.id)
    : undefined;
  const resolvedChallengeComplete = Boolean(resolvedChallengeTrack)
    && state.counters[resolvedChallengeTrack!.successCounter] >= resolvedChallengeTrack!.successesRequired;
  const resolvedNextSceneId = resolvedAction && activeStoryResult
    ? resolvedChallengeTrack && !resolvedChallengeComplete
      ? activeStoryResult.result === 'failure'
        && Boolean(storyScene?.challenge)
        && state.counters[storyScene!.challenge!.failureCounter] >= storyScene!.challenge!.failureLimit
        ? getActionNextSceneId(resolvedAction, activeStoryResult.result)
        : scene.id
      : getActionNextSceneId(resolvedAction, activeStoryResult.result)
    : null;
  const completionAction = state.combat
    ? storyScene?.actions.find((action) => (
        action.kind === 'combat-complete'
        && action.encounterId === state.combat?.encounterId
      ))
    : undefined;
  const allHeroesDown = Boolean(state.combat)
    && penisuelaGalleryHeroes.every((hero) => (state.heroHp[hero.id] ?? 0) <= 0);
  const activeCombatantId = state.combat?.initiativeOrder[state.combat.turnIndex] ?? '';
  const activeShow18Hero = state.combat?.encounterId === 'universal-advice-algorithm'
    ? penisuelaGalleryHeroes.find((hero) => hero.id === activeCombatantId)
    : undefined;
  const activeShow18Conditions = activeShow18Hero ? (['shamed', 'assigned-role'] as const).filter((condition) => (
    state.flags[`show18-${condition}-${activeShow18Hero.id}`]
  )) : [];
  const corpDeBalletFallbackAvailable = allHeroesDown
    && state.combat?.encounterId === 'confidentiality-corp-de-ballet'
    && completionAction?.kind === 'combat-complete';
  const correctedCommandIds = useMemo(() => new Set(
    state.events
      .filter((event) => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  ), [state.events]);
  const resolvedActionIds = useMemo(() => new Set(
    state.events
      .filter((event) => (
        event.type === 'story-action-resolved'
        && event.sceneId === scene.id
        && !correctedCommandIds.has(event.commandId)
      ))
      .map((event) => event.type === 'story-action-resolved' ? event.actionId : ''),
  ), [correctedCommandIds, scene.id, state.events]);
  const challengeCompleted = storyScene?.challenge?.tracks.some((track) => (
    state.counters[track.successCounter] >= track.successesRequired
  )) ?? false;
  const challengeLocked = storyScene?.challenge
    ? state.counters[storyScene.challenge.failureCounter] >= storyScene.challenge.failureLimit
    : false;
  const challengeFailureCount = storyScene?.challenge
    ? state.counters[storyScene.challenge.failureCounter]
    : 0;
  const challengeProgressTracks = storyScene?.challenge?.tracks.filter((track, index, tracks) => (
    tracks.findIndex((candidate) => candidate.successCounter === track.successCounter) === index
  )) ?? [];
  const emergencyFinalAction = scene.id === 'last-take-boss'
    ? storyScene?.actions.find((action) => action.id === 'continue-4-last-take-emergency-action')
    : undefined;
  const visibleActions = storyScene?.actions.filter((action) => {
    if (action.kind === 'combat-complete') return false;
    if (action.id === emergencyFinalAction?.id) return false;
    if (
      action.id === 'leave-dressing-room-after-defeat'
      && !state.flags['combat-defeat-fallback-dressing-room-mirror-doubles']
    ) return false;
    const challengeTrack = storyScene.challenge?.tracks.find((track) => track.actionId === action.id);
    if (challengeTrack) {
      const availableForAnotherAttempt = challengeTrack.repeatable || !resolvedActionIds.has(action.id);
      return !challengeCompleted && !challengeLocked && availableForAnotherAttempt;
    }
    return (action.kind === 'automatic' && action.nextSceneId !== scene.id)
      || !resolvedActionIds.has(action.id);
  }) ?? [];
  const spatialActions = visibleActions.filter((action) => isSpatialTransitionAction(action, scene.id));
  const availableSpatialActions = spatialActions.filter((action) => (
    isGalleryStoryConditionMet(action.conditions, state)
  ));
  const masterOnlyActions = visibleActions.filter((action): boolean => (
    !isSpatialTransitionAction(action, scene.id)
  ));
  const acquiredInspectableIds = state.inventory;

  const resetRoll = () => {
    resetManualRoll('story-check');
    setRollInput('');
    setIsDieRolling(false);
    setDiceError(false);
    setUseClearChoiceConfirmation(false);
  };

  const closeCheck = () => {
    setActiveActionId(null);
    setSelectedHeroId('');
    setSelectedStat(null);
    resetRoll();
  };

  const beginCheck = (action: Extract<GalleryStoryActionDefinition, {kind: 'check'}>) => {
    const heroes = controller.sessionHeroes.filter((hero) => (
      !action.check.eligibleHeroIds || action.check.eligibleHeroIds.includes(hero.id)
    ));
    setActiveActionId(action.id);
    setSelectedHeroId(heroes[0]?.id ?? '');
    setSelectedStat(action.check.stats.length === 1 ? action.check.stats[0] : null);
    resetRoll();
  };

  const runAction = (action: GalleryStoryActionDefinition) => {
    if (!isGalleryStoryConditionMet(action.conditions, state)) return;
    if (action.kind === 'check') beginCheck(action);
    else if (action.kind === 'combat-start') controller.startStoryCombat(scene.id, action.id);
    else if (action.kind === 'automatic') controller.commitStoryAction(scene.id, action.id);
  };

  const runSpatialAction = (action: AutomaticStoryAction) => {
    if (pendingSpatialAction || !isGalleryStoryConditionMet(action.conditions, state)) return;
    if (resolvedActionIds.has(action.id)) {
      navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
      return;
    }
    if (controller.commitStoryAction(scene.id, action.id)) {
      setPendingSpatialAction({actionId: action.id, nextSceneId: action.nextSceneId});
    }
  };

  useEffect(() => {
    if (
      !pendingSpatialAction
      || state.lastStoryAction?.sceneId !== scene.id
      || state.lastStoryAction.actionId !== pendingSpatialAction.actionId
    ) return;

    const nextSceneId = pendingSpatialAction.nextSceneId;
    setPendingSpatialAction(null);
    navigate(`/campaign/${campaignId}/play/${nextSceneId}`);
  }, [campaignId, navigate, pendingSpatialAction, scene.id, state.lastStoryAction]);

  const requestDiceRoll = (
    expression: string,
    label: string,
    selectionMode: DiceSelectionMode = 'sum',
  ) => {
    resetManualRoll('story-check');
    setRollInput('');
    setDiceExpression(expression);
    setDiceLabel(label);
    setDiceSelection(selectionMode);
    setDiceError(false);
    setIsDieRolling(true);
    setDieRollRequestId((current) => current + 1);
  };

  const resetAdventure = () => {
    closeCheck();
    setDismissedCommandId(null);
    controller.resetSession();
  };

  if (!storyScene) return null;

  const epilogue = storyScene.epilogue;
  const showPublicControls = false;
  const epilogueEndingLabels: Record<string, string> = {
    wedding: 'Штатный голосовой сброс',
    director: 'Режиссёрский монтаж',
    shutdown: 'Физическое отключение',
  };
  const sceneHotspots: SceneHotspot[] = availableSpatialActions.map((action) => ({
    id: action.id,
    label: getSpatialActionLabel(action),
    onSelect: () => runSpatialAction(action),
    position: storyHotspotPositions[scene.id]?.[action.id],
  }));
  const resolvedTransitionConfig = resolvedAction
    ? resolvedTransitionHotspotConfigs[`${scene.id}:${resolvedAction.id}`]
    : undefined;
  const resolvedTransitionHotspot: SceneHotspot | null = resolvedAction
    && activeStoryResult
    && resolvedNextSceneId
    && resolvedNextSceneId !== scene.id
    && !isSpatialTransitionAction(resolvedAction, scene.id)
    && resolvedTransitionConfig
    ? {
        id: `resolved-${activeStoryResult.commandId}`,
        label: resolvedTransitionConfig.label,
        href: `/campaign/${campaignId}/play/${resolvedNextSceneId}`,
        position: resolvedTransitionConfig.position,
      }
    : null;
  const visibleSceneHotspots = resolvedTransitionHotspot
    ? [resolvedTransitionHotspot]
    : sceneHotspots;
  const sceneMasterActions: SceneMasterAction[] = [
    ...availableSpatialActions.map((action): SceneMasterAction => ({
      id: `transition-${action.id}`,
      label: getSpatialActionLabel(action),
      onSelect: () => runSpatialAction(action),
    })),
    ...(resolvedTransitionHotspot ? [{
      id: resolvedTransitionHotspot.id,
      label: resolvedTransitionHotspot.label,
      href: resolvedTransitionHotspot.href,
    }] : []),
    ...masterOnlyActions.map((action): SceneMasterAction => {
      const available = isGalleryStoryConditionMet(action.conditions, state);
      const detail = action.kind === 'check'
        ? 'Выбрать героя'
        : action.kind === 'combat-start'
          ? 'Запуск боевой встречи'
          : 'Решение без броска';

      return {
        id: `story-${action.id}`,
        label: action.label,
        detail: available ? detail : `${detail} · условия пока не выполнены`,
        disabled: !available,
        onSelect: () => directMasterTransitionScenes.has(scene.id) && action.kind === 'automatic'
          ? runSpatialAction(action)
          : runAction(action),
      };
    }),
    ...(emergencyFinalAction && !resolvedActionIds.has(emergencyFinalAction.id) ? [{
      id: 'resolve-last-take-emergency',
      label: 'Поражение группы: открыть последнее физическое действие',
      detail: 'Аварийный fail-forward',
      onSelect: () => controller.commitStoryAction(scene.id, emergencyFinalAction.id),
    }] : []),
    ...(corpDeBalletFallbackAvailable && completionAction ? [{
      id: 'resolve-corp-de-ballet-fallback',
      label: 'Аварийно раскрыть кулисы',
      detail: 'Fail-forward · вернуть героям 1 HP и открыть проход',
      onSelect: () => controller.resolveStoryCombatDefeatFallback(scene.id, completionAction.id),
    }] : []),
    ...(activeShow18Hero ? activeShow18Conditions.flatMap((condition): SceneMasterAction[] => [
      ...(!state.flags['show18-olva-assist-used'] ? [{
        id: `show18-olva-${activeShow18Hero.id}-${condition}`,
        label: `Оливия: снять состояние «${condition === 'shamed' ? 'Стыд' : 'Назначенная роль'}»`,
        detail: activeShow18Hero.name,
        onSelect: () => controller.clearShow18ConditionWithOlva(activeShow18Hero.id, condition),
      }] : []),
      ...((state.itemCharges['red-button-18-plus'] ?? 0) > 0 ? [{
        id: `show18-red-button-${activeShow18Hero.id}-${condition}`,
        label: `Красная кнопка 18+: снять «${condition === 'shamed' ? 'Стыд' : 'Назначенную роль'}»`,
        detail: activeShow18Hero.name,
        onSelect: () => controller.clearShow18ConditionWithRedButton(activeShow18Hero.id, condition),
      }] : []),
    ]) : []),
  ];

  const masterWorkspace = epilogue ? (
    <section className={styles.masterEpilogue} aria-label="Итоги прохождения">
      <span>Выбранный исход</span>
      <strong>{state.selectedEnding
        ? epilogueEndingLabels[state.selectedEnding] ?? state.selectedEnding
        : scene.title}</strong>
      <p>{storyScene.prompt}</p>
      <p>{epilogue.outcome}</p>
      <div>
        <b>Судьба записи</b>
        <p>{state.flags['footage-authorized']
          ? epilogue.recordingAuthorized
          : epilogue.recordingPrivate}</p>
      </div>
      <div>
        <b>Семейное крыло</b>
        <p>{getFamilySummary(state.flags, epilogue)}</p>
      </div>
      {state.inventory.includes('red-button-18-plus')
        && (state.itemCharges['red-button-18-plus'] ?? 0) > 0 ? (
          <div>
            <b>Неиспользованный ресурс</b>
            <p>{epilogue.redButtonUnused}</p>
          </div>
        ) : null}
    </section>
  ) : activeAction?.kind === 'check' && activeCheck ? null : resolvedAction && activeStoryResult ? (
    <section className={styles.masterResolution} role="status">
      <span>{activeStoryResult.result === 'failure' ? 'Осложнение' : 'Исход зафиксирован'}</span>
      <strong>{resolvedAction.label}</strong>
      <p>{resolvedChallengeTrack
        && activeStoryResult.result === 'success'
        && !resolvedChallengeComplete
          ? `${resolvedChallengeTrack.label}: ${state.counters[resolvedChallengeTrack.successCounter]} из ${resolvedChallengeTrack.successesRequired}.`
          : getActionResultText(resolvedAction, activeStoryResult.result)}</p>
      {state.lastRoll?.checkId === resolvedAction.id ? (
        <p className={styles.rollSummary}>
          {state.lastRoll.automatic ? 'Автоматический успех без броска' : <>d20: {state.lastRoll.rolls.join(' / ')} {state.lastRoll.modifier >= 0 ? '+' : '−'}{' '}
          {Math.abs(state.lastRoll.modifier)} = {state.lastRoll.total} против DC {state.lastRoll.dc}</>}
        </p>
      ) : null}
      {resolvedNextSceneId === scene.id ? (
        <button
          type="button"
          onClick={() => setDismissedCommandId(activeStoryResult.commandId)}
        >
          Скрыть результат
        </button>
      ) : null}
    </section>
  ) : storyScene.challenge ? (
    <section className={styles.masterProgress} aria-label="Прогресс испытания">
      <strong>Прогресс испытания</strong>
      {challengeProgressTracks.map((track) => {
        const counterTracks = storyScene.challenge!.tracks.filter((candidate) => (
          candidate.successCounter === track.successCounter
        ));
        return (
          <div key={track.successCounter}>
            <span>{counterTracks.length === 1
              ? track.label
              : counterTracks.map((candidate) => candidate.label).join(' · ')}</span>
            <b>{state.counters[track.successCounter]} / {track.successesRequired}</b>
          </div>
        );
      })}
      <div>
        <span>Общие провалы</span>
        <b>{challengeFailureCount} / {storyScene.challenge.failureLimit}</b>
      </div>
      {challengeLocked ? <p>Лимит провалов достигнут: используйте доступный fail-forward.</p> : null}
    </section>
  ) : undefined;

  const sceneContent = state.combat ? (
    <>
      <CombatEncounterHud
        combat={state.combat}
        definition={getCampaignCombatPresentation(penisuelaGalleryGameplay, state.flags)}
        diceError={diceError}
        diceReady={isDiceReady}
        fallbackEnemyToken={scene.background}
        heroes={controller.sessionHeroes}
        heroHp={state.heroHp}
        participantTemporaryModifiers={state.participantTemporaryModifiers}
        participantConditions={Object.fromEntries(controller.sessionHeroes.map((hero) => [
          hero.id,
          controller.getParticipantConditions(hero.id),
        ]))}
        timelineEvents={state.events}
        inventoryState={state.inventoryState}
        heroTokens={heroTokens}
        inputValue={rollInput}
        isRolling={isDieRolling}
        onApplyDamage={controller.applyCombatDamage}
        onCancelPendingAttack={controller.cancelPendingCombatAttackWithRedButton}
        onDefeatFallback={[
          'universal-advice-algorithm',
          'dressing-room-mirror-doubles',
        ].includes(state.combat.encounterId)
          ? controller.resolveCombatDefeatFallback
          : undefined}
        onContinue={() => {
          if (state.flags[`combat-defeat-fallback-${state.combat?.encounterId}`]) {
            const encounter = penisuelaGalleryGameplay.encounters.find((candidate) => (
              candidate.id === state.combat?.encounterId
            ));
            const fallbackAction = storyScene?.actions.find((action) => (
              action.id === encounter?.defeatFallback?.completionActionId
            ));
            if (fallbackAction && controller.completeCombatDefeatFallback(scene.id)) {
              navigate(`/campaign/${campaignId}/play/${fallbackAction.nextSceneId}`);
            }
            return;
          }
          if (completionAction) controller.completeStoryCombat(scene.id, completionAction.id);
        }}
        onEnemyAttack={controller.enemyAttack}
        onEquipItem={controller.equipCombatItem}
        onHeroAttack={controller.heroAttack}
        onSummonedAllyAttack={controller.summonedAllyAttack}
        onResolveSavingThrow={controller.resolveCombatSavingThrow}
        onInputChange={setRollInput}
        onResetDie={() => {
          setRollInput('');
          setIsDieRolling(false);
          setDiceError(false);
        }}
        onRoll={requestDiceRoll}
        onSelectAction={controller.selectCombatAction}
        onUseAction={controller.useCombatAction}
        resourceUses={state.resourceUses}
        suggestedEnemyTargetId={controller.getNpcDecision(
          state.combat.initiativeOrder[state.combat.turnIndex] ?? '',
        )?.suggestion.targetIds[0]}
        victoryWordmark="assets/concepts/campaigns/penisuela/ui/victory-wordmark.png"
      />
    </>
  ) : (
    <>
      {kreedNarrationScenes.has(scene.id) ? (
        <SceneTextPanel appearance="narration" readAloud={groomArrival?.readAloud ?? scene.readAloud} resetKey={scene.id} />
      ) : <SceneTextPanel
        className={styles.panel}
        resetKey={`${scene.id}:${state.events.length}:${dismissedCommandId ?? 'open'}`}
      >
        <p className={styles.eyebrow}>{scene.eyebrow}</p>
        <h1>{scene.title}</h1>
        <p className={styles.speaker}>Рассказчик</p>
        <p className={styles.readAloud}>{scene.readAloud}</p>

        {showPublicControls && epilogue ? (
          <div className={styles.epilogue} aria-label="Итоги прохождения">
            <p className={styles.prompt}>{storyScene.prompt}</p>
            <article className={styles.summaryPrimary}>
              <span>Выбранный исход</span>
              <strong>{state.selectedEnding
                ? epilogueEndingLabels[state.selectedEnding] ?? state.selectedEnding
                : scene.title}</strong>
              <p>{epilogue.outcome}</p>
            </article>
            <div className={styles.summaryGrid}>
              <article>
                <span>Судьба записи</span>
                <p>{state.flags['footage-authorized']
                  ? epilogue.recordingAuthorized
                  : epilogue.recordingPrivate}</p>
              </article>
              <article>
                <span>Семейное крыло</span>
                <p>{getFamilySummary(state.flags, epilogue)}</p>
              </article>
              {state.inventory.includes('red-button-18-plus')
                && (state.itemCharges['red-button-18-plus'] ?? 0) > 0 ? (
                  <article>
                    <span>Неиспользованный ресурс</span>
                    <p>{epilogue.redButtonUnused}</p>
                  </article>
                ) : null}
            </div>
          </div>
        ) : showPublicControls && resolvedAction && activeStoryResult ? (
          <div className={styles.resolution} role="status">
            <span>{activeStoryResult.result === 'failure' ? 'Осложнение' : 'Исход зафиксирован'}</span>
            <strong>{resolvedAction.label}</strong>
            <p>{resolvedChallengeTrack
              && activeStoryResult.result === 'success'
              && !resolvedChallengeComplete
                ? `${resolvedChallengeTrack.label}: успех зафиксирован. Набрано ${state.counters[resolvedChallengeTrack.successCounter]} из ${resolvedChallengeTrack.successesRequired}.`
                : getActionResultText(resolvedAction, activeStoryResult.result)}</p>
            {resolvedChallengeTrack && storyScene.challenge ? (
              <p className={styles.challengeAttempt}>
                Общие провалы: {challengeFailureCount} из {storyScene.challenge.failureLimit}.
              </p>
            ) : null}
            {state.lastRoll?.checkId === resolvedAction.id ? (
              <p className={styles.rollSummary}>
                {state.lastRoll.automatic ? 'Автоматический успех без броска' : <>d20: {state.lastRoll.rolls.join(' / ')} {state.lastRoll.modifier >= 0 ? '+' : '−'}{' '}
                {Math.abs(state.lastRoll.modifier)} = {state.lastRoll.total}
                {' '}против DC {state.lastRoll.dc}</>}
              </p>
            ) : null}
          </div>
        ) : showPublicControls && activeAction?.kind === 'check' && activeCheck ? null : showPublicControls ? (
          <div className={styles.storyBody}>
            <p className={styles.prompt}>{storyScene.prompt}</p>
            {storyScene.challenge ? (
              <section className={styles.challengeProgress} aria-label="Прогресс испытания">
                {challengeProgressTracks.map((track) => {
                  const counterTracks = storyScene.challenge!.tracks.filter((candidate) => (
                    candidate.successCounter === track.successCounter
                  ));
                  return (
                  <div key={track.successCounter}>
                    <span>{counterTracks.length === 1
                      ? track.label
                      : counterTracks.map((candidate) => candidate.label).join(' · ')}</span>
                    <strong>{state.counters[track.successCounter]} / {track.successesRequired}</strong>
                  </div>
                  );
                })}
                <div>
                  <span>Общие провалы</span>
                  <strong>{challengeFailureCount} / {storyScene.challenge.failureLimit}</strong>
                </div>
                {challengeLocked ? (
                  <p>Лимит провалов достигнут: проверки закрыты, используйте доступный fail-forward.</p>
                ) : null}
              </section>
            ) : null}
            <div className={styles.actionGrid} aria-label="Открытые действия сцены">
              {visibleActions.map((action) => {
                const available = isGalleryStoryConditionMet(action.conditions, state);
                const checkLabel = action.kind === 'check'
                  ? `${action.check.stats.map((stat) => statLabels[stat]).join(' / ')} · DC ${action.check.dc}`
                  : action.kind === 'combat-start' ? 'Боевая встреча' : 'Сюжетное решение';
                return (
                  <article key={action.id} className={!available ? styles.actionUnavailable : undefined}>
                    <span>{checkLabel}</span>
                    <h2>{action.label}</h2>
                    <p>{action.description}</p>
                    <button
                      disabled={!available}
                      type="button"
                      onClick={() => runAction(action)}
                    >
                      {available ? action.kind === 'check' ? 'Выбрать героя и бросить d20' : 'Зафиксировать решение' : 'Условия ещё не выполнены'}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </SceneTextPanel>}

    </>
  );

  const interactiveContent = (
    <>
      {activeAction?.kind === 'check' && activeCheck && selectedHero && resolvedStat && !state.combat ? <SceneCheckPanel
        key={activeAction.id} checkId={activeAction.id} label={activeAction.label} hint={activeAction.description}
        dc={(heroId) => getStoryCheckSettings(activeCheck, state, heroId, resolvedStat).dc}
        advantage={advantageActive} selectedHeroId={selectedHero.id} selectedStat={resolvedStat} stats={activeCheck.stats}
        heroes={eligibleHeroes.map((hero) => ({id: hero.id, name: hero.name, token: heroTokens[hero.id],
          stats: {...hero.stats, [resolvedStat]: getStoryCheckSettings(activeCheck, state, hero.id, resolvedStat).modifier + (useClearChoiceConfirmation ? 2 : 0)},
        }))}
        onSelectHero={setSelectedHeroId} onSelectStat={setSelectedStat} onClose={closeCheck}
        bonusResource={clearChoiceAvailable ? {label: `Подтверждение ясного выбора · +2 ${useClearChoiceConfirmation ? 'включено' : 'выключено'}`,
          active: useClearChoiceConfirmation, onToggle: () => setUseClearChoiceConfirmation((value) => !value)} : undefined}
        automaticSuccess={getAutomaticCheckReward(state, selectedHero.id, resolvedStat) ? {
          ...getAutomaticCheckReward(state, selectedHero.id, resolvedStat)!, onUse: () => {
            const result = controller.resolveStoryActionCheck(scene.id, activeAction.id, selectedHero.id, resolvedStat, undefined, false, GREY_WIESE_PERFUME_ID);
            if (result) closeCheck();
            return Boolean(result);
          },
        } : undefined}
        onResolve={(_roll, rolls) => {
          if (controller.resolveStoryActionCheck(scene.id, activeAction.id, selectedHero.id, resolvedStat, rolls, useClearChoiceConfirmation)) closeCheck();
        }}
      /> : null}
      {!state.combat && !epilogue ? (
        <SceneHotspotLayer hotspots={visibleSceneHotspots} />
      ) : null}
      {sceneContent}
      {state.combat ? <D20Roller
        diceExpression={diceExpression}
        requestId={dieRollRequestId}
        rollLabel={diceLabel}
        rolling={isDieRolling}
        selectionMode={diceSelection}
        onError={() => {
          setIsDieRolling(false);
          setDiceError(true);
        }}
        onReadyChange={setIsDiceReady}
        onResult={(result) => {
          setRollInput(String(result));
          setIsDieRolling(false);
        }}
      /> : null}
    </>
  );

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      backHref={backHref}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={campaignScenes}
          controller={controller}
          definition={penisuelaGalleryGameplay}
          scene={scene}
        />
      )}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={controller.managedInspectableIds}
      masterActions={sceneMasterActions}
      masterContent={masterWorkspace}
      onMasterSceneRestart={resetAdventure}
      onMasterStepBack={kreedNarrationScenes.has(scene.id) && controller.canUndoLastActionInScope(scene.id)
        ? () => { controller.undoLastAction(scene.id); }
        : undefined}
      scene={scene}
      interactiveContent={interactiveContent}
    />
  );
}
