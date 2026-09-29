import {SceneDecisionModal} from '../../../../features/navigate-campaign-scene/ui/SceneDecisionModal/SceneDecisionModal';
import {getAutomaticCheckReward, GREY_WIESE_PERFUME_ID} from '../../../../entities/campaign-session/model/partyRewards';
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import type {
  GalleryStoryOutcome,
  HeroStat,
} from '../../../../entities/campaign-session/model/galleryGameplay';
import {
  getPussyTrustDc,
  getPussyAudienceViewId,
  PUSSY_BAR_PASSES_ITEM_ID,
  PUSSY_BAR_PASSES_QUANTITY,
  PUSSY_INTIMIDATION_CHECK_ID,
  PUSSY_TRUST_CHECK_ID,
  type PussyAudienceCheckId,
} from '../../../../entities/campaign-session/model/pussyAudienceRules';
import type {
  CampaignOutfitCategoryId,
  CampaignSceneInspectable,
  CampaignSessionScene,
} from '../../../../entities/campaign-session/model/types';
import {InspectableArtifactDialog} from '../../../../entities/campaign-session/ui/InspectableArtifactDialog/InspectableArtifactDialog';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {canEnterHotelBar} from '../../../../entities/campaign-session/model/hotelBarAccess';
import {SceneCheckPanel} from '../../../../features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel';
import type {SceneMasterAction} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {
  SceneHotspotLayer,
  type SceneHotspot,
} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {SceneReturnButton} from '../../../../features/navigate-campaign-scene/ui/SceneReturnButton/SceneReturnButton';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {CombatEncounterHud} from '../CombatEncounterHud/CombatEncounterHud';
import {
  AlexisOutfitBuilder,
  type AlexisOutfitOffsets,
  type AlexisOutfitSelections,
} from '../AlexisOutfitBuilder/AlexisOutfitBuilder';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import styles from './HotelGalleryAdventure.module.css';

const HOTEL_GALLERY_SCENE_IDS = [
  'hotel-gallery',
  'alexis-room',
  'pussy-audience',
  'pussy-prop-room',
  'pussy-scepter-return',
  'alexis-room-after-pussy',
] as const;

type HotelGallerySceneId = (typeof HOTEL_GALLERY_SCENE_IDS)[number];
type AlexisOutcome = 'excellent' | 'sufficient' | null;
type AlexisRewardModal = 'certificate' | 'bar-permits' | null;
type AlexisView = 'room' | 'outfit-builder';
type QuestDecision = 'accepted' | 'declined' | null;
type RewardDecision = 'accepted' | 'declined' | null;
type PropRoomCheckId = 'recover-pussy-scepter'
  | 'recover-pussy-scepter-with-engineering'
  | 'recover-pussy-scepter-with-tiny-linda';

interface HotelGalleryAdventureState {
  version: 3;
  activeSceneId: HotelGallerySceneId;
  alexisView: AlexisView;
  alexisSubmitted: boolean;
  outfitOffsets: AlexisOutfitOffsets;
  outfitSelections: AlexisOutfitSelections;
  alexisOutcome: AlexisOutcome;
  audienceOutcome: 'earned' | 'fail-forward' | null;
  questDecision: QuestDecision;
  scepterReturned: boolean;
  rewardDecision: RewardDecision;
}

interface HotelGalleryAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const STORAGE_VERSION = 3;
const STORAGE_KEY_PREFIX = 'dnd:hotel-gallery-adventure:';
const WOMANIZER_ITEM_ID = 'pussy-sultan-womanizer';
const PUSSY_REWARD_ITEM_IDS = [PUSSY_BAR_PASSES_ITEM_ID, WOMANIZER_ITEM_ID] as const;
const ALEXIS_CERTIFICATE_ITEM_ID = 'alexis-fashion-expert-certificate';
const ALEXIS_BAR_PERMIT_ART = 'assets/concepts/campaigns/penisuela/items/closed-bar-token.png';
const GUARD_ENCOUNTER_ID = 'hotel-bar-arcane-guards';
const GUARD_SCENE_BACKGROUND = 'assets/concepts/campaigns/penisuela/scenes/hotel-gallery-arcane-guards.png';
const SULTAN_GUARD_ENCOUNTER_ID = 'hotel-vip-guards';
const SULTAN_GUARD_TOKEN = 'assets/concepts/campaigns/penisuela/ui/enemy-tokens/hotel-vip-guard.png';
const SULTAN_GUARD_SCENE_BACKGROUND = 'assets/concepts/campaigns/penisuela/scenes/pussy-sultan-suite-three-vip-guards.png';
const SULTAN_GUARD_VICTORY_BACKGROUND = 'assets/concepts/campaigns/penisuela/scenes/pussy-sultan-suite-three-vip-guards-defeated.png';
const VICTORY_WORDMARK = 'assets/concepts/campaigns/penisuela/ui/victory-wordmark.png';
const PROP_ROOM_ENCOUNTER_ID = 'prop-room-winding-carriers';
const PROP_ROOM_CARRIER_TOKEN = 'assets/concepts/campaigns/penisuela/ui/enemy-tokens/winding-palanquin-carrier.png';
const HERO_TOKEN_PATHS: Record<string, string> = {
  bubsilda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/bubsilda.png',
  linda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/linda.png',
  lambert: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/lambert.png',
  'golovach-lena': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/golovach-lena.png',
  'thorin-pukoshchit': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/thorin-pukoshchit.png',
};
const EMPTY_OUTFIT_SELECTIONS: AlexisOutfitSelections = {
  top: null,
  bottom: null,
  accent: null,
};
const EMPTY_OUTFIT_OFFSETS: AlexisOutfitOffsets = {
  top: 0,
  bottom: 0,
  accent: 0,
};
const PROP_ROOM_CHECK_CONFIG: Record<PropRoomCheckId, {heroId: string; stat: HeroStat}> = {
  'recover-pussy-scepter-with-tiny-linda': {heroId: 'linda', stat: 'dexterity'},
  'recover-pussy-scepter-with-engineering': {heroId: 'lambert', stat: 'intelligence'},
  'recover-pussy-scepter': {heroId: 'golovach-lena', stat: 'strength'},
};
export const hotelGalleryAdventureSceneIds: ReadonlySet<string> = new Set(HOTEL_GALLERY_SCENE_IDS);

function isHotelGallerySceneId(value: string): value is HotelGallerySceneId {
  return hotelGalleryAdventureSceneIds.has(value);
}

function readAlexisOutcome(value: unknown): AlexisOutcome {
  if (value === 'excellent' || value === 'verdict') return 'excellent';
  if (value === 'sufficient' || value === 'complication') return 'sufficient';
  return null;
}

function isAlexisView(value: unknown): value is AlexisView {
  return value === 'room' || value === 'outfit-builder';
}

function readOutfitSelections(value: unknown): AlexisOutfitSelections {
  if (!value || typeof value !== 'object') return {...EMPTY_OUTFIT_SELECTIONS};
  const selections = value as Partial<Record<CampaignOutfitCategoryId, unknown>>;
  return {
    top: typeof selections.top === 'string' ? selections.top : null,
    bottom: typeof selections.bottom === 'string' ? selections.bottom : null,
    accent: typeof selections.accent === 'string' ? selections.accent : null,
  };
}

