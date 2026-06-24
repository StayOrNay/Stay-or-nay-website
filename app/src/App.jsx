import React, { useState } from 'react';
import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SavedProvider } from './context/SavedContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { TabBar, Sidebar } from './components/shared';
import { GlobeIntro } from './intro/GlobeIntro';
import { useIsDesktop } from './hooks/useMediaQuery';
import { ExploreScreen } from './screens/ExploreScreen';
import { FeedScreen } from './screens/FeedScreen';
import { SavedScreen } from './screens/SavedScreen';
import { VillaDetailScreen } from './screens/VillaDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AccountScreen } from './screens/AccountScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { LegalScreen } from './screens/legal/LegalScreen';
import { PrivacyPolicyScreen } from './screens/legal/PrivacyPolicyScreen';
import { TermsScreen } from './screens/legal/TermsScreen';
import { CookiePolicyScreen } from './screens/legal/CookiePolicyScreen';

/**
 * Mobile-first app shell that becomes a real wide site at the desktop
 * breakpoint (see useIsDesktop / .app-shell in base.css): below it, an
 * edge-to-edge column capped at --screen-max with a bottom tab bar; at or
 * above it, the phone-card framing drops away and a left sidebar nav
 * replaces the bottom bar, since a fixed bottom bar on a 1400px-wide
 * screen reads as an unconverted mobile habit rather than a website.
 *
 * Every fresh load plays the spinning-globe-lands-on-Bali intro first
 * (skippable). The routed screen underneath (Outlet) is mounted from the
 * very start, not after the intro finishes — so the real Explore map is
 * already loaded and sitting at the exact camera the intro lands on by
 * the time the intro's own fade-out reveals it. That overlap is what
 * makes the hand-off a single continuous shot instead of a cut to a
 * second, freshly-mounting map.
 */
function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [introDone, setIntroDone] = useState(false);
  const showNav = introDone && !location.pathname.startsWith('/villa/');

  // Clicking the wordmark takes you back to "the start" — the Bali
  // globe-landing intro, not just the Explore screen underneath it. Routing
  // to '/' first (in case you're deep on /villa/:id or another tab) and then
  // dropping introDone back to false unmounts/remounts GlobeIntro fresh,
  // since it's only ever in the tree while `!introDone` — same mechanism
  // that plays it once on first load, just re-triggered on demand.
  const replayIntro = () => {
    navigate('/');
    setIntroDone(false);
  };

  return (
    <div className="app-shell" style={{ flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop && showNav && <Sidebar onLogoClick={replayIntro} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
        <Outlet />
        {!introDone && <GlobeIntro onComplete={() => setIntroDone(true)} />}
      </div>
      {!isDesktop && showNav && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <SavedProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<ExploreScreen />} />
            <Route path="/feed" element={<FeedScreen />} />
            <Route path="/saved" element={<SavedScreen />} />
            <Route path="/you" element={<ProfileScreen />} />
            <Route path="/you/settings" element={<SettingsScreen />} />
            <Route path="/you/account" element={<AccountScreen />} />
            <Route path="/you/language" element={<LanguageScreen />} />
            <Route path="/you/legal" element={<LegalScreen />} />
            <Route path="/you/legal/privacy" element={<PrivacyPolicyScreen />} />
            <Route path="/you/legal/terms" element={<TermsScreen />} />
            <Route path="/you/legal/cookies" element={<CookiePolicyScreen />} />
            <Route path="/villa/:id" element={<VillaDetailScreen />} />
          </Route>
        </Routes>
      </SavedProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
