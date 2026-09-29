import styles from './ArtifactGlyph.module.css';

interface ArtifactGlyphProps {
  kind: 'womanizer-case' | 'alexis-fashion-certificate' | 'bungalow-pass' | 'grey-wiese-perfume' | 'olva-timeout';
  size: 'icon' | 'art';
}

export function ArtifactGlyph({kind, size}: ArtifactGlyphProps) {
  if (kind === 'olva-timeout') {
    return <span className={`${styles.glyph} ${styles.certificate} ${styles[size]}`} aria-hidden="true"><span className={styles.certificatePaper}><span className={styles.certificateMonogram}>Ⅱ</span><span className={styles.certificateLine}/><span className={styles.certificateSeal}>О</span></span></span>;
  }
  if (kind === 'grey-wiese-perfume') {
    return <span className={`${styles.glyph} ${styles[size]}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className={styles.perfume}>
        <path d="M39 16h22v14H39z M44 30h12v10H44z" fill="currentColor" />
        <path d="M30 40h40l6 12v29l-9 7H33l-9-7V52z M34 45l-4 11v22l6 4h28l6-4V56l-4-11 M36 52h28v23H36z" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="50" y="68" textAnchor="middle" fill="currentColor" fontSize="13">GW</text>
      </svg>
    </span>;
  }
  if (kind === 'bungalow-pass') {
    return (
      <span className={`${styles.glyph} ${styles[size]}`} aria-hidden="true">
        <span className={styles.passCard}>
          <span className={styles.passHole} />
          <span className={styles.passMonogram}>B</span>
          <span className={styles.passLine} />
          <span className={styles.passLine} />
        </span>
      </span>
    );
  }

  if (kind === 'alexis-fashion-certificate') {
    return (
      <span className={`${styles.glyph} ${styles.certificate} ${styles[size]}`} aria-hidden="true">
        <span className={styles.certificatePaper}>
          <span className={styles.certificateMonogram}>A</span>
          <span className={styles.certificateLine} />
          <span className={styles.certificateLine} />
          <span className={styles.certificateSeal}>AV</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`${styles.glyph} ${styles[kind]} ${styles[size]}`} aria-hidden="true">
      <span className={styles.caseLid} />
      <span className={styles.caseBody}>
        <span className={styles.crest}>PS</span>
        <span className={styles.clasp} />
      </span>
    </span>
  );
}
