/**
 * Google Analytics 4 — traffic, geography, live visitors, and conversions.
 *
 * The StayOrNay measurement ID is hardcoded as the default because it isn't a
 * secret (it ships in the page source of every GA-tracked site on the web) and
 * hardcoding it means tracking can't silently break by way of a missing
 * environment variable on a rebuild. VITE_GA_MEASUREMENT_ID still overrides it
 * if you ever need a separate property for a staging deploy.
 *
 * Tracking only runs in production builds. `npm run dev` never sends anything,
 * so your own development sessions stay out of the real numbers without you
 * having to remember to configure anything.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-H81389NBB4';

export const isAnalyticsEnabled = Boolean(MEASUREMENT_ID) && import.meta.env.PROD;

let initialised = false;

function gtag() {
  // gtag pushes its raw `arguments` object onto the queue — not an array copy.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

/**
 * Injects the gtag.js script once, on first call. Safe to call repeatedly.
 *
 * send_page_view is switched off because this is a single-page app: gtag's
 * automatic pageview only fires on the initial document load, so router
 * navigations would go uncounted. trackPageview() below sends them instead.
 */
export function initAnalytics() {
  if (!isAnalyticsEnabled || initialised || typeof window === 'undefined') return;
  initialised = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

/** Records a screen view. Called on every react-router location change. */
export function trackPageview(path, title) {
  if (!isAnalyticsEnabled || !initialised) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}

/**
 * Records a custom event. Keep names snake_case and reuse GA4's recommended
 * names (sign_up, login, search, share) where one fits — those get first-class
 * treatment in the reports instead of landing in the generic events table.
 */
export function trackEvent(name, params = {}) {
  if (!isAnalyticsEnabled || !initialised) return;
  gtag('event', name, params);
}
