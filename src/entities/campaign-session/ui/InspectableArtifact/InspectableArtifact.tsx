import type {CampaignSceneInspectable} from '../../model/types';
import {ArtifactGlyph} from '../ArtifactGlyph/ArtifactGlyph';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './InspectableArtifact.module.css';

interface InspectableArtifactProps {
  artifact: CampaignSceneInspectable;
  presentation: 'search' | 'inventory';
  inventorySlot?: number;
  onFind?: () => void;
  onOpen: () => void;
}

export function InspectableArtifact({
  artifact,
  presentation,
  inventorySlot,
  onFind,
  onOpen,
}: InspectableArtifactProps) {
  const visual = artifact.icon
    ? <img src={resolveAsset(artifact.icon)} alt="" />
    : artifact.visualKind ? <ArtifactGlyph kind={artifact.visualKind} size="icon" /> : null;

  if (presentation === 'search') {
    return (
      <button
        className={styles.hotspot}
        type="button"
        onClick={onFind}
        data-artifact-id={artifact.id}
        data-order={artifact.order}
        style={artifact.hotspotPosition ? {
          left: `${artifact.hotspotPosition.x}%`,
          top: `${artifact.hotspotPosition.y}%`,
        } : undefined}
        aria-label={`Осмотреть: ${artifact.label}. ${artifact.locationHint}`}
      >
        <span className={styles.hotspotLabel} aria-hidden="true">{artifact.label}</span>
      </button>
    );
  }

  return (
    <button
      className={styles.trigger}
      type="button"
      onClick={onOpen}
      data-artifact-id={artifact.id}
      data-generated-icon={Boolean(artifact.icon && artifact.visualKind)}
      data-order={inventorySlot ?? artifact.inventoryOrder ?? artifact.order}
      aria-haspopup="dialog"
      aria-label={`Осмотреть: ${artifact.label}`}
    >
      <span className={styles.iconWrap}>
        {visual}
      </span>
    </button>
  );
}
