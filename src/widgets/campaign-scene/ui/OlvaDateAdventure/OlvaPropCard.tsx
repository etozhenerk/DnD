import type {CSSProperties} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import styles from './OlvaPropCard.module.css';
interface Props {label: string; sprite: number; selected?: boolean; onSelect: () => void; compact?: boolean;}
export function OlvaPropCard({label,sprite,selected=false,onSelect,compact=false}:Props) {
  const style = {'--prop-image':`url("${resolveAsset(olvaQuest.propsArtwork)}")`,backgroundPosition:`${sprite % 3 * 50}% ${Math.floor(sprite / 3) * 100}%`} as CSSProperties;
  return <button type="button" className={`${styles.card} ${compact ? styles.compact : ''}`} aria-pressed={selected} onClick={onSelect}>
    <span className={styles.art} style={style} aria-hidden="true" /><span className={styles.label}>{selected ? '✓ ' : ''}{label}</span>
  </button>;
}
