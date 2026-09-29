import type {GalleryGameplayDefinition, GalleryStoryActionDefinition, GalleryStoryCheckDefinition, HeroStat} from '../../../entities/campaign-session/model/galleryGameplay';
import type {GallerySessionSnapshot} from '../../../entities/campaign-session/model/gallerySession';
import {isGalleryStoryConditionMet} from '../../../entities/campaign-session/model/galleryGameplay';
import {resolveNextFormalActionConditions} from '../../../entities/campaign-session/model/conditionRules';
import {isCombatActionSourceAvailable} from '../../run-combat/model/combatCommands';

export function getStoryActionAvailability(action: GalleryStoryActionDefinition, state: GallerySessionSnapshot, definition: GalleryGameplayDefinition) {
  if ((action.requirements && state.combat) || !isGalleryStoryConditionMet(action.conditions, state)) return false;
  const required = action.requirements;
  if (!required) return true;
  const hero = state.heroSources.find((candidate) => candidate.id === required.heroId);
  if (!hero || (state.heroHp[hero.id] ?? hero.hp) <= 0) return false;
  if (required.abilityIds?.some((id) => !hero.abilities.some((ability) => ability.id === id))) return false;
  if (required.ownedItemIds?.some((id) => {
    const item = state.inventoryState[id];
    return !item || item.ownerId !== hero.id || item.quantity <= 0;
  })) return false;
  if (required.itemIds?.some((id) => {
    const item = state.inventoryState[id];
    return !item || item.ownerId !== hero.id || item.quantity <= 0 || (item.maxCharges !== null && item.charges <= 0);
  })) return false;
  if (required.resourceActionId) {
    const resource = definition.combatActions.find((candidate) => candidate.id === required.resourceActionId);
    if (!resource || resource.characterId !== hero.id || !isCombatActionSourceAvailable(resource, state)) return false;
  }
  return true;
}

export function getStoryCheckSettings(check: GalleryStoryCheckDefinition, state: GallerySessionSnapshot, heroId: string, stat: HeroStat) {
  if (check.npcActor) {
    return {dc: check.dc, modifier: check.npcActor.stats[stat] ?? 0, advantage: false};
  }
  const hero = state.heroSources.find((candidate) => candidate.id === heroId);
  const condition = resolveNextFormalActionConditions(state.participantConditions[heroId] ?? []);
  return {
    dc: (check.dcOverrides?.find((override) => override.heroIds.includes(heroId))?.dc ?? check.dc)
      + (check.dcModifiers ?? []).filter((modifier) => state.flags[modifier.flag]).reduce((sum, modifier) => sum + modifier.delta, 0),
    modifier: (hero?.stats[stat] ?? 0) + (check.modifierBonus ?? 0)
      + (state.participantTemporaryModifiers[heroId] ?? 0) + condition.rollModifier,
    advantage: Boolean((check.advantageIfFlag && state.flags[check.advantageIfFlag]) || check.advantageIfHeroId === heroId),
  };
}
