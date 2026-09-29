import styles from './SceneReturnButton.module.css';

interface SceneReturnButtonProps {
  children: string;
  onClick: () => void;
}

export function SceneReturnButton({children, onClick}: SceneReturnButtonProps) {
  return <button className={styles.button} type="button" onClick={onClick}>
    <span aria-hidden="true">← </span>{children}
  </button>;
}
