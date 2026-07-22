import styles from './ArtifactGlyph.module.css';

interface ArtifactGlyphProps {
  kind: 'womanizer-case';
  size: 'icon' | 'art';
}

export function ArtifactGlyph({kind, size}: ArtifactGlyphProps) {
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
