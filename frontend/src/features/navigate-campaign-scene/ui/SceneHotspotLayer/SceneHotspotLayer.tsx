import type {CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {useSceneHotspotFrame} from '../../model/useSceneHotspotFrame';
import styles from './SceneHotspotLayer.module.css';

export interface SceneHotspotPosition {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface SceneHotspot {
  href?: string;
  id: string;
  label: string;
  onSelect?: () => void;
  presentation?: 'area' | 'object' | 'soft-object';
  position?: SceneHotspotPosition;
}

interface SceneHotspotLayerProps {
  ariaLabel?: string;
  hotspots: SceneHotspot[];
  /** Positions are percentages of the source image when background is supplied. */
  background?: {src: string; fit?: 'cover' | 'contain'};
}

const layouts: Record<number, SceneHotspotPosition[]> = {
  1: [
    {x: 63, y: 22, width: 29, height: 45},
  ],
  2: [
    {x: 10, y: 23, width: 31, height: 45},
    {x: 60, y: 23, width: 31, height: 45},
  ],
  3: [
    {x: 5, y: 24, width: 27, height: 43},
    {x: 36.5, y: 19, width: 27, height: 48},
    {x: 68, y: 24, width: 27, height: 43},
  ],
  4: [
    {x: 7, y: 15, width: 29, height: 29},
    {x: 64, y: 15, width: 29, height: 29},
    {x: 7, y: 48, width: 29, height: 29},
    {x: 64, y: 48, width: 29, height: 29},
  ],
};

function getFallbackPosition(index: number, count: number): SceneHotspotPosition {
  const columns = Math.min(3, count);
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const width = 25;
  const height = rows === 1 ? 42 : 27;
  const horizontalGap = columns === 1 ? 0 : (90 - width * columns) / (columns - 1);
  const verticalGap = rows === 1 ? 0 : (63 - height * rows) / (rows - 1);

  return {
    x: columns === 1 ? 62 : 5 + column * (width + horizontalGap),
    y: 14 + row * (height + verticalGap),
    width,
    height,
  };
}

function getHotspotStyle(position: SceneHotspotPosition, frame: {x: number; y: number; width: number; height: number} | null): CSSProperties {
  return {
    '--scene-hotspot-height': frame ? `${position.height * frame.height / 100}px` : `${position.height}%`,
    '--scene-hotspot-left': frame ? `${frame.x + position.x * frame.width / 100}px` : `${position.x}%`,
    '--scene-hotspot-top': frame ? `${frame.y + position.y * frame.height / 100}px` : `${position.y}%`,
    '--scene-hotspot-width': frame ? `${position.width * frame.width / 100}px` : `${position.width}%`,
  } as CSSProperties;
}

export function SceneHotspotLayer({
  ariaLabel = 'Доступные переходы сцены',
  hotspots,
  background,
}: SceneHotspotLayerProps) {
  const {ref, frame} = useSceneHotspotFrame(background?.src, background?.fit);

  const preset = layouts[hotspots.length];

  return (
    <nav ref={ref} className={styles.layer} aria-label={ariaLabel} hidden={!hotspots.length}>
      {hotspots.map((hotspot, index) => {
        const position = hotspot.position ?? preset?.[index] ?? getFallbackPosition(index, hotspots.length);

        const content = (
          <span className={styles.label}>{hotspot.label}</span>
        );

        return hotspot.href ? (
          <Link
            aria-label={hotspot.label}
            className={styles.hotspot}
            data-hotspot-id={hotspot.id}
            data-hotspot-presentation={hotspot.presentation ?? 'area'}
            key={hotspot.id}
            style={getHotspotStyle(position, frame)}
            to={hotspot.href}
            onClick={hotspot.onSelect}
          >
            {content}
          </Link>
        ) : (
          <button
            aria-label={hotspot.label}
            className={styles.hotspot}
            data-hotspot-id={hotspot.id}
            data-hotspot-presentation={hotspot.presentation ?? 'area'}
            key={hotspot.id}
            style={getHotspotStyle(position, frame)}
            type="button"
            onClick={hotspot.onSelect}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
