import {advisorAnimations, spriteGeometry} from '../config/animations';
import type {AdvisorMood} from './types';

export type AdvisorFrame = {row: number; column: number; x: number; y: number; remaining: number; viewBox: string};

export function getAdvisorFrame(mood: AdvisorMood, elapsed: number): AdvisorFrame {
  const animation = advisorAnimations[mood];
  const duration = animation.durations.reduce((total, value) => total + value, 0);
  if (!animation.loop && elapsed >= duration) return getAdvisorFrame('idle', elapsed - duration);
  let time = Math.max(0, elapsed) % duration;
  let column = 0;
  while (time >= animation.durations[column]) {
    time -= animation.durations[column];
    column += 1;
  }
  const x = column * spriteGeometry.width + spriteGeometry.insetX;
  const y = animation.row * spriteGeometry.height + spriteGeometry.insetY;
  return {
    row: animation.row,
    column,
    x,
    y,
    remaining: animation.durations[column] - time,
    viewBox: `${x} ${y} ${spriteGeometry.viewportWidth} ${spriteGeometry.viewportHeight}`,
  };
}
