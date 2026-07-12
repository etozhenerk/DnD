import type {Region, WorldMap} from '../../../../entities/region/model/types';
import {getPolygonCenter} from '../../../../shared/lib/map/getPolygonCenter';
import {toPolygonPoints} from '../../../../shared/lib/map/toPolygonPoints';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './AtlasMap.module.css';

interface AtlasMapProps {
  map: WorldMap;
  onSelect: (id: string) => void;
}

export function AtlasMap({map, onSelect}: AtlasMapProps) {
  return (
    <div className={styles.frame}>
      <span className={`${styles.corner} ${styles.cornerTopLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTopRight}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBottomLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBottomRight}`} aria-hidden="true" />
      <svg className={styles.map} viewBox={`0 0 ${map.viewBox.width} ${map.viewBox.height}`} role="img" aria-label="Карта Восьми Земель">
        <image href={resolveAsset(map.image)} width={map.viewBox.width} height={map.viewBox.height} />
        {map.regions.map((region: Region) => {
          const center = getPolygonCenter(region.polygon);
          const labelWidth = Math.min(Math.max(region.name.length * 12 + 36, 164), 284);
          return (
            <g className={styles.region} data-status={region.status} key={region.id} role="button" tabIndex={0} aria-label={`Открыть регион ${region.name}`} onClick={() => onSelect(region.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(region.id); }}>
              <polygon points={toPolygonPoints(region.polygon)} />
              <image className={styles.regionLayer} href={resolveAsset(region.image)} width={map.viewBox.width} height={map.viewBox.height} />
              <circle className={styles.sealGlow} cx={center.x} cy={center.y} r="31" />
              <circle className={styles.seal} cx={center.x} cy={center.y} r="23" />
              <circle className={styles.sealInner} cx={center.x} cy={center.y} r="17" />
              <text x={center.x} y={center.y + 7}>{region.order}</text>
              <g className={styles.regionLabel} transform={`translate(${center.x} ${center.y + 52})`}>
                <rect x={-labelWidth / 2} y="-17" width={labelWidth} height="34" rx="4" />
                <path d={`M ${-labelWidth / 2 + 8} 0 L ${-labelWidth / 2 - 5} 0 M ${labelWidth / 2 - 8} 0 L ${labelWidth / 2 + 5} 0`} />
                <text y="6">{region.name}</text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
