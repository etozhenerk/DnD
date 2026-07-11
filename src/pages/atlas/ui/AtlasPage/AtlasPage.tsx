import {worldMap} from '../../../../shared/config/gameData';
import {AtlasMap} from '../../../../widgets/atlas-map/ui/AtlasMap/AtlasMap';
import styles from './AtlasPage.module.css';

export function AtlasPage({onSelect}: {onSelect: (id: string) => void}) {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <p>Свод земель и преданий</p>
        <h1>Карта Восьми Земель</h1>
        <span>Выберите владение и откройте его летопись</span>
      </header>
      <section className={styles.layout}>
        <AtlasMap map={worldMap} onSelect={onSelect} />
      </section>
      <p className={styles.hint}>Печать на карте открывает летопись земли</p>
    </main>
  );
}
