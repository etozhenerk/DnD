import type {ReactNode} from 'react';
import styles from './ChoiceTile.module.css';

export type ChoiceTileProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  image?: string;
  icon?: ReactNode;
  onSelect: () => void;
};

export function ChoiceTile({title, subtitle, selected, image, icon, onSelect}: ChoiceTileProps) {
  return (
    <button type="button" className={styles.tile} aria-pressed={selected} onClick={onSelect}>
      {image && <img src={image} alt="" loading="lazy" />}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.title}>{title}</span>
      {subtitle && <small>{subtitle}</small>}
    </button>
  );
}
