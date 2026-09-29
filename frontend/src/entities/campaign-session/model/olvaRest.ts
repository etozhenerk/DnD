import type {GallerySessionSnapshot} from './gallerySession';
import {olvaQuest} from './olvaQuest';
import type {GalleryStoryOutcome} from './galleryGameplay';

export function parseRestRoll(value: string): number | null {
  if (!value.trim()) return null;
  const roll = Number(value);
  return Number.isInteger(roll) && roll >= 1 && roll <= 8 ? roll : null;
}

export function parseRestRolls(heroIds: string[], values: Record<string, string>): Record<string, number> | null {
  if (!heroIds.length || heroIds.some(id => parseRestRoll(values[id] ?? '') === null)) return null;
  return Object.fromEntries(heroIds.map(id => [id, parseRestRoll(values[id])!]));
}

export function createOlvaRestCommand(state: GallerySessionSnapshot) {
  const itemId = olvaQuest.reward.id;
  const item = state.inventoryState[itemId];
  if (state.combat || state.flags['olva-rest-used'] || !state.inventory.includes(itemId) || !item || item.quantity < 1 || item.charges < 1) return null;
  return {rest: {type: 'party-fully-rested' as const, consumedItemId: itemId},
    charge: {type: 'item-charge-changed' as const, itemId, change: {mode: 'delta' as const, value: -1}},
    remove: {type: 'item-changed' as const, itemId, acquired: false},
    used: {type: 'flag-changed' as const, flag: 'olva-rest-used', value: true},
  };
}

/** Existing saves may already own the old reward. A handoff never refills it. */
export function getOlvaRewardOutcome(outcome: GalleryStoryOutcome, state: Pick<GallerySessionSnapshot, 'inventory' | 'flags'>): GalleryStoryOutcome {
  const acquire = outcome.inventory?.acquire?.filter(id => !state.inventory.includes(id)
    && !(id === olvaQuest.reward.id && state.flags['olva-rest-used'])) ?? [];
  return {...outcome, inventory: {...outcome.inventory, acquire,
    quantities: Object.fromEntries(Object.entries(outcome.inventory?.quantities ?? {}).filter(([id]) => acquire.includes(id)))},
    itemCharges: Object.fromEntries(Object.entries(outcome.itemCharges ?? {}).filter(([id]) => acquire.includes(id)))};
}
