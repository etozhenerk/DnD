import type {RegionStatus} from '../../model/types';
import styles from './StatusBadge.module.css';

const labels: Record<RegionStatus, string> = {
  completed: 'Легенда завершена',
  ready: 'Готово к игре',
  planned: 'Неизведано',
};

export function StatusBadge({status}: {status: RegionStatus}) {
  return <span className={`${styles.badge} ${styles[status]}`}>{labels[status]}</span>;
}
