import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  tone?: 'dark' | 'light';
}

export function PageHeader({eyebrow, title, subtitle, onBack, tone = 'dark'}: PageHeaderProps) {
  return (
    <header className={`${styles.header} ${tone === 'light' ? styles.light : ''}`}>
      {onBack ? <button className={styles.back} type="button" onClick={onBack}>← К атласу</button> : <span />}
      <div className={styles.title}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      <div className={styles.rune} aria-hidden="true">✦</div>
    </header>
  );
}
