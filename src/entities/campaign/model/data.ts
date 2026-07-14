import lindaSmallCampaignData from '../../../../content/campaigns/linda-small.json';
import norIlSkaldCampaignData from '../../../../content/campaigns/nor-il-skald.json';
import type {Campaign} from './types';

export const norIlSkaldCampaign = norIlSkaldCampaignData as Campaign;
export const lindaSmallCampaign = lindaSmallCampaignData as Campaign;
export const campaigns = [norIlSkaldCampaign, lindaSmallCampaign];
