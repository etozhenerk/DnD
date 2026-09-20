import lindaSmallCampaignData from '../../../../content/campaigns/linda-small.json';
import norIlSkaldCampaignData from '../../../../content/campaigns/nor-il-skald.json';
import penisuelaChronicleData from '../../../../content/campaigns/penisuela-chronicle.json';
import type {Campaign} from './types';

export const norIlSkaldCampaign = norIlSkaldCampaignData as Campaign;
export const lindaSmallCampaign = lindaSmallCampaignData as Campaign;
export const penisuelaCampaign = penisuelaChronicleData as Campaign;
export const campaigns: Campaign[] = [norIlSkaldCampaign, lindaSmallCampaign, penisuelaCampaign];
