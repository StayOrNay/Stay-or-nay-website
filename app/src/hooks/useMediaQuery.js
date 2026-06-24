import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query in JS, for the cases where a breakpoint needs to
 * change actual layout structure (sidebar vs bottom tab bar, list-grid vs
 * full-bleed feed) rather than just cosmetic CSS — something inline styles
 * can't express on their own. Re-evaluates on every resize/orientation
 * change via the MediaQueryList's own change event.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange); // Safari < 14 fallback
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

// Single source of truth for the "wide enough to act like a real website,
// not a phone in a card" breakpoint — used by the app shell, nav, and any
// screen that restructures (not just restyles) at this width.
export const DESKTOP_QUERY = '(min-width: 960px)';

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY);
}
