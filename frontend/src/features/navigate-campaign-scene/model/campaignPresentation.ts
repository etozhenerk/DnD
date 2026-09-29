import {createContext} from 'react';

export interface DoomPresentation {stage: number; visible: boolean; consoleAcquired: boolean; sessionId: string;}
export interface DoomAnimation extends DoomPresentation {from: number | null; appearing: boolean; revision: number;}

/** Restore silently; distinguish collecting the console from showing it again after combat. */
export function updateDoomPresentation(previous: DoomAnimation | null, next: DoomPresentation): DoomAnimation {
  const stage = Math.max(0, Math.min(5, next.stage));
  if (!previous || previous.sessionId !== next.sessionId) return {...next, stage, from: null, appearing: false, revision: 0};
  if (previous.stage === stage && previous.visible === next.visible && previous.consoleAcquired === next.consoleAcquired) return previous;
  const acquiredNow = next.consoleAcquired && !previous.consoleAcquired;
  const increasing = stage > previous.stage;
  return {...next, stage,
    appearing: next.consoleAcquired && !increasing && (acquiredNow || previous.appearing),
    from: !next.consoleAcquired ? null : increasing ? previous.stage : stage < previous.stage ? null : previous.from,
    revision: increasing || acquiredNow ? previous.revision + 1 : previous.revision};
}

export const CampaignPresentationContext = createContext<{
  updateDoom: (snapshot: DoomPresentation) => void;
  enterPortal: (destination: string) => void;
} | null>(null);
