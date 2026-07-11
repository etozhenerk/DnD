import {useEffect, useState} from 'react';
import {createAtlasHash, createHeroesHash, createRegionHash, getRegionIdFromHash, getViewFromHash} from '../../../shared/lib/navigation/regionHash';

export function useAppNavigation() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return {
    view: getViewFromHash(hash),
    regionId: getRegionIdFromHash(hash),
    openRegion: (id: string) => { window.location.hash = createRegionHash(id); },
    openAtlas: () => { window.location.hash = createAtlasHash(); },
    openHeroes: () => { window.location.hash = createHeroesHash(); },
  };
}
