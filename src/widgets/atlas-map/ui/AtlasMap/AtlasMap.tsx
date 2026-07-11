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
      <div className={styles.corner} aria-hidden="true">✦</div>
      <svg className={styles.map} viewBox={`0 0 ${map.viewBox.width} ${map.viewBox.height}`} role="img" aria-label="Карта Восьми Земель">
        <image href={resolveAsset(map.image)} width={map.viewBox.width} height={map.viewBox.height} />
        {map.regions.map((region: Region) => {
          const center = getPolygonCenter(region.polygon);
          return (
            <g className={styles.region} key={region.id} role="button" tabIndex={0} aria-label={`Открыть регион ${region.name}`} onClick={() => onSelect(region.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(region.id); }}>
              <polygon points={toPolygonPoints(region.polygon)} />
              <circle cx={center.x} cy={center.y} r="24" />
              <text x={center.x} y={center.y + 8}>{region.order}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
