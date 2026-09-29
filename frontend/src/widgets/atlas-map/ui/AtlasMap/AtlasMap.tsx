import type {Region, WorldMap} from '../../../../entities/region/model/types';
import {getCharacterById} from '../../../../entities/character/model/data';
import {RegionOrderSeal} from '../../../../entities/region/ui/RegionOrderSeal/RegionOrderSeal';
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
          const gameMaster = getCharacterById(region.gameMasterCharacterId);
          const longestLabel = Math.max(region.name.length * 12, (region.subtitle?.length ?? 0) * 8, (gameMaster?.name.length ?? 0) * 9);
          const labelWidth = Math.min(Math.max(longestLabel + 42, 164), 310);
          const labelHeight = gameMaster ? 72 : region.subtitle ? 52 : 34;
          const titleY = gameMaster ? -17 : region.subtitle ? -8 : 6;
          const polygons = [region.polygon, ...(region.additionalPolygons ?? [])];
          const imageLayers = region.imageLayers ?? [region.image];
          return (
            <g className={styles.region} data-status={region.status} key={region.id} role="button" tabIndex={0} aria-label={`Открыть регион ${region.name}`} onClick={() => onSelect(region.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(region.id); }}>
              {polygons.map((polygon, index) => <polygon key={`${region.id}-polygon-${index}`} points={toPolygonPoints(polygon)} />)}
              {imageLayers.map((image, index) => <image className={styles.regionLayer} href={resolveAsset(image)} key={`${region.id}-image-${index}`} width={map.viewBox.width} height={map.viewBox.height} />)}
              <RegionOrderSeal order={region.order} x={center.x} y={center.y} />
              <g className={styles.regionLabel} transform={`translate(${center.x} ${center.y + 52})`}>
                <rect x={-labelWidth / 2} y={-labelHeight / 2} width={labelWidth} height={labelHeight} rx="4" />
                <path d={`M ${-labelWidth / 2 + 8} 0 L ${-labelWidth / 2 - 5} 0 M ${labelWidth / 2 - 8} 0 L ${labelWidth / 2 + 5} 0`} />
                <text className={styles.regionName} y={titleY}>{region.name}</text>
                {region.subtitle ? <text className={styles.regionSubtitle} y={titleY + 20}>{region.subtitle}</text> : null}
                {gameMaster ? <text className={styles.regionMaster} y={titleY + 40}>Мастер · {gameMaster.name}</text> : null}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
