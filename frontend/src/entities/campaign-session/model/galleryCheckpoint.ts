import type {GalleryEvent} from './gallerySession';

/** Keep the complete audit journal on disk, but replay only the selected branch. */
export function getEffectiveGalleryEvents(journal: GalleryEvent[]): GalleryEvent[] {
  const suffixes: GalleryEvent[][] = [];
  let prefix = journal;
  while (true) {
    let index = prefix.length - 1;
    while (index >= 0 && prefix[index].type !== 'scene-checkpoint-restored') index -= 1;
    if (index < 0) break;
    const event = prefix[index];
    if (event.type !== 'scene-checkpoint-restored' || event.eventCount < 1 || event.eventCount > index) {
      throw new Error('Invalid scene checkpoint boundary.');
    }
    suffixes.push(prefix.slice(index + 1));
    prefix = prefix.slice(0, event.eventCount);
  }
  return suffixes.length ? [...prefix, ...suffixes.reverse().flat()] : journal;
}
