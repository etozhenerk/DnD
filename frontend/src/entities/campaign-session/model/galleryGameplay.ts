import type {
  CombatActionDefinition,
  CombatAttackDefinition,
  CombatEncounterDefinition,
  CombatHeroSource,
} from '../../combat/model/types';
import type {NpcBehaviorDefinition} from '../../combat/model/npcBehavior';
import type {FocusedArtwork} from '../../../shared/lib/image/focusedArtwork';

export type GalleryView = 'gallery' | 'pussy' | 'prop-room' | 'archive' | 'kraken' | 'guards' | 'combat' | 'closed-bar';
export type HeroStat = 'strength' | 'dexterity' | 'wisdom' | 'intelligence' | 'charisma';
export type GalleryCounter =
  | 'doom'
  | 'kreed-evidence-count'
  | 'show18-contradictions-broken'
  | 'timePressure'
  | 'preFinalCombats'
  | 'show18LiveSuccesses'
  | 'show18TeleprompterSuccesses'
  | 'show18Failures'
  | 'groomTunnelSuccesses'
  | 'groomTunnelFailures'
  | 'restoreLogSuccesses'
  | 'restoreLogFailures';

export type GalleryNumericChange =
  | {mode: 'delta'; value: number}
  | {mode: 'set'; value: number};

export interface GalleryStoryOutcome {
  flags?: Record<string, boolean>;
  counterDeltas?: Partial<Record<GalleryCounter, number>>;
  relationships?: Record<string, GalleryNumericChange>;
  inventory?: {
    acquire?: string[];
    remove?: string[];
    quantities?: Record<string, number>;
  };
  itemCharges?: Record<string, GalleryNumericChange>;
  clues?: string[];
  selectedEnding?: string | null;
  nextView?: GalleryView;
}

export interface GalleryStoryCondition {
  allItems?: string[];
  itemQuantities?: Record<string, number>;
  allFlags?: string[];
  noFlags?: string[];
  allClues?: string[];
  counterLte?: Partial<Record<GalleryCounter, number>>;
  graphCondition?: GalleryGraphCondition;
}

export type GalleryGraphCondition =
  | {otherwise: true}
  | {all: GalleryGraphCondition[]}
  | {any: GalleryGraphCondition[]}
  | {not: GalleryGraphCondition}
  | {flag: string; equals: boolean}
  | {
    counter: string;
    eq?: number;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };

interface GalleryStoryConditionState {
  inventoryState?: Record<string, {quantity: number}>;
  inventory?: string[];
  flags: Record<string, boolean>;
  counters: Partial<Record<GalleryCounter, number>>;
  clues: string[];
}

export function isGalleryGraphConditionMet(
  condition: GalleryGraphCondition | undefined,
  state: GalleryStoryConditionState,
): boolean {
  if (!condition || 'otherwise' in condition) return true;
  if ('all' in condition) return condition.all.every((child) => isGalleryGraphConditionMet(child, state));
  if ('any' in condition) return condition.any.some((child) => isGalleryGraphConditionMet(child, state));
  if ('not' in condition) return !isGalleryGraphConditionMet(condition.not, state);
  if ('flag' in condition) return Boolean(state.flags[condition.flag]) === condition.equals;

  const value = state.counters[condition.counter as GalleryCounter] ?? 0;
  if (condition.eq !== undefined && value !== condition.eq) return false;
  if (condition.gt !== undefined && value <= condition.gt) return false;
  if (condition.gte !== undefined && value < condition.gte) return false;
  if (condition.lt !== undefined && value >= condition.lt) return false;
  if (condition.lte !== undefined && value > condition.lte) return false;
  return true;
}

