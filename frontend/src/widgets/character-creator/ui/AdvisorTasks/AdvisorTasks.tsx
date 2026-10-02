import {FantasyIcon} from '../../../../shared/ui/FantasyIcon';
import {advisorTasks} from '../../config/advisor-tasks';
import styles from './AdvisorTasks.module.css';

export type AdvisorTasksProps = {
  disabled: boolean;
  onChoose: (prompt: string) => void;
};

export function AdvisorTasks({disabled, onChoose}: AdvisorTasksProps) {
  return (
    <section className={styles.tasks} aria-label="Что поручить советнику">
      <h3>Помогу там, где застрял</h3>
      <div className={styles.choices}>
        {advisorTasks.map((task) => (
          <button key={task.id} type="button" disabled={disabled} aria-haspopup="dialog" title={task.detail}
            onClick={() => onChoose(task.prompt)}>
            <span className={styles.icon}><FantasyIcon name={task.icon} /></span>
            <strong>{task.title}</strong>
          </button>
        ))}
      </div>
      <small>Идеи по нашему лору. Решение — за тобой.</small>
    </section>
  );
}
