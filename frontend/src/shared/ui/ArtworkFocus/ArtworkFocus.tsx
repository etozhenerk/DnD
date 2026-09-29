import {useEffect, useState} from 'react';
import {resolveAsset} from '../../lib/assets/resolveAsset';
import type {FocusedArtwork} from '../../lib/image/focusedArtwork';
import styles from './ArtworkFocus.module.css';

export function ArtworkFocus({artwork, className}: {artwork: FocusedArtwork; className?: string}) {
  const src = resolveAsset(artwork.image);
  const [size, setSize] = useState({width: 1672, height: 941});
  useEffect(() => {
    const image = new Image();
    image.onload = () => setSize({width: image.naturalWidth, height: image.naturalHeight});
    image.src = src;
    return () => {image.onload = null;};
  }, [src]);
  return <svg aria-hidden="true" className={[styles.artwork, className].filter(Boolean).join(' ')} viewBox={artwork.viewBox} preserveAspectRatio="xMidYMid slice">
    <image href={src} width={size.width} height={size.height} />
  </svg>;
}
