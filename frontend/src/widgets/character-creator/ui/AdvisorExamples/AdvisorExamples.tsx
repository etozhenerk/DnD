import {advisorExamples} from '../../config/advisor-examples';
import styles from './AdvisorExamples.module.css';

export type AdvisorExamplesProps = {
  disabled: boolean;
  onSelect: (prompt: string) => void;
  title?: string;
};

export function AdvisorExamples({disabled, onSelect, title = 'Не знаешь, с чего начать?'}: AdvisorExamplesProps) {
  return (
    <div className={styles.examples}>
      <p>{title}</p>
      <div className={styles.actions}>
        {advisorExamples.map((example) => (
          <button key={example.id} type="button" disabled={disabled} onClick={() => onSelect(example.prompt)}>
            {example.label}
          </button>
        ))}
      </div>
      <small>Реплику можно изменить перед отправкой.</small>
    </div>
  );
}
