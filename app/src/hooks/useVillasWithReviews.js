import { useEffect, useState } from 'react';
import { villas as staticVillas } from '../data/villas';
import { fetchAllApprovedReviews } from '../lib/reviews';
import { totalToDisplayScore, verdictFromTotal } from '../lib/reviewScore';

/**
 * The villa list everywhere in the app (map pins, feed, saved, explore side
 * list, detail page) — starts from the static sample data in data/villas.js
 * and, once approved real reviews come in for a villa, overrides that
 * villa's score/verdict with the average of its approved reviews instead.
 * A villa with no approved reviews yet just keeps showing its original
 * sample score, so the site never looks broken while waiting for its first
 * real review to clear moderation.
 */
export function useVillasWithReviews() {
  const [villasState, setVillasState] = useState(staticVillas);

  useEffect(() => {
    let cancelled = false;
    fetchAllApprovedReviews().then(({ data, error }) => {
      if (cancelled || error || !data || data.length === 0) return;
      const byVilla = {};
      data.forEach((r) => {
        (byVilla[r.villa_id] = byVilla[r.villa_id] || []).push(r);
      });
      setVillasState(
        staticVillas.map((v) => {
          const reviews = byVilla[v.id];
          if (!reviews || reviews.length === 0) return v;
          const avgTotal = reviews.reduce((sum, r) => sum + r.total, 0) / reviews.length;
          return {
            ...v,
            score: totalToDisplayScore(avgTotal),
            verdict: verdictFromTotal(avgTotal),
            reviewCount: reviews.length,
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return villasState;
}

export function useVillaWithReviews(villaId) {
  const villas = useVillasWithReviews();
  return villas.find((v) => v.id === villaId);
}
