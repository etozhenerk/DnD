import {useLayoutEffect, useRef} from 'react';
import {animateLoadingHeight} from './animate-loading-height';

export function useLoadingTransition(loading: boolean) {
  const container = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    if (loading) {
      const rememberHeight = () => {previousHeight.current = element.getBoundingClientRect().height;};
      rememberHeight();
      const observer = new ResizeObserver(rememberHeight);
      observer.observe(element);
      return () => observer.disconnect();
    }
    const height = previousHeight.current;
    previousHeight.current = null;
    if (height !== null) return animateLoadingHeight(element, height);
  }, [loading]);

  return container;
}
