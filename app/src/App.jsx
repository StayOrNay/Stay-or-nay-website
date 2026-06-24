import React, { useEffect, useState } from 'react';
import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SavedProvider } from './context/SavedContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ImmersiveProvider, useImmersive } from './context/ImmersiveContext';
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
import { MyReviewsScreen } from './screens/MyReviewsScreen';
import { VerdictAlertsScreen } from './screens/VerdictAlertsScreen';
import { WriteReviewScreen } from './screens/WriteReviewScreen';
import { ModerationScreen } from './screens/ModerationScreen';
import { RequestReviewScreen } from './screens/RequestReviewScreen';
import { AdminReviewRequestsScreen } from './screens/AdminReviewRequestsScreen';

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
  // "Immersive" mode slides the sidebar/tab bar (and, on desktop, Explore's
  // own villa-list panel — see ExploreScreen) out of the way so the map
  // fills the whole screen — only offered on the Explore ("/") screen,
  // since that's the only place a full-bleed globe view makes sense. The
  // flag itself lives in ImmersiveContext, shared with ExploreScreen.
  const { immersive, setImmersive } = useImmersive();
  const isHome = location.pathname === '/';
  const showNav = introDone && !location.pathname.startsWith('/villa/');
  const navCollapsed = immersive && isHome;

  // Drop out of immersive mode the moment you leave Explore, so the nav
  // is never silently missing on a screen where you didn't ask to hide it.
  useEffect(() => {
    if (!isHome) setImmersive(false);
  }, [isHome]);

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
      {isDesktop && showNav && (
        <div style={{ width: navCollapsed ? 0 : 232, flex: 'none', overflow: 'hidden', transition: 'width var(--dur-slow) var(--ease-out)' }}>
          <Sidebar onLogoClick={replayIntro} />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
        <Outlet />
        {!introDone && <GlobeIntro onComplete={() => setIntroDone(true)} />}

        {/* Mobile slide handle — sits right on the boundary between the map
            and the tab bar below it, so it reads as a tab you pull rather
            than a button floating in empty space. The desktop equivalent
            lives inside ExploreScreen, on the boundary of its side panel,
            since that's a second piece of chrome this same toggle has to
            collapse there. */}
        {!isDesktop && showNav && isHome && (
          <button
            onClick={() => setImmersive((v) => !v)}
            aria-label={immersive ? 'Show menu' : 'Hide menu — map only'}
            title={immersive ? 'Show menu' : 'Hide menu — map only'}
            style={{
              position: 'absolute', bottom: 0, left: '50%', zIndex: 40,
              transform: 'translate(-50%, 50%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 26, borderRadius: '999px 999px 0 0', border: 'none',
              background: 'var(--surface-card)', boxShadow: 'var(--shadow-sm)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            {immersive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      {!isDesktop && showNav && (
        <div style={{ height: navCollapsed ? 0 : 64, flex: 'none', overflow: 'hidden', transition: 'height var(--dur-slow) var(--ease-out)' }}>
          <TabBar />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <SavedProvider>
      <ImmersiveProvider>
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
            <Route path="/you/reviews" element={<MyReviewsScreen />} />
            <Route path="/you/alerts" element={<VerdictAlertsScreen />} />
            <Route path="/you/moderate" element={<ModerationScreen />} />
            <Route path="/write-review" element={<WriteReviewScreen />} />
            <Route path="/request-review" element={<RequestReviewScreen />} />
            <Route path="/you/review-requests" element={<AdminReviewRequestsScreen />} />
            <Route path="/villa/:id" element={<VillaDetailScreen />} />
          </Route>
        </Routes>
      </ImmersiveProvider>
      </SavedProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
