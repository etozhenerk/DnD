import type {GalleryEvent} from '../../../entities/campaign-session/model/gallerySession';
import {
  createStoredGallerySessionEnvelope,
  parseStoredGallerySessionEnvelope,
  type GallerySessionJournalExpectation,
} from '../../../entities/campaign-session/model/gallerySessionJournal';

const STORAGE_KEY_PREFIX = 'dnd:gallery-game:';
type SessionListener = (campaignId: string, events: GalleryEvent[]) => void;
const sessionListeners = new Set<SessionListener>();

export function subscribeToGallerySessionWrites(listener: SessionListener) {
  sessionListeners.add(listener);
  return () => {sessionListeners.delete(listener);};
}

function notifySessionWrite(campaignId: string, events: GalleryEvent[]) {
  // Writes can occur in a React updater. Deliver presentation changes after it finishes.
  queueMicrotask(() => sessionListeners.forEach(listener => listener(campaignId, events)));
}
export function readGallerySessionEvents(expectation: GallerySessionJournalExpectation): GalleryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawValue = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${expectation.campaignId}`);
    if (!rawValue) return [];
    const parsed = parseStoredGallerySessionEnvelope(JSON.parse(rawValue), expectation);
    if (!parsed.ok) {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${expectation.campaignId}`);
      return [];
    }
    return parsed.events;
  } catch {
    return [];
  }
}

export function writeGallerySessionEvents(
  expectation: GallerySessionJournalExpectation,
  events: GalleryEvent[],
): void {
  if (typeof window === 'undefined') return;
  const envelope = events.length ? createStoredGallerySessionEnvelope(events, expectation) : null;
  if (events.length && !envelope) return;
  try {
    if (!events.length) {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${expectation.campaignId}`);
    } else {
      window.localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${expectation.campaignId}`,
        JSON.stringify(envelope),
      );
    }
  } catch {
    // The scene remains playable when storage is unavailable.
  }
  notifySessionWrite(expectation.campaignId, events);
}

export function clearGallerySessionEvents(campaignId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${campaignId}`);
  } catch {
    // Reset remains optional when storage is unavailable.
  }
  notifySessionWrite(campaignId, []);
}
