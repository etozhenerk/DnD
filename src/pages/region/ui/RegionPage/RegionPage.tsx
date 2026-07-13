import type {CSSProperties} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {campaigns, worldMap} from '../../../../shared/config/gameData';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {PageHeader} from '../../../../widgets/page-header/ui/PageHeader/PageHeader';
import {PlannedCampaign} from '../../../../widgets/planned-campaign/ui/PlannedCampaign/PlannedCampaign';
import {CompletedCampaign} from '../../../../widgets/completed-campaign/ui/CompletedCampaign/CompletedCampaign';
import styles from './RegionPage.module.css';

export function RegionPage() {
  const navigate = useNavigate();
  const {regionId} = useParams();
  const region = worldMap.regions.find((item) => item.id === regionId || item.aliases?.includes(regionId ?? ''));

  if (!region) return <Navigate replace to="/not-found" />;
  if (region.id !== regionId) return <Navigate replace to={`/region/${region.id}`} />;

  const campaign = campaigns.find((item) => item.id === region.campaignId);
  const isPlanned = region.status !== 'completed' || !campaign;
  const backgroundAsset = isPlanned
    ? 'assets/concepts/style/planned-campaign-background.webp'
    : campaign.presentation?.background ?? 'assets/concepts/style/planned-campaign-background.webp';
  const pageStyle = {
    '--region-page-background': `url("${resolveAsset(backgroundAsset)}")`,
  } as CSSProperties;

  return (
    <main className={`${styles.page} ${isPlanned ? styles.planned : styles.completed}`} style={pageStyle}>
      <PageHeader eyebrow="" title={region.name} subtitle={isPlanned ? '' : campaign.presentation?.pageSubtitle ?? campaign.subtitle} onBack={() => navigate('/')} />
      {!isPlanned ? <CompletedCampaign campaign={campaign} region={region} /> : <PlannedCampaign region={region} />}
    </main>
  );
}
