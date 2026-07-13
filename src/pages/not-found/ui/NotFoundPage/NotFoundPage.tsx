import {Link} from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <span>404</span>
      <h1>Этой земли пока нет на карте</h1>
      <p>Маршрут потерялся между хрониками. Вернитесь к Атласу и выберите знакомый регион.</p>
      <Link to="/">Вернуться к карте</Link>
    </main>
  );
}
