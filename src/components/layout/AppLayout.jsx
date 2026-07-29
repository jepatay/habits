import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { ViewedUserProvider } from '../../contexts/ViewedUserContext';
import UnlockedBanner from '../rewards/UnlockedBanner';
import { useForegroundPushListener } from '../../push/useForegroundPushListener';

export default function AppLayout() {
  useForegroundPushListener();
  return (
    <ViewedUserProvider>
      <div className="app-shell">
        <TopBar />
        <main className="page">
          <UnlockedBanner />
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </ViewedUserProvider>
  );
}
