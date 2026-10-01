import {useEffect, useRef} from 'react';

export function useProgressScroll(currentId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    function showCurrentStep() {
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;
      const current = rail.querySelector('[aria-current="step"]');
      if (!current) return;
      const railRect = rail.getBoundingClientRect();
      const stepRect = current.getBoundingClientRect();
      rail.scrollTo({left: rail.scrollLeft + stepRect.left - railRect.left - (rail.clientWidth - stepRect.width) / 2});
    }
    showCurrentStep();
    const observer = new ResizeObserver(showCurrentStep);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [currentId]);
  return ref;
}
