import {FantasyFrame} from '../../../../shared/ui/FantasyFrame';
import {advisorOwl} from '../../config/creator-art';
import styles from './CreatorAdvisorPreview.module.css';

export function CreatorAdvisorPreview() {
  return (
    <aside className={styles.advisor} aria-label="Советник">
      <FantasyFrame />
      <h2>Советник</h2>
      <img className={styles.art} src={advisorOwl} alt="" />
      <p>Поможет с образом, объяснит выбор и предложит навыки, подходящие вашему герою.</p>
      <div className={styles.status}>Появится позже</div>
      <small>Решения всегда остаются за вами.</small>
    </aside>
  );
}
