import charactersData from '../../../content/characters.json';
import lindaSmallCampaignData from '../../../content/campaigns/linda-small.json';
import campaignData from '../../../content/campaigns/nor-il-skald.json';
import worldMapData from '../../../content/world-map.json';
import type {Campaign} from '../../entities/campaign/model/types';
import type {Character} from '../../entities/character/model/types';
import type {WorldMap} from '../../entities/region/model/types';

export const worldMap = worldMapData as WorldMap;
export const norIlSkaldCampaign = campaignData as Campaign;
export const lindaSmallCampaign = lindaSmallCampaignData as Campaign;
export const campaigns = [norIlSkaldCampaign, lindaSmallCampaign];
export const characters = charactersData as Character[];
