import type {CSSProperties} from 'react';
import {characters} from '../../../../entities/character/model/data';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {HeroLegends} from '../../../../widgets/hero-legends/ui/HeroLegends/HeroLegends';
import styles from './HeroesPage.module.css';

export function HeroesPage() {
  const backgroundStyle = {
    '--heroes-background': `url("${resolveAsset('assets/concepts/style/atlas-background.webp')}")`,
  } as CSSProperties;

  return (
    <main className={styles.page} style={backgroundStyle}>
      <div className={styles.atmosphere} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <HeroLegends heroes={characters} />
    </main>
  );
}
