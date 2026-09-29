import {useEffect, useSyncExternalStore} from 'react';

const owners = new Set<symbol>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
};

/** Each foreground player owns its pause request; overlapping clips cannot resume the background early. */
export function useForegroundMedia(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const owner = Symbol();
    owners.add(owner);
    notify();
    return () => {owners.delete(owner); notify();};
  }, [active]);
}

export function useBackgroundMediaPaused() {
  return useSyncExternalStore(subscribe, () => owners.size > 0, () => false);
}
