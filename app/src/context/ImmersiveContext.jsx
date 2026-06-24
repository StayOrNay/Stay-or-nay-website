import React, { createContext, useContext, useState } from 'react';

const ImmersiveContext = createContext(null);

/**
 * Shared "map-only" toggle. Lives above both AppShell (which owns the
 * global Sidebar/TabBar) and ExploreScreen (which owns its own desktop
 * villa-list panel) so a single flag can collapse all of the chrome that
 * sits between the user and the globe, from whichever component renders
 * the slide handle that flips it.
 */
export function ImmersiveProvider({ children }) {
  const [immersive, setImmersive] = useState(false);
  return <ImmersiveContext.Provider value={{ immersive, setImmersive }}>{children}</ImmersiveContext.Provider>;
}

export function useImmersive() {
  const ctx = useContext(ImmersiveContext);
  if (!ctx) throw new Error('useImmersive must be used within an ImmersiveProvider');
  return ctx;
}
