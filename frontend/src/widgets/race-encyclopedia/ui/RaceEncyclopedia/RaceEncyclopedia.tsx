import {RaceCard} from '../../../../entities/race/ui/RaceCard/RaceCard';
import {getRaceCatalogue} from '../../model/getRaceCatalogue';
import styles from './RaceEncyclopedia.module.css';

const catalogue = getRaceCatalogue();

export function RaceEncyclopedia() {
  return (
    <>
      <nav className={styles.index} aria-label="Оглавление энциклопедии рас">
        {catalogue.map(({race}) => <a key={race.id} href={`#race-${race.id}`}>{race.name}</a>)}
      </nav>

      <section className={styles.catalogue} aria-label="Каталог рас">
        {catalogue.map((entry) => <RaceCard key={entry.race.id} entry={entry} />)}
      </section>
    </>
  );
}
