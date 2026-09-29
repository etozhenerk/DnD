import type {Region} from '../../../../entities/region/model/types';
import {RegionCard} from '../../../../entities/region/ui/RegionCard/RegionCard';
import styles from './RegionJournal.module.css';

interface RegionJournalProps {
  regions: Region[];
  onSelect: (id: string) => void;
}

export function RegionJournal({regions, onSelect}: RegionJournalProps) {
  return (
    <aside className={styles.book} aria-label="Оглавление атласа">
      <div className={styles.heading}>
        <span>Путевой журнал</span>
        <h2>Восемь земель</h2>
        <p>Выберите область на карте или откройте запись в книге.</p>
      </div>
      <div className={styles.entries}>{regions.map((region) => <RegionCard key={region.id} region={region} onSelect={onSelect} />)}</div>
    </aside>
  );
}
