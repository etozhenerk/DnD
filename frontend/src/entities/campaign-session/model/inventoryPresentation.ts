import type {GalleryEvent} from './gallerySession';

/** The recovered recording keeps its gameplay item ID and its original scene artwork ID. */
export function toCampaignInspectableId(id: string) {
  return id === 'recording-for-egorik' ? 'egorik-recording' : id;
}

/** Include corrected commands so undo can remove an item from the persisted bag too. */
export function getManagedInventoryIds(journal: GalleryEvent[], knownIds: readonly string[]) {
  return [...new Set([...knownIds, ...journal.flatMap(event => {
    if (event.type === 'item-changed') return [event.itemId];
    if (event.type === 'manual-adjustment' && event.adjustment.kind === 'inventory-item') return [event.adjustment.itemId];
    return [];
  })])];
}
