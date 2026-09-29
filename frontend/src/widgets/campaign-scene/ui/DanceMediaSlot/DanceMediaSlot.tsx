import type {GalleryMediaSlotDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './DanceMediaSlot.module.css';

interface DanceMediaSlotProps {
  kind: 'audio' | 'video';
  slot: GalleryMediaSlotDefinition;
}

export function DanceMediaSlot({kind, slot}: DanceMediaSlotProps) {
  const source = slot.source ? resolveAsset(slot.source) : undefined;

  if (!source) return null;

  if (kind === 'video') {
    return (
      <figure className={styles.slot}>
        <video
          aria-label={slot.label}
          className={styles.video}
          controls
          loop
          muted
          playsInline
          preload="metadata"
          src={source}
        />
        <figcaption>{slot.label}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={styles.slot}>
      <audio
        aria-label={slot.label}
        className={styles.audio}
        controls
        loop
        preload="metadata"
        src={source}
      />
      <figcaption>{slot.label}</figcaption>
    </figure>
  );
}
