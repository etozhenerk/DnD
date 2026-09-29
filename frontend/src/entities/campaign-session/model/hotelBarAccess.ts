import type {GallerySessionSnapshot} from './gallerySession';
import {PUSSY_BAR_PASSES_ITEM_ID, PUSSY_BAR_PASSES_QUANTITY} from './pussyAudienceRules';

/** Alexis records two permits as a flag; Pussy Sultan's three tokens are inventory items. */
export function canEnterHotelBar(state: Pick<GallerySessionSnapshot, 'flags' | 'inventoryState'>): boolean {
  return Boolean(state.flags['alexis-bar-permits-issued'])
    && (state.inventoryState[PUSSY_BAR_PASSES_ITEM_ID]?.quantity ?? 0) >= PUSSY_BAR_PASSES_QUANTITY;
}
