import styles from './PortraitImage.module.css';

export type PortraitImageProps = {src: string; alt: string; className?: string; onError?: () => void};

export function PortraitImage({src, alt, className = '', onError}: PortraitImageProps) {
  return (
    <span className={`${styles.portrait} ${className}`}>
      <img className={styles.ambience} src={src} alt="" aria-hidden="true" />
      <img className={styles.image} src={src} alt={alt} onError={onError} />
    </span>
  );
}
