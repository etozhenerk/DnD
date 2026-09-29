import styles from './RegionOrderSeal.module.css';

interface RegionOrderSealProps {
  className?: string;
  order: number;
  x: number;
  y: number;
}

export function RegionOrderSeal({className = '', order, x, y}: RegionOrderSealProps) {
  return (
    <g className={`${styles.group} ${className}`} data-region-order-seal="true">
      <circle className={styles.glow} data-seal-part="glow" cx={x} cy={y} r="31" />
      <circle className={styles.seal} data-seal-part="seal" cx={x} cy={y} r="23" />
      <circle className={styles.inner} data-seal-part="inner" cx={x} cy={y} r="17" />
      <text className={styles.label} data-seal-part="label" x={x} y={y + 7}>{order}</text>
    </g>
  );
}
