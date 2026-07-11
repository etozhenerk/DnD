import {characters} from '../../../../shared/config/gameData';
import {HeroLegends} from '../../../../widgets/hero-legends/ui/HeroLegends/HeroLegends';
import styles from './HeroesPage.module.css';

export function HeroesPage() {
  return <main className={styles.page}><HeroLegends heroes={characters} /></main>;
}
