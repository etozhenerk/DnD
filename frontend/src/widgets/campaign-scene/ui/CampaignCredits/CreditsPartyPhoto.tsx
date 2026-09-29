import {useState} from 'react';
import type {CampaignCreditsPhoto} from '../../../../entities/campaign-session/model/credits';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './CreditsPartyPhoto.module.css';

const poses = [styles.tiltLeft, styles.tiltRight, styles.tiltSmallLeft, styles.tiltSmallRight];

export function CreditsPartyPhoto({photo, index}: {photo: CampaignCreditsPhoto; index: number}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`${styles.photo} ${poses[index % poses.length]}`}>
      <div className={styles.print}>
        {failed ? <p className={styles.error} role="status">Не удалось загрузить фотографию.</p> : (
          <img
            src={resolveAsset(photo.source)} alt={photo.alt}
            width={1672} height={941} loading={index < 2 ? 'eager' : 'lazy'} decoding="async"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption>{photo.caption}</figcaption>
    </figure>
  );
}
