import {useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaPreview} from '../../../../entities/campaign-preview/model/data';
import {CampaignPreview} from '../../../../widgets/campaign-preview/ui/CampaignPreview/CampaignPreview';
import {CampaignPreviewOutro} from '../../../../widgets/campaign-scene/ui/CampaignPreviewOutro/CampaignPreviewOutro';
import styles from './CampaignPreviewPage.module.css';

export function CampaignPreviewPage() {
  const navigate = useNavigate();
  const [outroStarted, setOutroStarted] = useState(false);
  const outro = penisuelaPreview.outro;
  const openFirstScene = useCallback(() => {
    if (outro) navigate(`/campaign/${penisuelaPreview.campaignId}/play/${outro.nextSceneId}`);
  }, [navigate, outro]);

  return (
    <main className={styles.page}>
      {outroStarted && outro ? (
        <CampaignPreviewOutro outro={outro} onComplete={openFirstScene} />
      ) : (
        <CampaignPreview
          preview={penisuelaPreview}
          onFinish={outro ? () => setOutroStarted(true) : undefined}
        />
      )}
    </main>
  );
}
