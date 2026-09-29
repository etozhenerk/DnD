import {Outlet} from 'react-router-dom';
import {AppNavigation} from '../../../widgets/app-navigation/ui/AppNavigation/AppNavigation';

export function AppLayout() {
  return (
    <>
      <AppNavigation />
      <Outlet />
    </>
  );
}
