import React from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { SavedProvider } from './context/SavedContext';
import { TabBar } from './components/shared';
import { ExploreScreen } from './screens/ExploreScreen';
import { FeedScreen } from './screens/FeedScreen';
import { SavedScreen } from './screens/SavedScreen';
import { VillaDetailScreen } from './screens/VillaDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';

/**
 * Mobile-first app shell: edge-to-edge column capped at --screen-max,
 * centered on wider viewports. Bottom tab bar shows on the four main tabs
 * and hides on the full-screen villa detail view.
 */
function AppShell() {
  const location = useLocation();
  const showTabs = !location.pathname.startsWith('/villa/');

  return (
    <div className="app-shell">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </div>
      {showTabs && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <SavedProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<ExploreScreen />} />
          <Route path="/feed" element={<FeedScreen />} />
          <Route path="/saved" element={<SavedScreen />} />
          <Route path="/you" element={<ProfileScreen />} />
          <Route path="/villa/:id" element={<VillaDetailScreen />} />
        </Route>
      </Routes>
    </SavedProvider>
  );
}
