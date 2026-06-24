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
export function ImmersiveProvider({ children }) {
  const [immersive, setImmersive] = useState(false);
  const [introDone, setIntroDone] = useState(false);
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
