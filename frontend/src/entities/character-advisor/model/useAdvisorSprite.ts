import {useEffect, useState} from 'react';
import {getAdvisorFrame} from './animation-frame';
import {useAdvisorMotionPolicy} from './useAdvisorMotionPolicy';
import type {AdvisorMood} from './types';

export function useAdvisorSprite(mood: AdvisorMood, restart = 0) {
  const {element, playing} = useAdvisorMotionPolicy();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [introduced, setIntroduced] = useState(false);
  const [frame, setFrame] = useState(() => getAdvisorFrame('idle', 0));
  const state = !introduced && mood === 'idle' ? 'greeting' : mood;
  useEffect(() => {
    if (state === 'curious' || state === 'playful') setIntroduced(true);
    if (!playing || !loaded || failed) {
      setFrame(getAdvisorFrame('idle', 0));
      return;
    }
    let timer = 0;
    const started = performance.now();
    function tick() {
      const next = getAdvisorFrame(state, performance.now() - started);
      setFrame(next);
      if (state === 'greeting' && next.row === 0) {
        setIntroduced(true);
        return;
      }
      timer = window.setTimeout(tick, Math.max(16, next.remaining));
    }
    tick();
    return () => window.clearTimeout(timer);
  }, [state, playing, loaded, failed, restart]);
  return {element, frame, failed, onLoad: () => setLoaded(true), onError: () => setFailed(true)};
}
