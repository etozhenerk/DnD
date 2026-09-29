import finalBossData from '../../../../content/campaigns/penisuela-final-boss.json';
import {penisuelaGalleryGameplay} from '../../campaign-session/model/data';
import type {GalleryGameplayDefinition} from '../../campaign-session/model/galleryGameplay';
import type {FinalBossDefinition} from './types';

export const penisuelaFinalBoss = finalBossData as FinalBossDefinition;

export const penisuelaFinalBossGameplay: GalleryGameplayDefinition = {
  ...penisuelaGalleryGameplay,
  npcBehaviors: [
    ...penisuelaGalleryGameplay.npcBehaviors,
    penisuelaFinalBoss.npcBehavior,
  ],
  encounters: [
    ...penisuelaGalleryGameplay.encounters.filter(
      (encounter) => encounter.id !== penisuelaFinalBoss.encounter.id,
    ),
    penisuelaFinalBoss.encounter,
  ],
};
