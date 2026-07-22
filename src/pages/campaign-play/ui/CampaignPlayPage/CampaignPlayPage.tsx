import {useParams} from 'react-router-dom';
import {penisuelaSessionPreview} from '../../../../entities/campaign-session/model/data';
import {CampaignScene} from '../../../../widgets/campaign-scene/ui/CampaignScene/CampaignScene';
import {GalleryAdventure} from '../../../../widgets/campaign-scene/ui/GalleryAdventure/GalleryAdventure';
import styles from './CampaignPlayPage.module.css';

const galleryGameplaySceneIds = new Set([
  'hotel-gallery',
  'hotel-gallery-pussy',
  'vip-prop-room',
  'hotel-gallery-pussy-return',
  'hotel-archive-alexis',
  'hotel-gallery-kraken',
  'hotel-gallery-kraken-linda-disabled',
  'hotel-gallery-kraken-defeated',
]);

export function CampaignPlayPage() {
  const {sceneId} = useParams();
  const scene = penisuelaSessionPreview.scenes.find((item) => item.id === sceneId)
    ?? penisuelaSessionPreview.scenes.find((item) => item.id === penisuelaSessionPreview.initialSceneId);
  const previousScene = penisuelaSessionPreview.scenes.find((item) => item.exit?.nextSceneId === scene?.id);

  if (!scene) return null;

  if (galleryGameplaySceneIds.has(scene.id)) {
    return <main className={styles.page}><GalleryAdventure /></main>;
  }

  return (
    <main className={styles.page}>
      <CampaignScene
        key={scene.id}
        campaignId={penisuelaSessionPreview.campaignId}
        campaignScenes={penisuelaSessionPreview.scenes}
        backLabel={previousScene?.id === penisuelaSessionPreview.initialSceneId
          ? '← Вернуться к пробуждению'
          : '← Назад'}
        backHref={previousScene ? `/campaign/${penisuelaSessionPreview.campaignId}/play/${previousScene.id}` : undefined}
        scene={scene}
      />
    </main>
  );
}
