import {useAppNavigation} from '../features/region-navigation/model/useAppNavigation';
import {worldMap} from '../shared/config/gameData';
import {AtlasPage} from '../pages/atlas/ui/AtlasPage/AtlasPage';
import {RegionPage} from '../pages/region/ui/RegionPage/RegionPage';
import {HeroesPage} from '../pages/heroes/ui/HeroesPage/HeroesPage';
import {AppNavigation} from '../widgets/app-navigation/ui/AppNavigation/AppNavigation';

export function App() {
  const {view, regionId, openRegion, openAtlas, openHeroes} = useAppNavigation();
  const region = worldMap.regions.find((item) => item.id === regionId);

  return (
    <>
      <AppNavigation activeView={view} onAtlas={openAtlas} onHeroes={openHeroes} />
      {region ? <RegionPage region={region} onBack={openAtlas} /> : view === 'heroes' ? <HeroesPage /> : <AtlasPage onSelect={openRegion} />}
    </>
  );
}
