import type {AdvisorMood} from '../../model/types';
import styles from './AdvisorOwl.module.css';

export type AdvisorOwlProps = {
  image: string;
  mood: AdvisorMood;
};

export function AdvisorOwl({image, mood}: AdvisorOwlProps) {
  return <img className={styles.owl} data-mood={mood} src={image} alt="" />;
}
