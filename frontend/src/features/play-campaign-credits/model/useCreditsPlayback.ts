import {useCallback, useEffect, useRef, useState} from 'react';

type CreditsPhase = 'roll' | 'video' | 'end';

export function useCreditsPlayback(hasPostCreditsVideo = false) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<CreditsPhase>('roll');
  const [restartCount, setRestartCount] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const finish = useCallback(() => setPhase(hasPostCreditsVideo ? 'video' : 'end'), [hasPostCreditsVideo]);
  const completeVideo = useCallback(() => setPhase('end'), []);

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (phase !== 'roll' || paused || !visible) return;
    let frame = 0;
    let previousTime: number | null = null;
    let position = viewportRef.current?.scrollTop ?? 0;
    const advance = (time: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      if (previousTime !== null) position += Math.min(time - previousTime, 100) * 0.07;
      previousTime = time;
      viewport.scrollTop = position;
      const end = viewport.scrollHeight - viewport.clientHeight;
      if (end > 0 && viewport.scrollTop >= end - 1) {
        finish();
        return;
      }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [finish, paused, phase, restartCount, visible]);

  const restart = () => {
    setPhase('roll');
    setRestartCount((count) => count + 1);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  };

  return {
    viewportRef, phase, paused, visible, restartCount, restart, finish, completeVideo,
    pause: () => setPaused(true),
    togglePaused: () => setPaused((value) => !value),
  };
}