function readOutfitOffsets(value: unknown, legacyPage: unknown): AlexisOutfitOffsets {
  const legacyOffset = typeof legacyPage === 'number' && Number.isInteger(legacyPage)
    ? Math.max(0, legacyPage * 2)
    : 0;
  if (!value || typeof value !== 'object') {
    return {top: legacyOffset, bottom: legacyOffset, accent: legacyOffset};
  }
  const offsets = value as Partial<Record<CampaignOutfitCategoryId, unknown>>;
  return {
    top: typeof offsets.top === 'number' && Number.isInteger(offsets.top) ? Math.max(0, offsets.top) : legacyOffset,
    bottom: typeof offsets.bottom === 'number' && Number.isInteger(offsets.bottom) ? Math.max(0, offsets.bottom) : legacyOffset,
    accent: typeof offsets.accent === 'number' && Number.isInteger(offsets.accent) ? Math.max(0, offsets.accent) : legacyOffset,
  };
}

function isAlexisSceneId(value: HotelGallerySceneId): boolean {
  return value === 'alexis-room' || value === 'alexis-room-after-pussy';
}

function isAudienceOutcome(value: unknown): value is 'earned' | 'fail-forward' {
  return value === 'earned' || value === 'fail-forward';
}

function isQuestDecision(value: unknown): value is Exclude<QuestDecision, null> {
  return value === 'accepted' || value === 'declined';
}

function isRewardDecision(value: unknown): value is Exclude<RewardDecision, null> {
  return value === 'accepted' || value === 'declined';
}

function initialState(activeSceneId: HotelGallerySceneId): HotelGalleryAdventureState {
  return {
    version: STORAGE_VERSION,
    activeSceneId,
    alexisView: 'room',
    alexisSubmitted: false,
    outfitOffsets: {...EMPTY_OUTFIT_OFFSETS},
    outfitSelections: {...EMPTY_OUTFIT_SELECTIONS},
    alexisOutcome: null,
    audienceOutcome: null,
    questDecision: null,
    scepterReturned: false,
    rewardDecision: null,
  };
}

function normalizeEntry(
  state: HotelGalleryAdventureState,
  activeSceneId: HotelGallerySceneId,
): HotelGalleryAdventureState {
  const next = {...state, activeSceneId};

  if (!isAlexisSceneId(activeSceneId) || !isAlexisSceneId(state.activeSceneId)) {
    next.alexisView = 'room';
  }

  return next;
}

function readStoredState(
  campaignId: string,
  activeSceneId: HotelGallerySceneId,
): HotelGalleryAdventureState {
  const fallback = initialState(activeSceneId);
  if (typeof window === 'undefined') return fallback;

  try {
    const rawValue = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${campaignId}`);
    if (!rawValue) return fallback;

    const value = JSON.parse(rawValue) as Partial<HotelGalleryAdventureState> & {outfitPage?: unknown};
    if (value.version !== STORAGE_VERSION) return fallback;

    return normalizeEntry({
      ...fallback,
      alexisView: isAlexisView(value.alexisView) ? value.alexisView : 'room',
      alexisSubmitted: value.alexisSubmitted === true,
      outfitOffsets: readOutfitOffsets(value.outfitOffsets, value.outfitPage),
      outfitSelections: readOutfitSelections(value.outfitSelections),
      alexisOutcome: readAlexisOutcome(value.alexisOutcome),
      audienceOutcome: isAudienceOutcome(value.audienceOutcome) ? value.audienceOutcome : null,
      questDecision: isQuestDecision(value.questDecision) ? value.questDecision : null,
      scepterReturned: value.scepterReturned === true,
      rewardDecision: isRewardDecision(value.rewardDecision) ? value.rewardDecision : null,
    }, activeSceneId);
  } catch {
    return fallback;
  }
}

function writeStoredState(campaignId: string, state: HotelGalleryAdventureState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${campaignId}`, JSON.stringify(state));
  } catch {
    // The hotel hub remains playable when persistent storage is unavailable.
  }
}

function createSharedOutcome(
  current: HotelGalleryAdventureState,
  next: HotelGalleryAdventureState,
): GalleryStoryOutcome | null {
  const flags: Record<string, boolean> = {};
  const acquire: string[] = [];
  const remove: string[] = [];

  if (current.alexisOutcome !== next.alexisOutcome && next.alexisOutcome) {
    const excellent = next.alexisOutcome === 'excellent';
    flags['alexis-room-resolved'] = true;
    flags['alexis-style-stabilized'] = true;
    flags['alexis-style-verdict'] = excellent;
    flags['alexis-costume-complication'] = false;
    flags['alexis-outfit-excellent'] = excellent;
    flags['alexis-outfit-sufficient'] = !excellent;
    flags['alexis-fashion-certificate-received'] = excellent;
    flags['alexis-bar-permits-issued'] = true;
    flags[`bridge-${next.activeSceneId}-alexis-style-resolution-resolved`] = true;
    if (excellent) acquire.push(ALEXIS_CERTIFICATE_ITEM_ID);
    else remove.push(ALEXIS_CERTIFICATE_ITEM_ID);
  } else if (current.alexisOutcome !== null && next.alexisOutcome === null) {
    flags['alexis-room-resolved'] = false;
    flags['alexis-style-stabilized'] = false;
    flags['alexis-style-verdict'] = false;
    flags['alexis-costume-complication'] = false;
    flags['alexis-outfit-excellent'] = false;
    flags['alexis-outfit-sufficient'] = false;
    flags['alexis-fashion-certificate-received'] = false;
    flags['alexis-bar-permits-issued'] = false;
    flags['bridge-alexis-room-alexis-style-resolution-resolved'] = false;
    flags['bridge-alexis-room-after-pussy-alexis-style-resolution-resolved'] = false;
    remove.push(ALEXIS_CERTIFICATE_ITEM_ID);
  }
  if (!Object.keys(flags).length && !acquire.length && !remove.length) return null;
  return {
    flags,
    inventory: {
      ...(acquire.length ? {acquire} : {}),
      ...(remove.length ? {remove} : {}),
    },
  };
}

