import type {CSSProperties} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {worldMap} from '../../../../shared/config/gameData';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {PageHeader} from '../../../../widgets/page-header/ui/PageHeader/PageHeader';
import {PlannedCampaign} from '../../../../widgets/planned-campaign/ui/PlannedCampaign/PlannedCampaign';
import {CompletedCampaign} from '../../../../widgets/completed-campaign/ui/CompletedCampaign/CompletedCampaign';
import styles from './RegionPage.module.css';

export function RegionPage() {
  const navigate = useNavigate();
  const {regionId} = useParams();
  const region = worldMap.regions.find((item) => item.id === regionId);

  if (!region) return <Navigate replace to="/not-found" />;

  const isPlanned = region.status !== 'completed';
  const completedSubtitle = 'Северное королевство льда, дворцовых ангаров и упрямых жителей, переживших самый долгий рейс в истории.';
  const backgroundAsset = isPlanned
    ? 'assets/concepts/style/planned-campaign-background.webp'
    : 'assets/concepts/style/nor-il-skald-completed-background-tall.png';
  const pageStyle = {
    '--region-page-background': `url("${resolveAsset(backgroundAsset)}")`,
  } as CSSProperties;

  return (
    <main className={`${styles.page} ${isPlanned ? styles.planned : styles.completed}`} style={pageStyle}>
      <PageHeader eyebrow="" title={region.name} subtitle={isPlanned ? '' : completedSubtitle} onBack={() => navigate('/')} />
      {region.status === 'completed' ? <CompletedCampaign region={region} /> : <PlannedCampaign region={region} />}
    </main>
  );
}
