import {useDiceRoll} from '../../model/useDiceRoll';
import styles from './DiceRoller.module.css';

const dice = [4, 6, 8, 10, 12, 20];

export function DiceRoller() {
  const {result, roll} = useDiceRoll();

  return (
    <section className={styles.tray} aria-label="Бросок костей">
      <div><small>Кости судьбы</small><strong>{result ? result.value : '—'}</strong><span>{result ? `бросок d${result.sides}` : 'выберите кость'}</span></div>
      <nav>{dice.map((sides) => <button key={sides} type="button" onClick={() => roll(sides)}>d{sides}</button>)}</nav>
    </section>
  );
}
