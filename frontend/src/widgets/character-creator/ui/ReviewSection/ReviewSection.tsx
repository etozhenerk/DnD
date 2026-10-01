import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import styles from './ReviewSection.module.css';

export type ReviewSectionProps = {title: string; step: string; children: ReactNode};

export function ReviewSection({title, step, children}: ReviewSectionProps) {
  const viewTransition = useViewTransitions();
  return (
    <section className={styles.section}>
      <header><h3>{title}</h3><Link to={'/characters/new/' + step} viewTransition={viewTransition}>Изменить</Link></header>
      {children}
    </section>
  );
}
