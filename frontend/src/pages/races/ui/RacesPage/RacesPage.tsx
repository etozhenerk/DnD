import type {CSSProperties} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {RaceEncyclopedia} from '../../../../widgets/race-encyclopedia/ui/RaceEncyclopedia/RaceEncyclopedia';
import styles from './RacesPage.module.css';

export function RacesPage() {
  const pageStyle = {
    '--races-background': `url("${resolveAsset('assets/concepts/style/races-archive-background.avif')}")`,
  } as CSSProperties;

  return (
    <main className={styles.page} style={pageStyle}>
      <header className={styles.hero}>
        <div className={styles.ornament} aria-hidden="true">✦</div>
        <span>Энциклопедия мира</span>
        <h1>Народы Восьми Земель</h1>
        <p>Народы, существа и древние виды, уже встреченные героями в летописях Восьми Земель.</p>
      </header>
      <RaceEncyclopedia />
    </main>
  );
}
