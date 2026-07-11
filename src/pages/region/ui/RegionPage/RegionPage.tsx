import type {Region} from '../../../../entities/region/model/types';
import {PageHeader} from '../../../../widgets/page-header/ui/PageHeader/PageHeader';
import {PlannedCampaign} from '../../../../widgets/planned-campaign/ui/PlannedCampaign/PlannedCampaign';
import {CompletedCampaign} from '../../../../widgets/completed-campaign/ui/CompletedCampaign/CompletedCampaign';
import styles from './RegionPage.module.css';

interface RegionPageProps {
  region: Region;
  onBack: () => void;
}

export function RegionPage({region, onBack}: RegionPageProps) {
  return (
    <main className={styles.page}>
      <PageHeader eyebrow={`Летопись ${String(region.order).padStart(2, '0')}`} title={region.name} subtitle={region.description} onBack={onBack} />
      {region.status === 'completed' ? <CompletedCampaign region={region} /> : <PlannedCampaign region={region} />}
    </main>
  );
}