export function isGalleryStoryConditionMet(
  conditions: GalleryStoryCondition | undefined,
  state: GalleryStoryConditionState,
): boolean {
  if (!conditions) return true;
  const flagsReady = conditions.allFlags?.every((flag) => state.flags[flag]) ?? true;
  const absentFlagsReady = conditions.noFlags?.every((flag) => !state.flags[flag]) ?? true;
  const cluesReady = conditions.allClues?.every((clue) => state.clues.includes(clue)) ?? true;
  const countersReady = Object.entries(conditions.counterLte ?? {}).every(([counter, maximum]) => (
    maximum === undefined || (state.counters[counter as GalleryCounter] ?? 0) <= maximum
  ));
  return flagsReady
    && (conditions.allItems?.every((id) => state.inventory?.includes(id)) ?? true)
    && Object.entries(conditions.itemQuantities ?? {}).every(([id, count]) => (state.inventoryState?.[id]?.quantity ?? 0) >= count)
    && absentFlagsReady
    && cluesReady
    && countersReady
    && isGalleryGraphConditionMet(conditions.graphCondition, state);
}

export interface GalleryStoryCheckDefinition {
  npcActor?: {id: string; name: string; token: string; stats: Record<string, number>};
  stats: HeroStat[];
  dc: number;
  eligibleHeroIds?: string[];
  dcOverrides?: Array<{heroIds: string[]; dc: number}>;
  advantageIfFlag?: string;
  advantageIfHeroId?: string;
  modifierBonus?: number;
  dcModifiers?: Array<{flag: string; delta: number}>;
}

interface GalleryStoryActionBase {
  id: string;
  label: string;
  description: string;
  conditions?: GalleryStoryCondition;
  nextSceneId: string;
  resolution: string;
  requirements?: {
    heroId: string;
    itemIds?: string[];
    ownedItemIds?: string[];
    abilityIds?: string[];
    resourceActionId?: string;
  };
}

export type GalleryStoryActionDefinition =
  | GalleryStoryActionBase & {
    kind: 'automatic';
    repeatable?: boolean;
    outcome: GalleryStoryOutcome;
    challengeProgressOutcome?: GalleryStoryOutcome;
  }
  | GalleryStoryActionBase & {
    kind: 'check';
    check: GalleryStoryCheckDefinition;
    outcome: GalleryStoryOutcome;
    failureOutcome: GalleryStoryOutcome;
    failureResolution: string;
    failureNextSceneId?: string;
  }
  | GalleryStoryActionBase & {
    kind: 'combat-start';
    encounterId: string;
    outcome: GalleryStoryOutcome;
  }
  | GalleryStoryActionBase & {
    kind: 'combat-complete';
    encounterId: string;
    outcome: GalleryStoryOutcome;
  };

export interface GalleryStoryEpilogueDefinition {
  outcome: string;
  recordingAuthorized: string;
  recordingPrivate: string;
  familyWomanizer: string;
  familyStas: string;
  familyPolina: string;
  familyUnresolved: string;
  redButtonUnused: string;
}

export interface GalleryStoryChallengeTrackDefinition {
  actionId: string;
  label: string;
  successCounter: GalleryCounter;
  successesRequired: number;
  repeatable?: boolean;
}

export interface GalleryStoryChallengeDefinition {
  failureCounter: GalleryCounter;
  failureLimit: number;
  tracks: GalleryStoryChallengeTrackDefinition[];
}

export interface GalleryStorySceneDefinition {
  id: string;
  prompt: string;
  actions: GalleryStoryActionDefinition[];
  challenge?: GalleryStoryChallengeDefinition;
  epilogue?: GalleryStoryEpilogueDefinition;
}

export interface GalleryDoorDefinition {
  id: 'pussy-suite' | 'archive' | 'prop-room-stairs';
  label: string;
  view: GalleryView;
  status: 'open' | 'conditional';
  actionLabel: string;
  description: string;
  availableDescription?: string;
  lockedDescription?: string;
  requiresAllFlags?: string[];
  requiresAnyFlag?: string[];
}

