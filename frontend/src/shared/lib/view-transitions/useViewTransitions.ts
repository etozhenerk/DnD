import {useSyncExternalStore} from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

function getSnapshot() {
  return typeof document.startViewTransition === 'function'
    && !window.matchMedia(reducedMotionQuery).matches;
}

export function useViewTransitions() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
