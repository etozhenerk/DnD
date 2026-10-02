import {useEffect, useRef, useState} from 'react';

export function useAdvisorMotionPolicy() {
  const element = useRef<SVGSVGElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    const update = () => setPlaying(inView && !document.hidden && !preference.matches);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (element.current) observer.observe(element.current);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return {element, playing};
}
