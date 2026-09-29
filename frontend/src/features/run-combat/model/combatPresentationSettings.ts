import {useSyncExternalStore} from 'react';

const skillVideosStorageKey = 'dnd-combat-skill-videos-enabled';
const skillVideosChangeEvent = 'dnd-combat-skill-videos-changed';

let skillVideosFallback = true;

function readSkillVideosEnabled() {
  if (typeof window === 'undefined') return skillVideosFallback;
  try {
    const storedValue = window.localStorage.getItem(skillVideosStorageKey);
    if (storedValue === null) return skillVideosFallback;
    skillVideosFallback = storedValue !== 'false';
  } catch {
    // The in-memory value keeps the control usable when storage is unavailable.
  }
  return skillVideosFallback;
}

function subscribeToSkillVideos(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('storage', callback);
  window.addEventListener(skillVideosChangeEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(skillVideosChangeEvent, callback);
  };
}

export function setCombatSkillVideosEnabled(enabled: boolean) {
  skillVideosFallback = enabled;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(skillVideosStorageKey, String(enabled));
  } catch {
    // The current tab still receives the in-memory value below.
  }
  window.dispatchEvent(new Event(skillVideosChangeEvent));
}

export function useCombatSkillVideosEnabled() {
  const enabled = useSyncExternalStore(
    subscribeToSkillVideos,
    readSkillVideosEnabled,
    () => true,
  );
  return [enabled, setCombatSkillVideosEnabled] as const;
}
