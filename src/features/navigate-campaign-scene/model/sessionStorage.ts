const STORAGE_VERSION = 3;
const STORAGE_KEY_PREFIX = 'dnd:campaign-scene:';
const INVENTORY_STORAGE_VERSION = 1;
const INVENTORY_STORAGE_KEY_PREFIX = 'dnd:campaign-inventory:';

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
  version: typeof INVENTORY_STORAGE_VERSION;
  campaignId: string;
  revealedInspectableIds: string[];
  viewedInspectableIds: string[];
}

interface RawCampaignInventoryStoredState {
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
      ) return value as CampaignInventoryStoredState;
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
    window.localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${state.campaignId}`, JSON.stringify({
      version: INVENTORY_STORAGE_VERSION,
      ...state,
    }));
  } catch {
    // The scene remains playable when storage is unavailable.
  }
}
