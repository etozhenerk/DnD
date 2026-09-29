import type {GalleryGameplayDefinition} from './galleryGameplay';

export function getCampaignItemSkin(definition: GalleryGameplayDefinition, flags: Record<string, boolean>, itemId: string) {
  return definition.itemSkins?.find((skin) => skin.itemId === itemId && flags[skin.flag]);
}

export function getCampaignCombatPresentation(definition: GalleryGameplayDefinition, flags: Record<string, boolean>): GalleryGameplayDefinition {
  if (!definition.itemSkins?.some((skin) => flags[skin.flag])) return definition;
  return {...definition, combatActions: definition.combatActions.map((action) => {
    const skin = action.source === 'item' ? getCampaignItemSkin(definition, flags, action.sourceId) : undefined;
    return skin ? {...action, name: skin.name, artwork: skin.artwork} : action;
  })};
}
