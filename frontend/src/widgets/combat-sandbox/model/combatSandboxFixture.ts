import {penisuelaGalleryGameplay} from '../../../entities/campaign-session/model/data';
import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../entities/campaign-session/model/types';

export const COMBAT_SANDBOX_CAMPAIGN_ID = 'penisuela-combat-sandbox';
export const COMBAT_SANDBOX_ENCOUNTER_ID = 'prop-room-winding-carriers';
export const COMBAT_SANDBOX_SCENE_ID = 'vip-prop-room-carriers';

export const combatSandboxScene: CampaignSessionScene = {
  id: COMBAT_SANDBOX_SCENE_ID,
  title: 'Засада заводных носильщиков',
  eyebrow: 'Боевая песочница',
  background: 'assets/concepts/campaigns/penisuela/scenes/vip-prop-room-carriers.png',
  alt: 'Три заводных носильщика оживают перед сломанным паланкином в реквизиторской.',
  readAloud: 'Три заводных носильщика синхронно поднимаются перед паланкином и перекрывают путь к скипетру.',
  inspectables: [],
  exit: null,
};

export const combatSandboxDefinition: GalleryGameplayDefinition = {
  ...penisuelaGalleryGameplay,
  id: COMBAT_SANDBOX_CAMPAIGN_ID,
  campaignId: COMBAT_SANDBOX_CAMPAIGN_ID,
  sceneId: COMBAT_SANDBOX_SCENE_ID,
  initialView: 'prop-room',
};
