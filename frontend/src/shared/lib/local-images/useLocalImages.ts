import {useEffect, useRef, useState} from 'react';
import type {LocalImage} from './types';
import {loadImages} from './load-images';

export function useLocalImages(maximum = 8) {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState('');
  const current = useRef<LocalImage[]>([]);
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      current.current.forEach((image) => URL.revokeObjectURL(image.url));
      current.current = [];
    };
  }, []);

  async function addFiles(files: FileList | null): Promise<LocalImage[]> {
    if (!files || busy.current) return [];
    busy.current = true;
    try {
      const result = await loadImages(Array.from(files));
      const accepted = result.images.slice(0, Math.max(0, maximum - current.current.length));
      if (!alive.current) {
        result.images.forEach((image) => URL.revokeObjectURL(image.url));
        return [];
      }
      result.images.slice(accepted.length).forEach((image) => URL.revokeObjectURL(image.url));
      if (accepted.length < result.images.length) result.problems.push('Можно добавить до ' + maximum + ' изображений.');
      current.current = [...current.current, ...accepted];
      setImages(current.current);
      setError(result.problems.join(' '));
      return accepted;
    } finally { busy.current = false; }
  }

  function remove(id: string) {
    const image = current.current.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.url);
    current.current = current.current.filter((item) => item.id !== id);
    setImages(current.current);
    setError('');
  }
  return {images, error, addFiles, remove};
}
