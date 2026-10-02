import {useEffect, useState} from 'react';
import type {FocusEvent} from 'react';
import {advisorAnimations} from '../config/animations';
import type {AdvisorMood} from './types';

export function useAdvisorInteraction(mood: AdvisorMood) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [hoverSuppressed, setHoverSuppressed] = useState(false);
  const [iteration, setIteration] = useState(0);
  useEffect(() => {
    if (!clicked) return;
    const duration = advisorAnimations.playful.durations.reduce((total, value) => total + value, 0);
    const timer = window.setTimeout(() => setClicked(false), duration);
    return () => window.clearTimeout(timer);
  }, [clicked, iteration]);
  let state = mood;
  if (mood === 'idle' && !hoverSuppressed && (hovered || focused)) state = 'curious';
  if (clicked) state = 'playful';
  return {
    state,
    iteration,
    onPointerEnter: () => {
      setHovered(true);
      setHoverSuppressed(false);
    },
    onPointerLeave: () => setHovered(false),
    onFocus: (event: FocusEvent<HTMLButtonElement>) => {
      const keyboard = event.currentTarget.matches(':focus-visible');
      setFocused(keyboard);
      if (keyboard) setHoverSuppressed(false);
    },
    onBlur: () => setFocused(false),
    onClick: () => {
      setHoverSuppressed(true);
      setClicked(true);
      setIteration(value => value + 1);
    },
  };
}
