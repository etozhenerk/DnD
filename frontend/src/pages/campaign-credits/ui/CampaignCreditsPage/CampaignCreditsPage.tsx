import {penisuelaPreview} from '../../../../entities/campaign-preview/model/data';
import {penisuelaCredits} from '../../../../entities/campaign-session/model/credits';
import {CampaignCredits} from '../../../../widgets/campaign-scene/ui/CampaignCredits/CampaignCredits';

export function CampaignCreditsPage() {
  return <CampaignCredits credits={penisuelaCredits} returnHref={`/region/${penisuelaPreview.regionId}`} />;
}
