import type {CSSProperties} from 'react';
import {useNavigate} from 'react-router-dom';
import {worldMap} from '../../../../entities/region/model/data';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {AtlasMap} from '../../../../widgets/atlas-map/ui/AtlasMap/AtlasMap';
import styles from './AtlasPage.module.css';

export function AtlasPage() {
  const navigate = useNavigate();
  const backgroundStyle = {
    '--atlas-background': `url("${resolveAsset('assets/concepts/style/atlas-background.webp')}")`,
  } as CSSProperties;

  return (
    <main className={styles.page} style={backgroundStyle}>
      <div className={styles.atmosphere} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className={styles.intro}>
        <div className={styles.eyebrow}>Интерактивная карта</div>
        <h1>Выберите регион</h1>
        <p>Нажмите на метку, чтобы открыть кампанию</p>
      </header>
      <section className={styles.layout} aria-label="Интерактивная карта мира">
        <AtlasMap map={worldMap} onSelect={(regionId) => navigate(`/region/${regionId}`)} />
      </section>
    </main>
  );
}
