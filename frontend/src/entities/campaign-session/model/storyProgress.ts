import type {GalleryGameplayDefinition} from './galleryGameplay';
import type {GallerySessionSnapshot} from './gallerySession';

export function synchronizeStoryDoom(previous: GallerySessionSnapshot, next: GallerySessionSnapshot, definition: GalleryGameplayDefinition) {
  const milestones = definition.doomMilestones;
  if (!milestones?.some(({flag}) => Boolean(previous.flags[flag]) !== Boolean(next.flags[flag]))) return next;
  return {...next, counters: {...next.counters, doom: milestones.filter(({flag}) => next.flags[flag]).length}};
}