export interface GalleryCheckDefinition {
  id: 'earn-pussy-acquaintance' | 'earn-pussy-trust' | 'intimidate-pussy' | 'steal-pussy-key' | 'recover-pussy-scepter' | 'recover-pussy-scepter-with-engineering' | 'recover-pussy-scepter-with-tiny-linda' | 'calm-alexis' | 'search-hotel-archive' | 'trace-prokhor-payment' | 'pressure-prokhor-with-work' | 'disable-rail-kraken-with-linda' | 'stop-rail-kraken' | 'identify-secret-artist' | 'read-mask-route' | 'free-satyr-window' | 'finish-dressing-rehearsal' | 'align-stage-power' | 'hold-stage-lever';
  label: string;
  stats: HeroStat[];
  dc: number;
  eligibleHeroIds?: string[];
  dcOverrides?: Array<{heroIds: string[]; dc: number}>;
  dcModifiers?: Array<{flag: string; delta: number}>;
  automaticSuccessAbilityId?: string;
  advantageAbilityId?: string;
  successText: string;
  failureText: string;
}

export interface GalleryDialogueDefinition {
  speaker: string;
  opening: string;
  acquaintance?: string;
  acquaintanceFailure?: string;
  charmSuccess?: string;
  charmFailure?: string;
  yesterdayRefusal?: string;
  yesterdayReveal?: string;
  trustRefusal?: string;
  threatSuccess?: string;
  threatSuccessAnonymous?: string;
  threatFailure?: string;
  theftPrompt?: string;
  theftSuccess?: string;
  theftFailure?: string;
  guardsDefeated?: string;
  quest?: string;
  lore?: {
    title: string;
    art: string;
    alt: string;
    paragraphs: string[];
  };
  help?: string;
  threat?: string;
  reward?: string;
  success?: string;
  pressure?: string;
  search?: string;
  evasion?: string;
  bill?: string;
  audit?: string;
  reveal?: string;
  prokhorReturn?: string;
  prokhorReward?: string;
  information?: string;
  callConsent?: string;
}

export interface GalleryMediaSlotDefinition {
  label: string;
  placeholder: string;
  source?: string;
}

export interface GalleryVideoSlotDefinition extends GalleryMediaSlotDefinition {
  startSeconds?: number;
}

export interface GalleryDanceTrackDefinition {
  id: string;
  label: string;
  description: string;
  correct: boolean;
  feedback: string;
  audio: GalleryMediaSlotDefinition;
}

export interface GalleryDanceGuardPromptDefinition {
  modalEyebrow: string;
  modalTitle: string;
  modalText: string;
  confirmLabel: string;
}

export interface GalleryDancePuzzleDefinition {
  rewardItemId?: string;
  rewardQuantity?: number;
  speaker: string;
  opening: string;
  clue: string;
  success: string;
  route: string;
  video: GalleryVideoSlotDefinition;
  enchantedMusic: GalleryMediaSlotDefinition;
  wrongTrackPenalty: GalleryDanceGuardPromptDefinition & {
    encounterId: string;
  };
  firstCorrectTrackCombat?: GalleryDanceGuardPromptDefinition;
  tracks: GalleryDanceTrackDefinition[];
}

export interface GalleryDressingRoomObjectDefinition {
  id: 'concert-costume' | 'damaged-rider' | 'performance-fragment' | 'transfer-log' | 'route-mirror' | 'satyr-window';
  label: string;
  group: 'artist' | 'route' | 'satyr';
  description: string;
  hotspotPosition: {x: number; y: number};
}

export interface GalleryDressingRoomResolutionDefinition {
  title: string;
  success: string;
  failure?: string;
}

export interface GalleryDressingRoomDefinition {
  speaker: string;
  opening: string;
  objects: GalleryDressingRoomObjectDefinition[];
  identity: GalleryDressingRoomResolutionDefinition;
  route: GalleryDressingRoomResolutionDefinition;
  satyr: GalleryDressingRoomResolutionDefinition;
  rehearsal: GalleryDressingRoomResolutionDefinition;
  stageModule: {
    opening: string;
    success: string;
    route: string;
    assistance: Array<{
      id: 'magic-whisper' | 'helping-stick';
      heroId: string;
      label: string;
      description: string;
    }>;
  };
}

