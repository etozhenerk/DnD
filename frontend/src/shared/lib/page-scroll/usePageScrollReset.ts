import {useLayoutEffect} from 'react';

export function usePageScrollReset(enabled: boolean) {
  useLayoutEffect(() => {
    if (enabled) window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }, [enabled]);
}
