import {penisuelaPreview} from '../../../../entities/campaign-preview/model/data';
import {CampaignPreview} from '../../../../widgets/campaign-preview/ui/CampaignPreview/CampaignPreview';
import styles from './CampaignPreviewPage.module.css';

export function CampaignPreviewPage() {
  return (
    <main className={styles.page}>
      <CampaignPreview preview={penisuelaPreview} />
    </main>
  );
}
