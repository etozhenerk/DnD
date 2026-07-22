import type {CampaignSceneInspectable} from '../../model/types';
import {ArtifactGlyph} from '../ArtifactGlyph/ArtifactGlyph';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './InspectableArtifact.module.css';

interface InspectableArtifactProps {
  artifact: CampaignSceneInspectable;
  presentation: 'search' | 'inventory';
  onFind?: () => void;
  onOpen: () => void;
}

export function InspectableArtifact({artifact, presentation, onFind, onOpen}: InspectableArtifactProps) {
  const visual = artifact.visualKind
    ? <ArtifactGlyph kind={artifact.visualKind} size="icon" />
    : artifact.icon ? <img src={resolveAsset(artifact.icon)} alt="" /> : null;

  if (presentation === 'search') {
    return (
      <button
        className={styles.hotspot}
        type="button"
        onClick={onFind}
        data-order={artifact.order}
        style={artifact.hotspotPosition ? {
          left: `${artifact.hotspotPosition.x}%`,
          top: `${artifact.hotspotPosition.y}%`,
        } : undefined}
        aria-label={`Осмотреть: ${artifact.label}. ${artifact.locationHint}`}
      >
        {visual}
      </button>
    );
  }

  return (
    <button
      className={styles.trigger}
      type="button"
      onClick={onOpen}
      data-order={artifact.inventoryOrder ?? artifact.order}
      aria-haspopup="dialog"
      aria-label={`Осмотреть: ${artifact.label}`}
    >
      <span className={styles.iconWrap}>
        {visual}
      </span>
    </button>
  );
}