export interface GalleryGuestBungalowsChoiceDefinition {
  id: 'choose-womanizer-branch' | 'choose-couples-session-branch';
  label: string;
  description: string;
  resolution: string;
}

export interface GalleryGuestBungalowsDefinition {
  speaker: string;
  opening: string;
  choiceTitle: string;
  choicePrompt: string;
  unavailable: {
    womanizerMissing: string;
    stasConsentMissing: string;
  };
  womanizer: GalleryGuestBungalowsChoiceDefinition;
  couplesSession: GalleryGuestBungalowsChoiceDefinition;
  routeBoundary: string;
}

export type GalleryAttackDefinition = CombatAttackDefinition;
export type GalleryCombatActionDefinition = CombatActionDefinition;
export type GalleryEncounterDefinition = CombatEncounterDefinition;

export interface ManualCheckRewardDefinition {
  name: string;
  artwork: string;
  artworkAlt: string;
  description: string;
  criticalSuccessText: string;
  claimLabel: string;
  questRewards: Array<{flag: string; text: string}>;
}

export interface GalleryGameplayDefinition {
  manualCheckReward?: ManualCheckRewardDefinition;
  soundtrack?: {
    volume: number;
    tracks: Array<{id: string; title: string; source: string}>;
    exploration: string[];
    combat: string[];
    encounters: Record<string, string[]>;
    blocks?: Record<string, string[]>;
    scenes?: Record<string, string[]>;
    sceneRequiredFlags?: Record<string, string[]>;
  };
  storyTruth?: {
    currentRouteSceneIds: string[];
    optionalSceneIds?: string[];
    badEndingSceneIds: string[];
    compatibilityAliases: Record<string, string>;
    legacySceneIds: string[];
    deferredSceneIds: string[];
    retiredDialogueCharacterIds: string[];
    retiredDialoguePresetIds: string[];
    interfaceCounterIds: GalleryCounter[];
    names: Record<string, string>;
  };
  doomMilestones?: Array<{id: string; flag: string; sceneId: string; label: string; readAloud: string}>;
  itemSkins?: Array<{itemId: string; flag: string; name: string; artwork: FocusedArtwork}>;
  bossSequence?: {
    sceneId: string;
    firstEncounterId: string;
    secondEncounterId: string;
    secondViewId: string;
    intermission?: {viewId: string; continueLabel: string};
    transformationVideo: {title: string; source?: string};
    aftermath?: {returnSceneId: string; deathVideo: {title: string; source?: string}; returnTransition?: 'portal'; returnViewId?: string};
    defeat?: {returnSceneId: string; endingId: string; resolution: string};
  };
  version: number;
  id: string;
  campaignId: string;
  sceneId: string;
  initialView: GalleryView;
  doors: GalleryDoorDefinition[];
  narration: {
    initial: string;
    afterKraken: string;
    archiveWithKey: string;
    passageOpen: string;
    propRoomQuest: string;
    propRoomRecovered: string;
    propRoomRecoveredAfterCarriers: string;
  };
  dialogues: {
    pussy: GalleryDialogueDefinition;
    alexis: GalleryDialogueDefinition;
    prokhor: GalleryDialogueDefinition;
    stas?: GalleryDialogueDefinition;
  };
  dancePuzzle: GalleryDancePuzzleDefinition;
  dressingRoom: GalleryDressingRoomDefinition;
  guestBungalows: GalleryGuestBungalowsDefinition;
  checks: GalleryCheckDefinition[];
  npcBehaviors: NpcBehaviorDefinition[];
  combatActions: GalleryCombatActionDefinition[];
  encounters: GalleryEncounterDefinition[];
  storyScenes: GalleryStorySceneDefinition[];
}

export interface GalleryHeroSource extends CombatHeroSource {
  abilities: Array<{
    id: string;
    name: string;
    description?: string;
    effect?: string;
    uses?: {scope: import('../../combat/model/types').CombatUsageScope; max: number} | null;
  }>;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    effect: string;
    charges?: number | {
      scope: import('../../combat/model/types').CombatUsageScope;
      max: number;
    } | null;
  }>;
}
