import React, { createContext, useContext, useState } from 'react';

const ImmersiveContext = createContext(null);

/**
 * Shared "map-only" toggle, plus whether the globe-landing intro has
 * finished. Lives above both AppShell (which owns the global
 * Sidebar/TabBar and the intro itself) and ExploreScreen (which owns its
 * own desktop villa-list panel and renders the desktop slide handle) so:
 *   - a single `immersive` flag can collapse all of the chrome between the
 *     user and the globe, from whichever component renders the handle;
 *   - ExploreScreen can also see `introDone`, so its own handle doesn't
 *     render (and float above the spinning-globe intro, which paints over
 *     it by DOM order but loses to the handle's explicit z-index) before
 *     the intro has handed off to the real map.
 */
// The cinematic landing plays in full on a visitor's FIRST load only —
// after it completes once (LandingExperience writes this flag), later
// visits go straight to the map. Replays are always available (dock pin /
// globe button / wordmark all call setIntroDone(false)). Lazy initializer
// + try/catch so Safari private mode (throwing localStorage) just means
// "always show the landing", never a crash.
const LANDING_SEEN_KEY = 'son_landing_seen';

function landingAlreadySeen() {
  try {
    return window.localStorage.getItem(LANDING_SEEN_KEY) === '1';
  } catch (err) {
    return false;
  }
}

export function markLandingSeen() {
  try {
    window.localStorage.setItem(LANDING_SEEN_KEY, '1');
  } catch (err) {
    // Private mode — the landing will simply play again next visit.
  }
}

export function ImmersiveProvider({ children }) {
  const [immersive, setImmersive] = useState(false);
  const [introDone, setIntroDone] = useState(landingAlreadySeen);
  return (
    <ImmersiveContext.Provider value={{ immersive, setImmersive, introDone, setIntroDone }}>
      {children}
    </ImmersiveContext.Provider>
  );
}

export function useImmersive() {
  const ctx = useContext(ImmersiveContext);
  if (!ctx) throw new Error('useImmersive must be used within an ImmersiveProvider');
  return ctx;
}