export function HotelGalleryAdventure({
  campaignId,
  campaignScenes,
  scene,
}: HotelGalleryAdventureProps) {
  const navigate = useNavigate();
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const entrySceneId = isHotelGallerySceneId(scene.id) ? scene.id : 'hotel-gallery';
  const [state, setState] = useState<HotelGalleryAdventureState>(() =>
    readStoredState(campaignId, entrySceneId));
  const stateRef = useRef(state);
  const sharedController = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
    {sceneScopeId: state.activeSceneId},
  );
  const [alexisRewardModal, setAlexisRewardModal] = useState<AlexisRewardModal>(null);
  const [pussyPassesModalOpen, setPussyPassesModalOpen] = useState(false);
  const [barPassageBlocked, setBarPassageBlocked] = useState(false);
  const [pussyPassesModalUndoOnBack, setPussyPassesModalUndoOnBack] = useState(false);
  const [pussyRewardPreviewIndex, setPussyRewardPreviewIndex] = useState<number | null>(null);
  const [pussyRewardPreviewUndoOnBack, setPussyRewardPreviewUndoOnBack] = useState(false);
  const [activeAudienceCheckId, setActiveAudienceCheckId] = useState<PussyAudienceCheckId | null>(null);
  const [selectedAudienceHeroId, setSelectedAudienceHeroId] = useState(
    penisuelaGalleryHeroes[0]?.id ?? '',
  );
  const [combatRoll, setCombatRoll] = useState('');
  const [combatDiceExpression, setCombatDiceExpression] = useState('1d20');
  const [combatDiceLabel, setCombatDiceLabel] = useState('Бросок d20');
  const [combatDiceSelection, setCombatDiceSelection] = useState<DiceSelectionMode>('sum');
  const [combatDiceRequestId, setCombatDiceRequestId] = useState(0);
  const [combatDiceRolling, setCombatDiceRolling] = useState(false);
  const [combatDiceReady, setCombatDiceReady] = useState(false);
  const [combatDiceError, setCombatDiceError] = useState(false);
  const [activePropRoomCheckId, setActivePropRoomCheckId] = useState<PropRoomCheckId | null>(null);
  const gallerySessionState = sharedController.state;
  const sultanGuardCombat = gallerySessionState.combat?.encounterId === SULTAN_GUARD_ENCOUNTER_ID
    ? gallerySessionState.combat
    : null;
  const guardCombat = gallerySessionState.combat?.encounterId === GUARD_ENCOUNTER_ID
    ? gallerySessionState.combat
    : null;
  const propRoomCombat = gallerySessionState.combat?.encounterId === PROP_ROOM_ENCOUNTER_ID
    ? gallerySessionState.combat
    : null;
  const activeCombat = sultanGuardCombat ?? guardCombat ?? propRoomCombat;
  const scepterRecovered = Boolean(gallerySessionState.flags['scepter-recovered']);
  const propRoomForceOnly = Boolean(gallerySessionState.flags['prop-room-force-only']);
  const propRoomCarriersAwakened = Boolean(gallerySessionState.flags['prop-room-carriers-awakened']);
  const propRoomCarriersDefeated = Boolean(gallerySessionState.flags['prop-room-carriers-defeated']);
  const pussyTrustMax = Boolean(gallerySessionState.flags['pussy-trust-max']);
  const pussyTrustRefused = Boolean(gallerySessionState.flags['pussy-trust-refused']);
  const pussyIntimidated = Boolean(gallerySessionState.flags['pussy-intimidated']);
  const pussyAudienceViewId = getPussyAudienceViewId(gallerySessionState.flags);
  const pussyGuardsDefeated = Boolean(gallerySessionState.flags['pussy-guards-defeated']);
  const pussyGuardsAwaitingBattle = state.activeSceneId === 'pussy-audience'
    && Boolean(gallerySessionState.flags['pussy-guards-summoned'])
    && !pussyGuardsDefeated
    && !gallerySessionState.combat;
  const pussyBarPassesIssued = Boolean(gallerySessionState.flags['pussy-bar-passes-issued']);
  const pussyQuestAccepted = Boolean(gallerySessionState.flags['pussy-quest-accepted']);
  const scepterReturned = Boolean(gallerySessionState.flags['scepter-returned']);
  const rewardDecision: RewardDecision = gallerySessionState.flags['pussy-reward-received']
    ? 'accepted'
    : gallerySessionState.flags['pussy-reward-declined']
      ? 'declined'
      : null;

  const updateState = useCallback((
    update: (current: HotelGalleryAdventureState) => HotelGalleryAdventureState,
  ) => {
    const current = stateRef.current;
    const next = update(current);
    stateRef.current = next;
    setState(next);
    writeStoredState(campaignId, next);
    const sharedOutcome = createSharedOutcome(current, next);
    if (sharedOutcome) sharedController.commitStoryOutcome(sharedOutcome);
  }, [campaignId, sharedController]);

  const replaceLocalState = useCallback((
    update: (current: HotelGalleryAdventureState) => HotelGalleryAdventureState,
  ) => {
    const next = update(stateRef.current);
    stateRef.current = next;
    setState(next);
    writeStoredState(campaignId, next);
  }, [campaignId]);

  const recordedAlexisOutcome: AlexisOutcome = gallerySessionState.flags['alexis-outfit-excellent']
    ? 'excellent' : gallerySessionState.flags['alexis-room-resolved'] ? 'sufficient' : null;
  useEffect(() => {
    // The journal also changes through the full GM console and persisted undo.
    // Keep the outfit screen in sync without issuing another reward command.
    if (stateRef.current.alexisOutcome === recordedAlexisOutcome) return;
    replaceLocalState((current) => ({...current, alexisOutcome: recordedAlexisOutcome,
      alexisView: 'room', alexisSubmitted: recordedAlexisOutcome === null}));
    if (recordedAlexisOutcome === null) setAlexisRewardModal(null);
  }, [recordedAlexisOutcome, replaceLocalState]);

  useEffect(() => {
    const nextSceneId = scene.id;
    if (!isHotelGallerySceneId(nextSceneId) || nextSceneId === stateRef.current.activeSceneId) return;
    updateState((current) => normalizeEntry(current, nextSceneId));
  }, [scene.id, updateState]);

  const activeScene = useMemo(
    () => campaignScenes.find((candidate) => candidate.id === state.activeSceneId) ?? scene,
    [campaignScenes, scene, state.activeSceneId],
  );
  const pussyRewardArtifacts = useMemo(
    () => PUSSY_REWARD_ITEM_IDS
      .map((id) => campaignScenes
        .flatMap((candidate) => candidate.inspectables)
        .find((artifact) => artifact.id === id))
      .filter((artifact): artifact is CampaignSceneInspectable => Boolean(artifact)),
    [campaignScenes],
  );
  const activePussyRewardArtifact = pussyRewardPreviewIndex === null
    ? undefined
    : pussyRewardArtifacts[pussyRewardPreviewIndex];
  const presentedScene = useMemo<CampaignSessionScene>(() => {
    if (sultanGuardCombat || pussyGuardsAwaitingBattle) {
      const guardsDefeated = pussyGuardsDefeated
        || (sultanGuardCombat && Object.values(sultanGuardCombat.enemies).every((enemy) => enemy.hp <= 0));
      return {
        ...activeScene,
        title: guardsDefeated ? 'Три VIP-стражника повержены' : 'Три VIP-стражника Pussy Sultan',
        background: guardsDefeated
          ? SULTAN_GUARD_VICTORY_BACKGROUND
          : SULTAN_GUARD_SCENE_BACKGROUND,
        alt: guardsDefeated
          ? 'Pussy Sultan сидит среди трёх поверженных VIP-стражников в разгромленном чёрно-золотом номере.'
          : 'Три VIP-стражника перекрывают выход из чёрно-золотого номера Pussy Sultan.',
        readAloud: guardsDefeated
          ? penisuelaGalleryGameplay.encounters.find((encounter) => encounter.id === SULTAN_GUARD_ENCOUNTER_ID)?.victoryText ?? activeScene.readAloud
          : penisuelaGalleryGameplay.encounters.find((encounter) => encounter.id === SULTAN_GUARD_ENCOUNTER_ID)?.startText ?? activeScene.readAloud,
      };
    }

    if (guardCombat) {
      return {
        ...activeScene,
        title: 'Руническая охрана отеля',
        background: GUARD_SCENE_BACKGROUND,
        alt: 'Три неживых стража из чёрного стекла и красно-золотых рун перекрывают лестницу к бару.',
        readAloud: penisuelaGalleryGameplay.encounters.find((encounter) => encounter.id === GUARD_ENCOUNTER_ID)?.startText ?? activeScene.readAloud,
      };
    }

    if (state.activeSceneId === 'pussy-audience') {
      const intimidationView = activeScene.interactionViews?.find((view) => view.id === pussyAudienceViewId);
      return {
        ...activeScene,
        background: pussyGuardsDefeated
          ? SULTAN_GUARD_VICTORY_BACKGROUND
          : intimidationView?.background ?? activeScene.background,
        alt: pussyGuardsDefeated
          ? 'Pussy Sultan сидит среди трёх поверженных VIP-стражников в разгромленном чёрно-золотом номере.'
          : intimidationView?.alt ?? activeScene.alt,
        readAloud: pussyGuardsDefeated
          ? penisuelaGalleryGameplay.encounters.find((encounter) => encounter.id === SULTAN_GUARD_ENCOUNTER_ID)?.victoryText ?? activeScene.readAloud
          : intimidationView?.readAloud ?? activeScene.readAloud,
      };
    }

    if (state.activeSceneId === 'pussy-prop-room') {
      const viewId = propRoomCarriersDefeated
        ? 'carriers-defeated'
        : propRoomCarriersAwakened || propRoomCombat
          ? 'carriers-awakened'
          : propRoomForceOnly
            ? 'force-only'
            : null;
      const propRoomView = viewId
        ? activeScene.interactionViews?.find((view) => view.id === viewId)
        : undefined;
      if (propRoomView) {
        return {
          ...activeScene,
          background: propRoomView.background,
          alt: propRoomView.alt,
          readAloud: propRoomView.readAloud ?? activeScene.readAloud,
        };
      }
    }

    if (state.activeSceneId === 'pussy-scepter-return' && rewardDecision === 'accepted') {
      return {
        ...activeScene,
        readAloud: activeScene.readAloud,
      };
    }

    if (isAlexisSceneId(state.activeSceneId) && state.alexisView === 'outfit-builder') {
      const outfitBuilderView = activeScene.interactionViews?.find((view) => view.id === 'outfit-builder');
      if (outfitBuilderView) {
        return {
          ...activeScene,
          background: outfitBuilderView.background,
          alt: outfitBuilderView.alt,
          readAloud: outfitBuilderView.readAloud ?? activeScene.readAloud,
        };
      }
    }

    if (isAlexisSceneId(state.activeSceneId) && state.alexisOutcome) return {...activeScene, readAloud: penisuelaGalleryGameplay.doomMilestones?.find((item) => item.id === 'alexis-outfit')?.readAloud ?? activeScene.readAloud};
    return activeScene;
  }, [
    activeScene,
    state.alexisOutcome,
    guardCombat,
    sultanGuardCombat,
    pussyGuardsAwaitingBattle,
    propRoomCarriersAwakened,
    propRoomCarriersDefeated,
    propRoomCombat,
    propRoomForceOnly,
    pussyGuardsDefeated,
    pussyIntimidated,
    pussyAudienceViewId,
    pussyQuestAccepted,
    pussyTrustMax,
    pussyTrustRefused,
    rewardDecision,
    state.activeSceneId,
    state.alexisView,
  ]);
  const outfitBuilderDefinition = useMemo(() => activeScene.interactionViews
    ?.find((view) => view.id === 'outfit-builder')
    ?.outfitBuilder, [activeScene.interactionViews]);
  const barHref = `/campaign/${campaignId}/play/closed-bar`;

  const goToScene = useCallback((nextSceneId: HotelGallerySceneId) => {
    updateState((current) => normalizeEntry(current, nextSceneId));
    navigate(`/campaign/${campaignId}/play/${nextSceneId}`);
  }, [campaignId, navigate, updateState]);

  const goToHub = useCallback(() => goToScene('hotel-gallery'), [goToScene]);
  const openOutfitBuilder = useCallback(() => {
    updateState((current) => ({...current, alexisView: 'outfit-builder', alexisSubmitted: false}));
  }, [updateState]);
  const closeOutfitBuilder = useCallback(() => {
    updateState((current) => ({...current, alexisView: 'room', alexisSubmitted: false}));
  }, [updateState]);
  const submitOutfit = useCallback(() => {
    updateState((current) => ({...current, alexisView: 'room', alexisSubmitted: true}));
  }, [updateState]);
  const selectOutfitOption = useCallback((
    categoryId: CampaignOutfitCategoryId,
    optionId: string | null,
  ) => {
    updateState((current) => ({
      ...current,
      outfitSelections: {
        ...current.outfitSelections,
        [categoryId]: optionId,
      },
    }));
  }, [updateState]);
  const changeOutfitOffset = useCallback((
    categoryId: CampaignOutfitCategoryId,
    offset: number,
  ) => {
    updateState((current) => ({
      ...current,
      outfitOffsets: {...current.outfitOffsets, [categoryId]: offset},
    }));
  }, [updateState]);

  const resolveAlexisOutfit = useCallback((outcome: Exclude<AlexisOutcome, null>) => {
    if (stateRef.current.alexisOutcome !== null) return;
    updateState((current) => ({...current, alexisOutcome: outcome}));
    setAlexisRewardModal(outcome === 'excellent' ? 'certificate' : 'bar-permits');
  }, [updateState]);

  const closeAlexisRewardModal = useCallback(() => {
    setAlexisRewardModal((current) => current === 'certificate' ? 'bar-permits' : null);
  }, []);

  const stepBackAlexis = useCallback(() => {
    const current = stateRef.current;
    if (current.alexisOutcome !== null) {
      if (!sharedController.undoLastAction()) return;
      setAlexisRewardModal(null);
      return;
    }
    setAlexisRewardModal(null);
    if (current.alexisSubmitted) {
      updateState((snapshot) => ({...snapshot, alexisView: 'outfit-builder', alexisSubmitted: false}));
      return;
    }
    if (current.alexisView === 'outfit-builder') {
      closeOutfitBuilder();
      return;
    }
    goToHub();
  }, [
    alexisRewardModal,
    closeOutfitBuilder,
    goToHub,
    replaceLocalState,
    sharedController,
    updateState,
  ]);

  const barAccessGranted = canEnterHotelBar(gallerySessionState);
  const goToBar = useCallback(() => {
    if (gallerySessionState.combat) return;
    if (barAccessGranted) navigate(barHref);
    else setBarPassageBlocked(true);
  }, [barAccessGranted, barHref, gallerySessionState.combat, navigate, sharedController]);

  const resetCombatDie = useCallback(() => {
    setCombatRoll('');
    setCombatDiceRolling(false);
    setCombatDiceError(false);
    setCombatDiceSelection('sum');
  }, []);

  const beginAudienceCheck = useCallback((checkId: PussyAudienceCheckId) => {
    setActiveAudienceCheckId(checkId);
  }, []);

  const resolveAudienceCheck = useCallback((roll: number, automaticItemId?: string) => {
    if (!activeAudienceCheckId) return false;
    const result = sharedController.resolveSceneCheck(
      activeAudienceCheckId,
      selectedAudienceHeroId,
      'charisma',
      automaticItemId ? undefined : [roll],
      undefined,
      automaticItemId,
    );
    setActiveAudienceCheckId(null);
    if (activeAudienceCheckId === PUSSY_INTIMIDATION_CHECK_ID && result?.success) {
      setPussyPassesModalUndoOnBack(true);
      setPussyPassesModalOpen(true);
    }
    return Boolean(result);
  }, [
    activeAudienceCheckId,
    selectedAudienceHeroId,
    sharedController,
  ]);

  const beginPropRoomCheck = useCallback((checkId: PropRoomCheckId) => {
    if (
      scepterRecovered
      || propRoomCarriersAwakened
      || (propRoomForceOnly && checkId !== 'recover-pussy-scepter')
    ) return;
    setActivePropRoomCheckId(checkId);
  }, [
    propRoomCarriersAwakened,
    propRoomForceOnly,
    scepterRecovered,
  ]);

  const resolvePropRoomCheck = useCallback((roll: number) => {
    if (!activePropRoomCheckId) return;
    const config = PROP_ROOM_CHECK_CONFIG[activePropRoomCheckId];
    sharedController.resolveSceneCheck(
      activePropRoomCheckId,
      config.heroId,
      config.stat,
      [roll],
    );
    setActivePropRoomCheckId(null);
  }, [
    activePropRoomCheckId,
    sharedController,
  ]);

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
    if (!alexisRewardModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAlexisRewardModal();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [alexisRewardModal, closeAlexisRewardModal]);

  useEffect(() => {
    resetCombatDie();
  }, [gallerySessionState.combat?.turnIndex, resetCombatDie]);

  const openAlexis = () => goToScene(
    pussyQuestAccepted ? 'alexis-room-after-pussy' : 'alexis-room',
  );
  const openPussy = () => {
    if (scepterReturned || rewardDecision !== null) {
      goToScene('pussy-scepter-return');
      return;
    }
    if (pussyQuestAccepted) {
      goToScene('pussy-prop-room');
      return;
    }
    goToScene('pussy-audience');
  };
  const returnScepter = () => {
    if (!scepterRecovered) return;
    sharedController.returnScepter();
    goToScene('pussy-scepter-return');
  };

  const acceptPussyQuest = () => {
    sharedController.acceptPussyTask();
  };

  const beginPussyRewardPresentation = () => {
    if (pussyRewardArtifacts.length !== PUSSY_REWARD_ITEM_IDS.length) return;
    if (rewardDecision === null) {
      sharedController.grantPussyReward();
      setPussyRewardPreviewUndoOnBack(true);
    } else {
      setPussyRewardPreviewUndoOnBack(false);
    }
    setPussyRewardPreviewIndex(0);
  };

  const closePussyRewardPresentation = () => {
    if (pussyRewardPreviewIndex === null) return;
    if (pussyRewardPreviewIndex < pussyRewardArtifacts.length - 1) {
      setPussyRewardPreviewIndex((current) => current === null ? null : current + 1);
      return;
    }

    setPussyRewardPreviewIndex(null);
    setPussyRewardPreviewUndoOnBack(false);
  };

  const resetKey = [
    state.activeSceneId,
    state.alexisView,
    state.alexisSubmitted,
    state.outfitOffsets.top,
    state.outfitOffsets.bottom,
    state.outfitOffsets.accent,
    state.outfitSelections.top,
    state.outfitSelections.bottom,
    state.outfitSelections.accent,
    state.alexisOutcome,
    pussyTrustMax,
    pussyTrustRefused,
    pussyIntimidated,
    pussyGuardsDefeated,
    pussyQuestAccepted,
    scepterRecovered,
    propRoomForceOnly,
    propRoomCarriersAwakened,
    propRoomCarriersDefeated,
    gallerySessionState.lastRoll?.checkId,
    gallerySessionState.lastRoll?.total,
    rewardDecision,
  ].join(':');
  const activePropRoomCheck = activePropRoomCheckId
    ? penisuelaGalleryGameplay.checks.find((check) => check.id === activePropRoomCheckId)
    : undefined;
  const activePropRoomCheckConfig = activePropRoomCheckId
    ? PROP_ROOM_CHECK_CONFIG[activePropRoomCheckId]
    : undefined;
  const sceneCheckHeroes = sharedController.sessionHeroes.flatMap((hero) => {
    const token = HERO_TOKEN_PATHS[hero.id];
    return token ? [{...hero, token}] : [];
  });
  const activePropRoomHeroes = activePropRoomCheckConfig
    ? sceneCheckHeroes.filter((hero) => hero.id === activePropRoomCheckConfig.heroId)
    : [];
  const activeAudienceCheck = activeAudienceCheckId
    ? penisuelaGalleryGameplay.checks.find((check) => check.id === activeAudienceCheckId)
    : undefined;

  const audienceCheckModal = activeAudienceCheck && activeAudienceCheckId ? (
    <SceneCheckPanel
      checkId={activeAudienceCheckId}
      dc={activeAudienceCheckId === PUSSY_TRUST_CHECK_ID
        ? getPussyTrustDc
        : activeAudienceCheck.dc}
      heroes={sceneCheckHeroes}
      hint={activeAudienceCheckId === PUSSY_TRUST_CHECK_ID
        ? `Выберите героя и бросьте d20. Для Бубсильды и Линды проверка доверия проходит против DC ${getPussyTrustDc('bubsilda')}.`
        : `Выберите героя и бросьте d20. Запугивание проходит против DC ${activeAudienceCheck.dc}.`}
      label={activeAudienceCheck.label}
      rollLabel={activeAudienceCheckId === PUSSY_TRUST_CHECK_ID
        ? 'Проверка доверия Pussy Sultan'
        : 'Проверка запугивания Pussy Sultan'}
      selectedHeroId={selectedAudienceHeroId}
      selectedStat="charisma"
      stats={['charisma']}
      onClose={() => setActiveAudienceCheckId(null)}
      automaticSuccess={getAutomaticCheckReward(sharedController.state, selectedAudienceHeroId, 'charisma') ? {
        ...getAutomaticCheckReward(sharedController.state, selectedAudienceHeroId, 'charisma')!,
        onUse: () => resolveAudienceCheck(0, GREY_WIESE_PERFUME_ID),
      } : undefined}
      onResolve={(roll) => resolveAudienceCheck(roll)}
      onSelectHero={setSelectedAudienceHeroId}
    />
  ) : null;
  const propRoomCheckModal = activePropRoomCheck && activePropRoomCheckConfig ? (
    <SceneCheckPanel
      checkId={activePropRoomCheck.id}
      dc={activePropRoomCheck.dc}
      heroes={activePropRoomHeroes}
      hint="Эта проверка закреплена за особенностью выбранного героя."
      label={activePropRoomCheck.label}
      rollLabel="Проверка в реквизиторской"
      selectedHeroId={activePropRoomCheckConfig.heroId}
      selectedStat={activePropRoomCheckConfig.stat}
      stats={[activePropRoomCheckConfig.stat]}
      onClose={() => setActivePropRoomCheckId(null)}
      onResolve={resolvePropRoomCheck}
      onSelectHero={() => undefined}
    />
  ) : null;

  let interaction: ReactNode = null;

  if (
    state.activeSceneId === 'alexis-room'
    || state.activeSceneId === 'alexis-room-after-pussy'
  ) {
    interaction = state.alexisOutcome === null ? (
      <>
        <p className={styles.prompt}>
          {state.alexisSubmitted
            ? 'Игроки сдали наряд. Оцените результат сами: если образ нужно переделать — ничего не нажимайте и верните игроков к манекену шагом назад. Для принятого образа выберите отличный или достаточный исход.'
            : 'Алексис уже поставил задачу. Игроки должны приблизиться к манекену, собрать образ и нажать «Сдать наряд». До сдачи кнопки награды скрыты.'}
        </p>
      </>
    ) : (
      <>
        <div className={styles.resolution} role="status">
          <strong>{state.alexisOutcome === 'excellent' ? 'Наряд принят: отлично' : 'Наряд принят: достаточно'}</strong>
          <p>
            {state.alexisOutcome === 'excellent'
              ? 'Алексис Великолепный выдал сертификат экспертов моды и два разрешения на проход в бар.'
              : 'Алексис Великолепный пропустил героев дальше и выдал два разрешения на проход в бар без сертификата.'}
          </p>
        </div>
      </>
    );
  }

  const masterActionsLabel = isAlexisSceneId(state.activeSceneId)
    ? 'Приёмка наряда'
    : state.activeSceneId === 'hotel-gallery'
      ? 'Направления галереи'
      : state.activeSceneId === 'pussy-prop-room'
        ? 'Скипетр в паланкине'
        : 'Решения аудиенции';
  const masterActions: SceneMasterAction[] = (() => {
    if (activeCombat || pussyGuardsAwaitingBattle) return [];

    if (state.activeSceneId === 'hotel-gallery') {
      const alexisStatus = state.alexisOutcome === 'excellent'
        ? 'Наряд принят отлично, обе награды выданы.'
        : state.alexisOutcome === 'sufficient'
          ? 'Наряд принят, два разрешения выданы.'
          : 'Алексис ждёт собранный наряд.';
      const pussyStatus = rewardDecision === 'accepted'
        ? 'Награда принята.'
        : rewardDecision === 'declined'
          ? 'Награда оставлена владельцу.'
          : pussyGuardsDefeated
            ? 'Охрана побеждена, три жетона выданы.'
            : pussyIntimidated
              ? 'Pussy Sultan напуган, три жетона выданы.'
              : scepterReturned
                ? 'Скипетр возвращён, награда предложена.'
                : scepterRecovered
                  ? 'Скипетр у героев — пора вернуть его.'
                  : pussyQuestAccepted
                    ? 'Поручение принято, скипетр ждёт.'
                    : pussyTrustRefused
                      ? 'Pussy Sultan отказал; доступно запугивание.'
                      : 'За дверью высокомерно ждут ответа.';
      return [
        {id: 'gm-open-alexis', label: 'Комната Алексиса', detail: alexisStatus, onSelect: openAlexis},
        {id: 'gm-open-pussy', label: 'Аудиенция Pussy Sultan', detail: pussyStatus, onSelect: openPussy},
        {
          id: 'gm-open-bar',
          label: 'Погасшая вывеска бара',
          detail: barAccessGranted
            ? 'Два разрешения Алексиса и три жетона Pussy Sultan открывают проход всей группе.'
            : 'Для всей группы нужны два разрешения Алексиса и три жетона Pussy Sultan. Без допуска появится охрана.',
          onSelect: goToBar,
        },
      ];
    }

    if (isAlexisSceneId(state.activeSceneId)) {
      if (state.alexisOutcome === null && state.alexisSubmitted) {
        return [
          {
            id: 'accept-alexis-outfit-excellent',
            label: 'Принять наряд: отлично',
            detail: 'Выдать сертификат экспертов моды и два разрешения на проход в бар.',
            onSelect: () => resolveAlexisOutfit('excellent'),
          },
          {
            id: 'accept-alexis-outfit-sufficient',
            label: 'Принять наряд: достаточно',
            detail: 'Выдать два разрешения на проход в бар.',
            onSelect: () => resolveAlexisOutfit('sufficient'),
          },
        ];
      }
      return state.alexisOutcome ? [{id: 'leave-alexis-room', label: 'Вернуться в холл', onSelect: goToHub}] : [];
    }

    if (state.activeSceneId === 'pussy-audience') {
      if (activeAudienceCheckId) return [];
      if (pussyIntimidated || pussyGuardsDefeated) {
        return [
          {id: 'leave-pussy-audience', label: 'Вернуться в холл', onSelect: goToHub},
          {
            id: 'gm-show-pussy-passes',
            label: 'Показать три жетона',
            onSelect: () => {
              setPussyPassesModalUndoOnBack(false);
              setPussyPassesModalOpen(true);
            },
          },
        ];
      }
      if (pussyTrustMax) {
        return pussyQuestAccepted ? [
          {id: 'gm-enter-prop-room', label: 'Войти в реквизиторскую', onSelect: () => goToScene('pussy-prop-room')},
        ] : [{
          id: 'gm-accept-pussy-quest',
          label: 'Принять поручение',
          onSelect: acceptPussyQuest,
          }];
      }
      if (pussyTrustRefused) {
        return [{
          id: 'gm-intimidate-pussy',
          label: 'Припугнуть Pussy Sultan',
          onSelect: () => beginAudienceCheck(PUSSY_INTIMIDATION_CHECK_ID),
        }];
      }
      return [{
        id: 'gm-earn-pussy-trust',
        label: 'Заслужить доверие',
        onSelect: () => beginAudienceCheck(PUSSY_TRUST_CHECK_ID),
      }];
    }

    if (state.activeSceneId === 'pussy-prop-room') {
      if (scepterRecovered) {
        return [{id: 'gm-return-pussy-scepter', label: 'Физически вернуть скипетр Pussy Sultan', onSelect: returnScepter}];
      }
      if (propRoomCarriersDefeated) {
        return [{
          id: 'gm-collect-pussy-scepter',
          label: 'Забрать освобождённый скипетр',
          onSelect: sharedController.collectScepter,
        }];
      }
      if (propRoomCarriersAwakened) {
        return propRoomCombat ? [] : [{
          id: 'gm-start-prop-room-combat',
          label: 'Начать бой',
          onSelect: () => sharedController.startCombat(PROP_ROOM_ENCOUNTER_ID),
        }];
      }
      if (activePropRoomCheckId) return [];
      return [
        ...(!propRoomForceOnly ? [
          {
            id: 'gm-prop-room-linda',
            label: 'Пройти через сервисный люк',
            onSelect: () => beginPropRoomCheck('recover-pussy-scepter-with-tiny-linda'),
          },
          {
            id: 'gm-prop-room-lambert',
            label: 'Разгрузить лебёдку',
            onSelect: () => beginPropRoomCheck('recover-pussy-scepter-with-engineering'),
          },
        ] : []),
        {
          id: 'gm-prop-room-lena',
          label: 'Поднять раму паланкина',
          onSelect: () => beginPropRoomCheck('recover-pussy-scepter'),
        },
      ];
    }

    if (rewardDecision === null) {
      return [
        {
          id: 'gm-accept-womanizer',
          label: 'Получить награды и проход в бар',
          onSelect: beginPussyRewardPresentation,
        },
      ];
    }
    return [
      {id: 'leave-pussy-rewards', label: 'Вернуться в холл', onSelect: goToHub},
      ...(rewardDecision === 'accepted' ? [{
        id: 'gm-show-pussy-reward',
        label: 'Показать полученные награды',
        onSelect: beginPussyRewardPresentation,
      }] : []),
    ];
  })();

  let hotspots: SceneHotspot[];

  if (state.activeSceneId === 'hotel-gallery') {
    hotspots = [
      {
        id: 'hotel-gallery-alexis-door',
        label: 'Войти в левую дверь к Алексису',
        onSelect: openAlexis,
        position: {x: 0, y: 5, width: 23, height: 68},
      },
      {
        id: 'hotel-gallery-pussy-door',
        label: 'Постучать в золотую дверь Pussy Sultan',
        onSelect: openPussy,
        position: {x: 80, y: 5, width: 20, height: 68},
      },
      {
        id: 'hotel-gallery-bar-passage',
        label: 'Спуститься в бар',
        onSelect: goToBar,
        position: {x: 33, y: 35, width: 35, height: 58},
      },
    ];
  } else if (
    state.activeSceneId === 'alexis-room'
    || state.activeSceneId === 'alexis-room-after-pussy'
  ) {
    hotspots = state.alexisView === 'room' ? [{
      id: 'alexis-room-mannequin',
      label: 'Приблизиться к манекену',
      onSelect: openOutfitBuilder,
      presentation: 'soft-object',
      position: {x: 42, y: 18, width: 17, height: 67},
    }] : [];
  } else if (state.activeSceneId === 'pussy-audience') {
    hotspots = [
      ...(pussyBarPassesIssued ? [{
        id: 'pussy-suite-exit',
        label: 'Вернуться через проём в галерею',
        onSelect: goToHub,
        position: {x: 0, y: 7, width: 19, height: 72},
      }] satisfies SceneHotspot[] : []),
      ...(pussyQuestAccepted ? [{
        id: 'pussy-prop-room-door',
        label: 'Войти во внутреннюю реквизиторскую',
        onSelect: () => goToScene('pussy-prop-room'),
        position: {x: 61, y: 10, width: 17, height: 50},
      }] : []),
    ];
  } else if (state.activeSceneId === 'pussy-prop-room') {
    hotspots = [{
      id: 'prop-room-exit',
      label: 'Вернуться к Pussy Sultan',
      onSelect: () => goToScene('pussy-audience'),
      presentation: 'soft-object',
      position: {x: 14, y: 10, width: 14, height: 64},
    }];
  } else {
    hotspots = [];
  }
  const visibleHotspots = activeCombat ? [] : hotspots;
  const canLeavePussySuite = (state.activeSceneId === 'pussy-scepter-return' && rewardDecision !== null)
    || (state.activeSceneId === 'pussy-audience' && pussyBarPassesIssued);
  const masterBackHref = !activeCombat && state.activeSceneId === 'hotel-gallery'
    ? `/campaign/${campaignId}/play/hotel-overload-search`
    : undefined;
  const undoSharedStep = () => {
    sharedController.undoLastAction();
    resetCombatDie();
  };
  const audienceHasResolvedStep = pussyTrustMax
    || pussyTrustRefused
    || pussyIntimidated
    || pussyGuardsDefeated
    || pussyQuestAccepted
    || pussyBarPassesIssued;
  const propRoomHasResolvedStep = scepterRecovered
    || propRoomForceOnly
    || propRoomCarriersAwakened
    || propRoomCarriersDefeated;
  const masterStepBack = activeCombat
    ? sharedController.canUndoLastAction ? undoSharedStep : undefined
    : activeAudienceCheckId
      ? () => setActiveAudienceCheckId(null)
      : activePropRoomCheckId
        ? () => setActivePropRoomCheckId(null)
        : pussyRewardPreviewIndex !== null
          ? () => {
              if (pussyRewardPreviewIndex > 0 && !pussyRewardPreviewUndoOnBack) {
                setPussyRewardPreviewIndex(pussyRewardPreviewIndex - 1);
                return;
              }
              setPussyRewardPreviewIndex(null);
              if (pussyRewardPreviewUndoOnBack) {
                setPussyRewardPreviewUndoOnBack(false);
                undoSharedStep();
              }
            }
          : pussyPassesModalOpen
            ? () => {
                setPussyPassesModalOpen(false);
                if (pussyPassesModalUndoOnBack) {
                  setPussyPassesModalUndoOnBack(false);
                  undoSharedStep();
                }
              }
            : isAlexisSceneId(state.activeSceneId)
              ? stepBackAlexis
              : state.activeSceneId === 'hotel-gallery'
                ? undefined
                : state.activeSceneId === 'pussy-prop-room'
                  ? propRoomHasResolvedStep && sharedController.canUndoLastAction
                    ? undoSharedStep
                    : () => goToScene('pussy-audience')
                  : state.activeSceneId === 'pussy-audience'
                    ? audienceHasResolvedStep && sharedController.canUndoLastAction
                      ? undoSharedStep
                      : goToHub
                    : rewardDecision !== null && sharedController.canUndoLastAction
                      ? undoSharedStep
                      : scepterReturned && sharedController.canUndoLastActionInScope('pussy-prop-room')
                        ? () => {
                            if (!sharedController.undoLastAction('pussy-prop-room')) return;
                            goToScene('pussy-prop-room');
                          }
                        : () => goToScene('pussy-prop-room');

  return (
    <CampaignScene
      itemController={sharedController} inventoryArtwork={sharedController.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      backHref={masterBackHref}
      externalRevealedIds={gallerySessionState.inventory}
      externallyManagedIds={sharedController.managedInspectableIds}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={campaignScenes}
          controller={sharedController}
          definition={penisuelaGalleryGameplay}
          scene={presentedScene}
        />
      )}
      masterActions={masterActions}
      masterActionsLabel={masterActionsLabel}
      masterContent={isAlexisSceneId(state.activeSceneId) ? interaction : null}
      onMasterStepBack={masterStepBack}
      scene={presentedScene}
      interactiveContent={(
        <>
          <SceneDecisionModal
            open={barPassageBlocked && !activeCombat}
            dismissible={false}
            onClose={() => setBarPassageBlocked(false)}
            eyebrow="Система доступа"
            title="Проход в бар запрещён"
            description="Для пяти гостей нужны два разрешения Алексиса и три жетона Pussy Sultan. Без полного комплекта проход закрыт. Попытка пройти силой вызовет трёх рунических стражей."
            optionsInitiallyVisible
            optionsLabel=""
            options={[
              {id: 'fight-bar-guards', label: 'Принять бой', onSelect: () => sharedController.startCombat(GUARD_ENCOUNTER_ID)},
            ]}
          />
          <SceneDecisionModal
            open={pussyGuardsAwaitingBattle}
            dismissible={false}
            onClose={() => {}}
            eyebrow="Запугивание не удалось"
            title="Разговор окончен"
            description={penisuelaGalleryGameplay.checks.find((check) => check.id === PUSSY_INTIMIDATION_CHECK_ID)?.failureText}
            optionsInitiallyVisible
            optionsLabel=""
            options={[{
              id: 'accept-pussy-guard-battle',
              label: 'Принять бой',
              closeOnSelect: false,
              onSelect: () => sharedController.startCombat(SULTAN_GUARD_ENCOUNTER_ID),
            }]}
          />
          {audienceCheckModal}
          {propRoomCheckModal}
          {activeCombat ? (
            <>
              <CombatEncounterHud
                combat={activeCombat}
                definition={penisuelaGalleryGameplay}
                diceError={combatDiceError}
                diceReady={combatDiceReady}
                fallbackEnemyToken={activeCombat.encounterId === PROP_ROOM_ENCOUNTER_ID
                  ? PROP_ROOM_CARRIER_TOKEN
                  : activeCombat.encounterId === SULTAN_GUARD_ENCOUNTER_ID
                    ? SULTAN_GUARD_TOKEN
                    : GUARD_SCENE_BACKGROUND}
                heroes={sharedController.sessionHeroes}
                heroHp={gallerySessionState.heroHp}
                participantTemporaryModifiers={gallerySessionState.participantTemporaryModifiers}
                participantConditions={Object.fromEntries(sharedController.sessionHeroes.map((hero) => [
                  hero.id,
                  sharedController.getParticipantConditions(hero.id),
                ]))}
                inventoryState={gallerySessionState.inventoryState}
                resourceUses={gallerySessionState.resourceUses}
                heroTokens={HERO_TOKEN_PATHS}
                inputValue={combatRoll}
                isRolling={combatDiceRolling}
                onApplyDamage={sharedController.applyCombatDamage}
                onCancelPendingAttack={sharedController.cancelPendingCombatAttackWithRedButton}
                onContinue={() => {
                  if (activeCombat.encounterId === SULTAN_GUARD_ENCOUNTER_ID) {
                    if (!sharedController.clearCombat('pussy')) return;
                    setPussyPassesModalUndoOnBack(true);
                    setPussyPassesModalOpen(true);
                    return;
                  }
                  sharedController.clearCombat(
                    activeCombat.encounterId === PROP_ROOM_ENCOUNTER_ID ? 'prop-room' : 'gallery',
                  );
                }}
                onDefeatFallback={sharedController.resolveCombatDefeatFallback}
                onEnemyAttack={sharedController.enemyAttack}
                onEquipItem={sharedController.equipCombatItem}
                onHeroAttack={sharedController.heroAttack}
                onSummonedAllyAttack={sharedController.summonedAllyAttack}
                onResolveSavingThrow={sharedController.resolveCombatSavingThrow}
                onInputChange={(value) => {
                  setCombatRoll(value);
                  setCombatDiceError(false);
                }}
                onResetDie={resetCombatDie}
                onRoll={startCombatDiceRoll}
                onSelectAction={sharedController.selectCombatAction}
                onUseAction={sharedController.useCombatAction}
                suggestedEnemyTargetId={sharedController.getNpcDecision(
                  activeCombat.initiativeOrder[activeCombat.turnIndex] ?? '',
                )?.suggestion.targetIds[0]}
                timelineEvents={gallerySessionState.events}
                victoryWordmark={resolveAsset(VICTORY_WORDMARK)}
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
          ) : (
            <>
              {isAlexisSceneId(state.activeSceneId) && outfitBuilderDefinition ? (
                <AlexisOutfitBuilder
                  collection={outfitBuilderDefinition}
                  mode={state.alexisView === 'outfit-builder' ? 'builder' : 'room'}
                  offsets={state.outfitOffsets}
                  selections={state.outfitSelections}
                  onOffsetChange={changeOutfitOffset}
                  onSelect={selectOutfitOption}
                />
              ) : null}
              <SceneHotspotLayer
                ariaLabel="Интерактивные области гостиничной сцены"
                background={state.activeSceneId === 'pussy-prop-room' ? {src: presentedScene.background, fit: 'cover'} : undefined}
                hotspots={visibleHotspots}
              />
              <SceneTextPanel
                appearance="narration"
                resetKey={resetKey}
                readAloud={presentedScene.readAloud}
              />
              {canLeavePussySuite ? (
                <SceneReturnButton onClick={goToHub}>Вернуться в холл</SceneReturnButton>
              ) : null}
              {state.activeSceneId === 'alexis-room' || state.activeSceneId === 'alexis-room-after-pussy' ? (
                <>
                  <button
                    className={styles.sceneExitButton}
                    type="button"
                    onClick={state.alexisView === 'outfit-builder' ? closeOutfitBuilder : goToHub}
                  >
                    {state.alexisView === 'outfit-builder' ? '← Вернуться к Алексису' : '← Вернуться в холл'}
                  </button>
                  {state.alexisView === 'outfit-builder' ? (
                    <button className={styles.submitOutfitButton} type="button" onClick={submitOutfit}>
                      Сдать наряд
                    </button>
                  ) : null}
                </>
              ) : null}
            </>
          )}
          {pussyPassesModalOpen ? (
            <div className={styles.rewardBackdrop} role="presentation">
              <section
                aria-labelledby="pussy-passes-title"
                aria-modal="true"
                className={styles.rewardModal}
                role="dialog"
              >
                <p className={styles.rewardEyebrow}>Доступ выдан без дружбы</p>
                <div className={styles.permitReward}>
                  <img
                    src={resolveAsset(ALEXIS_BAR_PERMIT_ART)}
                    alt="Золотой жетон для прохода в закрытый бар"
                  />
                  <strong aria-label="Три жетона">× {PUSSY_BAR_PASSES_QUANTITY}</strong>
                </div>
                <h2 id="pussy-passes-title">Три жетона в бар</h2>
                <p>
                  Pussy Sultan отдаёт три золотых жетона для прохода в закрытый бар.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPussyPassesModalOpen(false);
                    setPussyPassesModalUndoOnBack(false);
                  }}
                  autoFocus
                >
                  Продолжить
                </button>
              </section>
            </div>
          ) : null}
          {activePussyRewardArtifact ? (
            <InspectableArtifactDialog
              artifact={activePussyRewardArtifact}
              onClose={closePussyRewardPresentation}
            />
          ) : null}
          {alexisRewardModal ? (
            <div className={styles.rewardBackdrop} role="presentation">
              <section
                aria-labelledby="alexis-reward-title"
                aria-modal="true"
                className={styles.rewardModal}
                role="dialog"
              >
                {alexisRewardModal === 'certificate' ? (
                  <>
                    <p className={styles.rewardEyebrow}>Награда за безупречный образ</p>
                    <div className={styles.certificateReward} aria-label="Сертификат экспертов моды">
                      <span>ALEXIS</span>
                      <small>Алексис Великолепный</small>
                      <strong>Сертификат экспертов моды</strong>
                      <p>
                        Настоящим подтверждается: предъявители этого сертификата являются
                        экспертами моды и вправе выносить стилевые вердикты даже во время конца света.
                      </p>
                      <b>10 / 10</b>
                    </div>
                    <h2 id="alexis-reward-title">Сертификат получен</h2>
                    <p>Сертификат Алексиса Великолепного добавлен в общий инвентарь.</p>
                    <button type="button" onClick={closeAlexisRewardModal} autoFocus>Показать разрешения</button>
                  </>
                ) : (
                  <>
                    <p className={styles.rewardEyebrow}>Доступ подтверждён</p>
                    <div className={styles.permitReward}>
                      <img
                        src={resolveAsset(ALEXIS_BAR_PERMIT_ART)}
                        alt="Золотое разрешение на проход в закрытый бар"
                      />
                      <strong aria-label="Два разрешения">× 2</strong>
                    </div>
                    <h2 id="alexis-reward-title">Два разрешения на проход в бар</h2>
                    <p>
                      Алексис Великолепный выдаёт два золотых разрешения. Покажите их у стойки
                      доступа: разрешения действуют в этой сцене и не занимают места в инвентаре.
                    </p>
                    <button type="button" onClick={closeAlexisRewardModal} autoFocus>Продолжить</button>
                  </>
                )}
              </section>
            </div>
          ) : null}
        </>
      )}
    />
  );
}
