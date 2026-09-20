import type {
  GalleryDancePuzzleDefinition,
  GalleryDanceTrackDefinition,
} from './galleryGameplay';

export type DanceTrackSelectionResolution =
  | {kind: 'blocked'}
  | {kind: 'correct'; track: GalleryDanceTrackDefinition; summonGuards: boolean}
  | {kind: 'wrong'; track: GalleryDanceTrackDefinition; summonGuards: true};

export function resolveDanceTrackSelection(
  puzzle: GalleryDancePuzzleDefinition,
  flags: Record<string, boolean>,
  trackId: string,
): DanceTrackSelectionResolution {
  const track = puzzle.tracks.find((item) => item.id === trackId);
  if (
    !track
    || flags['dance-troupe-freed']
    || flags['dance-guard-wave-pending']
    || flags[`dance-track-${track.id}-rejected`]
  ) return {kind: 'blocked'};

  if (!track.correct) return {kind: 'wrong', track, summonGuards: true};

  const hasPreviousMistake = puzzle.tracks.some((item) => (
    !item.correct && flags[`dance-track-${item.id}-rejected`]
  ));
  return {
    kind: 'correct',
    track,
    summonGuards: Boolean(puzzle.firstCorrectTrackCombat) && !hasPreviousMistake,
  };
}

export function canStartDanceGuardCombat(
  flags: Record<string, boolean>,
  combatActive: boolean,
) {
  return Boolean(
    flags['dance-guard-wave-pending']
    && (!flags['dance-troupe-freed'] || flags['dance-correct-track-selected'])
    && !combatActive,
  );
}
