import {ActionButton} from '../ActionButton';
import styles from './RequestState.module.css';

export type RequestStateProps = {
  title: string;
  message?: string;
  isError?: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
};

export function RequestState({title, message, isError, isLoading, onRetry}: RequestStateProps) {
  return (
    <div className={styles.state} role={isError ? 'alert' : 'status'} aria-busy={isLoading}>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {onRetry && <ActionButton tone="secondary" onClick={onRetry}>Попробовать снова</ActionButton>}
    </div>
  );
}
