import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {Region} from '../../model/types';
import {StatusBadge} from '../StatusBadge/StatusBadge';
import styles from './RegionCard.module.css';

interface RegionCardProps {
  region: Region;
  onSelect: (id: string) => void;
}

export function RegionCard({region, onSelect}: RegionCardProps) {
  return (
    <button className={styles.card} type="button" onClick={() => onSelect(region.id)}>
      <span className={styles.number}>{String(region.order).padStart(2, '0')}</span>
      <span className={styles.art}><img src={resolveAsset(region.image)} alt="" /></span>
      <span className={styles.copy}>
        <strong>{region.name}</strong>
        <small>{region.description}</small>
        <StatusBadge status={region.status} />
      </span>
    </button>
  );
}
