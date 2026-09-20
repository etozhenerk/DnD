import {clearSceneCheckpoints} from './sceneCheckpointStorage';
const STORAGE_VERSION = 3;
const STORAGE_KEY_PREFIX = 'dnd:campaign-scene:';
const INVENTORY_STORAGE_VERSION = 1;
const INVENTORY_STORAGE_KEY_PREFIX = 'dnd:campaign-inventory:';
const CAMPAIGN_MODULE_STORAGE_KEY_PREFIXES = [
  'dnd:hotel-gallery-adventure:',
];

export const CAMPAIGN_STORAGE_RESET_EVENT = 'dnd:campaign-storage-reset';

export interface CampaignStorageResetDetail {
  campaignId: string;
}

export interface CampaignSceneStoredState {
  version: typeof STORAGE_VERSION;
  sceneId: string;
  introRead: boolean;
  revealedInspectableIds: string[];
  viewedInspectableIds: string[];
}

interface RawCampaignSceneStoredState {
  version?: number;
  sceneId?: string;
  introRead?: boolean;
  revealedInspectableIds?: unknown;
  viewedInspectableIds?: unknown;
}

export interface CampaignInventoryStoredState {
  slots?: (string | null)[];
  version: typeof INVENTORY_STORAGE_VERSION;
  campaignId: string;
  revealedInspectableIds: string[];
  viewedInspectableIds: string[];
}

interface RawCampaignInventoryStoredState {
  slots?: unknown;
  version?: number;
  campaignId?: string;
  revealedInspectableIds?: unknown;
  viewedInspectableIds?: unknown;
}

export function readCampaignSceneState(sceneId: string): CampaignSceneStoredState | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${sceneId}`);
    if (!rawValue) return null;

    const value = JSON.parse(rawValue) as RawCampaignSceneStoredState;
    if (
      value.sceneId !== sceneId
      || typeof value.introRead !== 'boolean'
      || !Array.isArray(value.revealedInspectableIds)
      || !value.revealedInspectableIds.every((id) => typeof id === 'string')
    ) return null;

    if (value.version === 2) {
      return {
        version: STORAGE_VERSION,
        sceneId,
        introRead: value.introRead,
        revealedInspectableIds: value.revealedInspectableIds,
        viewedInspectableIds: value.revealedInspectableIds,
      };
    }

    if (
      value.version !== STORAGE_VERSION
      || !Array.isArray(value.viewedInspectableIds)
      || !value.viewedInspectableIds.every((id) => typeof id === 'string')
    ) return null;

    return value as CampaignSceneStoredState;
  } catch {
    return null;
  }
}

export function writeCampaignSceneState(state: Omit<CampaignSceneStoredState, 'version'>): void {
  if (typeof window === 'undefined') return;

  try {
    if (
      !state.introRead
      && !state.revealedInspectableIds.length
      && !state.viewedInspectableIds.length
    ) {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${state.sceneId}`);
      return;
    }
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${state.sceneId}`, JSON.stringify({
      version: STORAGE_VERSION,
      ...state,
    }));
  } catch {
    // The scene remains playable when storage is unavailable.
  }
}

export function readCampaignInventoryState(
  campaignId: string,
  legacySceneIds: string[],
): CampaignInventoryStoredState | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(`${INVENTORY_STORAGE_KEY_PREFIX}${campaignId}`);
    if (rawValue) {
      const value = JSON.parse(rawValue) as RawCampaignInventoryStoredState;
      if (
        value.version === INVENTORY_STORAGE_VERSION
        && value.campaignId === campaignId
        && Array.isArray(value.revealedInspectableIds)
        && value.revealedInspectableIds.every((id) => typeof id === 'string')
        && Array.isArray(value.viewedInspectableIds)
        && value.viewedInspectableIds.every((id) => typeof id === 'string')
      ) return {
        ...value,
        slots: Array.isArray(value.slots) && value.slots.every((id) => id === null || typeof id === 'string')
          ? value.slots : undefined,
      } as CampaignInventoryStoredState;
    }

    const legacyStates = legacySceneIds
      .map((sceneId) => readCampaignSceneState(sceneId))
      .filter((state): state is CampaignSceneStoredState => state !== null);
    if (!legacyStates.length) return null;

    return {
      version: INVENTORY_STORAGE_VERSION,
      campaignId,
      revealedInspectableIds: [...new Set(legacyStates.flatMap((state) => state.revealedInspectableIds))],
      viewedInspectableIds: [...new Set(legacyStates.flatMap((state) => state.viewedInspectableIds))],
    };
  } catch {
    return null;
  }
}

export function writeCampaignInventoryState(
  state: Omit<CampaignInventoryStoredState, 'version'>,
): void {
  if (typeof window === 'undefined') return;

  try {
    if (!state.revealedInspectableIds.length && !state.viewedInspectableIds.length) {
      window.localStorage.removeItem(`${INVENTORY_STORAGE_KEY_PREFIX}${state.campaignId}`);
      return;
    }
    window.localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${state.campaignId}`, JSON.stringify({
      version: INVENTORY_STORAGE_VERSION,
      ...state,
    }));
  } catch {
    // The scene remains playable when storage is unavailable.
  }
}

export function clearCampaignSceneAndInventoryState(
  campaignId: string,
  sceneIds: string[],
): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(`${INVENTORY_STORAGE_KEY_PREFIX}${campaignId}`);
    CAMPAIGN_MODULE_STORAGE_KEY_PREFIXES.forEach((prefix) => {
      window.localStorage.removeItem(`${prefix}${campaignId}`);
    });
    [...new Set(sceneIds)].forEach((sceneId) => {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sceneId}`);
    });
  } catch {
    // Reset still clears in-memory state when storage is unavailable.
  }

  clearSceneCheckpoints(campaignId);
  window.dispatchEvent(new CustomEvent<CampaignStorageResetDetail>(CAMPAIGN_STORAGE_RESET_EVENT, {
    detail: {campaignId},
  }));
}
