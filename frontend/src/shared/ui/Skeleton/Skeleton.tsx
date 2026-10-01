import styles from './Skeleton.module.css';

export type SkeletonProps = {
  shape?: 'line' | 'heading' | 'image';
  width?: 'full' | 'medium' | 'short';
  className?: string;
};

export function Skeleton({shape = 'line', width = 'full', className = ''}: SkeletonProps) {
  return <span aria-hidden="true" className={`${styles.bone} ${styles[shape]} ${styles[width]} ${className}`} />;
}
