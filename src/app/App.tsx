import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import {AppLayout} from './ui/AppLayout/AppLayout';
import {AtlasPage} from '../pages/atlas/ui/AtlasPage/AtlasPage';
import {HeroesPage} from '../pages/heroes/ui/HeroesPage/HeroesPage';
import {NotFoundPage} from '../pages/not-found/ui/NotFoundPage/NotFoundPage';
import {RegionPage} from '../pages/region/ui/RegionPage/RegionPage';
import {RoadmapPage} from '../pages/roadmap/ui/RoadmapPage/RoadmapPage';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {index: true, element: <AtlasPage />},
      {path: 'heroes', element: <HeroesPage />},
      {path: 'region/:regionId', element: <RegionPage />},
      {path: 'roadmap', element: <RoadmapPage />},
      {path: '*', element: <NotFoundPage />},
    ],
  },
], {basename: import.meta.env.BASE_URL});

export function App() {
  return <RouterProvider router={router} />;
}
