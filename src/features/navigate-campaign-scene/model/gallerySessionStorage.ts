import type {GalleryEvent} from '../../../entities/campaign-session/model/gallerySession';
import {GALLERY_SESSION_VERSION} from '../../../entities/campaign-session/model/gallerySession';

const STORAGE_KEY_PREFIX = 'dnd:gallery-game:';

interface StoredGallerySession {
  version: typeof GALLERY_SESSION_VERSION;
  campaignId: string;
  events: GalleryEvent[];
}

export function readGallerySessionEvents(campaignId: string): GalleryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawValue = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${campaignId}`);
    if (!rawValue) return [];
    const stored = JSON.parse(rawValue) as Partial<StoredGallerySession>;
    if (
      stored.version !== GALLERY_SESSION_VERSION
      || stored.campaignId !== campaignId
      || !Array.isArray(stored.events)
    ) return [];
    return stored.events;
  } catch {
    return [];
  }
}

export function writeGallerySessionEvents(campaignId: string, events: GalleryEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${campaignId}`, JSON.stringify({
      version: GALLERY_SESSION_VERSION,
      campaignId,
      events,
    } satisfies StoredGallerySession));
  } catch {
    // The scene remains playable when storage is unavailable.
  }
}

export function clearGallerySessionEvents(campaignId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${campaignId}`);
  } catch {
    // Reset remains optional when storage is unavailable.
  }
}
