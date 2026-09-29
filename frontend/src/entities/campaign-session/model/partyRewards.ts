import {olvaQuest} from './olvaQuest';
import catalog from '../../../../content/party-rewards.json';
import type {CombatUsageScope} from '../../combat/model/types';
import type {HeroStat} from './galleryGameplay';
import type {GalleryInventoryItemState, GallerySessionSnapshot} from './gallerySession';

export const GREY_WIESE_PERFUME_ID = 'grey-wiese-reputation-perfume';

export function createPartyRewardInventory(itemId: string): GalleryInventoryItemState | undefined {
  if (itemId === olvaQuest.reward.id) return {ownerId:null,quantity:1,charges:1,maxCharges:1,chargeScope:'campaign'};
  const reward = catalog.find((item) => item.id === itemId);
  if (!reward) return undefined;
  return {ownerId: null, quantity: 1, charges: reward.uses.max, maxCharges: reward.uses.max,
    chargeScope: reward.uses.scope as CombatUsageScope};
}

export function getAutomaticCheckReward(
  state: Pick<GallerySessionSnapshot, 'inventoryState' | 'heroHp' | 'combat'>,
  heroId: string,
  stat: HeroStat,
  itemId = GREY_WIESE_PERFUME_ID,
) {
  const reward = catalog.find((item) => item.id === itemId && item.automaticCheckStat === stat);
  const owned = state.inventoryState[itemId];
  if (!reward || !owned || owned.quantity < 1 || (state.heroHp[heroId] ?? 0) <= 0 || state.combat) return undefined;
  return {itemId, name: reward.name, charges: owned.charges, maxCharges: reward.uses.max};
}
