import {useEffect, useState} from 'react';
import type {AdvisorMood} from './types';

export function useAdvisorMood(
  pending: boolean, error: string | null, replyId: string | null, appliedId: string | null = null,
): AdvisorMood {
  const [speaking, setSpeaking] = useState(false);
  const [happy, setHappy] = useState(false);
  useEffect(() => {
    if (!replyId) {setSpeaking(false); return;}
    setSpeaking(true);
    const timer = window.setTimeout(() => setSpeaking(false), 2000);
    return () => window.clearTimeout(timer);
  }, [replyId]);
  useEffect(() => {
    if (!appliedId) {setHappy(false); return;}
    setHappy(true);
    const timer = window.setTimeout(() => setHappy(false), 1400);
    return () => window.clearTimeout(timer);
  }, [appliedId]);
  if (pending) return 'thinking';
  if (error) return 'error';
  if (happy) return 'happy';
  return speaking ? 'speaking' : 'idle';
}
