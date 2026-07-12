import type {CSSProperties} from 'react';
import type {Region} from '../../../../entities/region/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {PageHeader} from '../../../../widgets/page-header/ui/PageHeader/PageHeader';
import {PlannedCampaign} from '../../../../widgets/planned-campaign/ui/PlannedCampaign/PlannedCampaign';
import {CompletedCampaign} from '../../../../widgets/completed-campaign/ui/CompletedCampaign/CompletedCampaign';
import styles from './RegionPage.module.css';

interface RegionPageProps {
  region: Region;
  onBack: () => void;
}

export function RegionPage({region, onBack}: RegionPageProps) {
  const isPlanned = region.status !== 'completed';
  const pageStyle = isPlanned ? {
    '--region-page-background': `url("${resolveAsset('assets/concepts/style/planned-campaign-background.webp')}")`,
  } as CSSProperties : undefined;

  return (
    <main className={`${styles.page} ${isPlanned ? styles.planned : ''}`} style={pageStyle}>
      <PageHeader eyebrow={isPlanned ? '' : `Летопись ${String(region.order).padStart(2, '0')}`} title={region.name} subtitle={isPlanned ? '' : region.description} onBack={onBack} />
      {region.status === 'completed' ? <CompletedCampaign region={region} /> : <PlannedCampaign region={region} />}
    </main>
  );
}
