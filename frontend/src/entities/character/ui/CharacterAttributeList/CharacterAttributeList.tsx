import {FantasyIcon} from '../../../../shared/ui/FantasyIcon';
import type {CharacterAttributeRow} from '../../model/attribute-presentation';
import styles from './CharacterAttributeList.module.css';

export type CharacterAttributeListProps = {
  rows: readonly CharacterAttributeRow[];
  columns?: 1 | 2;
  compact?: boolean;
};

export function CharacterAttributeList({rows, columns = 2, compact = false}: CharacterAttributeListProps) {
  return (
    <dl className={`${styles.list} ${columns === 2 ? styles.twoColumns : ''} ${compact ? styles.compact : ''}`}>
      {rows.map((row) => (
        <div key={row.id}>
          <dt><span className={styles.icon}><FantasyIcon name={row.icon} /></span>{row.label}</dt>
          <dd>{row.display}</dd>
        </div>
      ))}
    </dl>
  );
}
