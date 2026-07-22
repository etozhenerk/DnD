import {Link} from 'react-router-dom';
import styles from './SceneAdvanceControl.module.css';

interface SceneAdvanceControlProps {
  introRead: boolean;
  exitAvailable: boolean;
  exitLabel: string;
  exitHref: string;
  introActionLabel?: string;
  onCompleteIntro: () => void;
}

export function SceneAdvanceControl({
  introRead,
  exitAvailable,
  exitLabel,
  exitHref,
  introActionLabel = 'Искать ответы',
  onCompleteIntro,
}: SceneAdvanceControlProps) {
  if (!introRead) {
    return (
      <button className={styles.control} type="button" onClick={onCompleteIntro}>
        {introActionLabel}
      </button>
    );
  }

  if (exitAvailable) {
    return <Link className={styles.control} to={exitHref}>{exitLabel}</Link>;
  }

  return null;
}
