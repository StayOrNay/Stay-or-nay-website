import { useEffect, useState } from 'react';
import { fetchAllApprovedReviews } from '../lib/reviews';
import { MAX_TOTAL } from '../lib/reviewScore';
import aerial from '../assets/map-terrain.svg';

/**
 * The single source of browsable content for the whole app: every APPROVED
 * user review becomes a "listing" object here, and Explore (map + side list),
 * Feed, and the detail page (/villa/:id, keyed by review id) all read from
 * this. Before this, approved reviews had no public surface — they only
 * showed in the author's own "My reviews" — so the map/feed were always
 * empty. Now, the moment a review clears moderation it appears everywhere.
 *
 * A review is reshaped into the same fields the existing VillaCard /
 * SatelliteMap / VillaDetail components already expect, so nothing
 * downstream had to change much.
 */
function firstPhotoUrl(mediaUrls) {
  if (!Array.isArray(mediaUrls)) return null;
  const photo = mediaUrls.find((m) => m && m.type === 'photo' && m.url);
  if (photo) return photo.url;
  const any = mediaUrls.find((m) => m && m.url);
  return any ? any.url : null;
}

function reviewToListing(r) {
  const total = Number(r.total) || 0;
  const hasCoords = typeof r.lon === 'number' && typeof r.lat === 'number';

  const tags = [];
  if (r.beds) tags.push(`${r.beds} bed${r.beds === 1 ? '' : 's'}`);
  // Pool isn't a structured field, so infer it from the write-up — enough to
  // make the "Pool" filter on Explore meaningful.
  if (/\bpool\b/i.test(`${r.headline || ''} ${r.body || ''}`)) tags.push('Pool');

  return {
    id: r.id,
    name: r.property_name || 'A stay',
    location: r.area || '',
    coords: r.area || '',
    lon: hasCoords ? r.lon : undefined,
    lat: hasCoords ? r.lat : undefined,
    image: firstPhotoUrl(r.media_urls) || aerial,
    verdict: r.verdict,
    // The site's real scale is /50 — show that raw total everywhere (badges,
    // map pins) so nothing contradicts the "42 / 50" the reviews use. (Was
    // previously doubled to a 0-100 scale, which made a 42 read as "84".)
    score: total, // raw 0-50
    scoreOutOf: MAX_TOTAL, // 50
    total, // raw 0-50 (used by the Explore filter's "min score")
    rating: Math.round((total / MAX_TOTAL) * 5 * 10) / 10, // 0-5 stars, one-decimal, accurate to the /50 total
    price: r.price_paid ?? null,
    currency: r.currency || '$',
    beds: r.beds ?? null,
    tags,
    reviewer: 'Verified stayer',
    verified: true,
    headline: r.headline || '',
    body: r.body || '',
    categories: {
      location: r.score_location,
      value: r.score_value,
      cleanliness: r.score_cleanliness,
      amenities: r.score_amenities,
      host: r.score_host,
    },
    mediaUrls: Array.isArray(r.media_urls) ? r.media_urls : [],
    propertyLink: r.property_link || '',
    createdAt: r.created_at,
    reviewCount: 1,
  };
}

export function useVillasWithReviews() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchAllApprovedReviews().then(({ data, error }) => {
      if (cancelled || error || !data) return;
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setListings(sorted.map(reviewToListing));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return listings;
}

export function useVillaWithReviews(villaId) {
  const villas = useVillasWithReviews();
  return villas.find((v) => v.id === villaId);
}
