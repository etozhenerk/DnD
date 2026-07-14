import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import {AppLayout} from './ui/AppLayout/AppLayout';
import {RouteFallback} from './ui/RouteFallback/RouteFallback';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    HydrateFallback: RouteFallback,
    children: [
      {
        index: true,
        lazy: async () => ({Component: (await import('../pages/atlas/ui/AtlasPage/AtlasPage')).AtlasPage}),
      },
      {
        path: 'heroes',
        lazy: async () => ({Component: (await import('../pages/heroes/ui/HeroesPage/HeroesPage')).HeroesPage}),
      },
      {
        path: 'races',
        lazy: async () => ({Component: (await import('../pages/races/ui/RacesPage/RacesPage')).RacesPage}),
      },
      {
        path: 'region/:regionId',
        lazy: async () => ({Component: (await import('../pages/region/ui/RegionPage/RegionPage')).RegionPage}),
      },
      {
        path: 'roadmap',
        lazy: async () => ({Component: (await import('../pages/roadmap/ui/RoadmapPage/RoadmapPage')).RoadmapPage}),
      },
      {
        path: '*',
        lazy: async () => ({Component: (await import('../pages/not-found/ui/NotFoundPage/NotFoundPage')).NotFoundPage}),
      },
    ],
  },
], {basename: import.meta.env.BASE_URL});

export function App() {
  return <RouterProvider router={router} />;
}
