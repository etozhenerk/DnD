import {Outlet} from 'react-router-dom';
import {AppNavigation} from '../../../widgets/app-navigation';

export function AppLayout() {
  return (
    <>
      <AppNavigation />
      <Outlet />
    </>
  );
}
