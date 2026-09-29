import {useNavigate} from 'react-router-dom';
import styles from './GameMasterConsole.module.css';

export function CombatSandboxLauncher() {
  const navigate = useNavigate();

  return (
    <section className={styles.section} aria-labelledby="gm-combat-sandbox-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p>Без влияния на кампанию</p>
          <h3 id="gm-combat-sandbox-heading">Боевая песочница</h3>
        </div>
        <span>Тестовый контур</span>
      </div>
      <p className={styles.note}>
        Откроется отдельное сохранение с готовой засадой трёх заводных носильщиков.
      </p>
      <div className={styles.actionRow}>
        <button type="button" onClick={() => navigate('/campaign/penisuela/combat-sandbox')}>
          Открыть песочницу
        </button>
      </div>
    </section>
  );
}
