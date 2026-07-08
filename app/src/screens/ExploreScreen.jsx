import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import { Input, VerdictBadge, RatingStars, Tag, VillaCard } from '../components/core';
import { SatelliteMap } from '../components/shared';
import { useVillasWithReviews } from '../hooks/useVillasWithReviews';
import { useSaved } from '../context/SavedContext';
import { useImmersive } from '../context/ImmersiveContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { reverseGeocode } from '../lib/mapbox';

/**
 * Explore — a real interactive satellite map (EOX Sentinel-2 cloudless
 * imagery) centered on Bali, with Google-Earth-style POI pins. On mobile,
 * tapping a pin opens a bottom-sheet preview. On desktop there's enough
 * width to show a real results list alongside the map permanently — a
 * floating bottom sheet over a 1400px-wide map would look like an unscaled
 * mobile leftover, where a side list is the pattern desktop map apps use.
 */
export function ExploreScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { immersive, setImmersive, introDone } = useImmersive();
  const villas = useVillasWithReviews();
  const [selected, setSelected] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Bali, Indonesia');
  const [mapBounds, setMapBounds] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const mapRef = useRef(null);
  const geocodeTimerRef = useRef(null);
  const geocodeSeqRef = useRef(0);
  useSaved(); // keeps saved-state context warm for sibling routes

  // Apply the active filters + sort to the villa list. Everything downstream
  // (the desktop side list, the map pins, the on-screen "N verdicts" count)
  // reads from this filtered set, so a filter narrows the whole Explore view
  // at once, not just the list.
  const filteredVillas = useMemo(() => applyFilters(villas, filters), [villas, filters]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const sel = filteredVillas.find((v) => v.id === selected);

  // Only the villas whose pin actually falls inside the map's current
  // viewport — not every villa on the site. The "N verdicts" header is
  // meant to describe what's on screen right now (zoom out, see more pins,
  // bigger number; pan away from all of them, no number at all), not act
  // as a site-wide tally.
  const visibleVillas = useMemo(() => {
    if (!mapBounds) return [];
    return filteredVillas.filter(
      (v) =>
        typeof v.lon === 'number' &&
        typeof v.lat === 'number' &&
        v.lon >= mapBounds.west &&
        v.lon <= mapBounds.east &&
        v.lat >= mapBounds.south &&
        v.lat <= mapBounds.north,
    );
  }, [filteredVillas, mapBounds]);

  // Re-geocodes the header label to wherever the map's camera actually
  // settles — debounced so a drag/zoom gesture doesn't fire a request per
  // frame, and guarded with a sequence number so a slow, stale request
  // can't overwrite the label after a newer pan has already resolved.
  const handleMoveEnd = useCallback(({ lon, lat, bounds }) => {
    if (bounds) setMapBounds(bounds);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      const seq = ++geocodeSeqRef.current;
      const label = await reverseGeocode(lon, lat);
      if (label && seq === geocodeSeqRef.current) setLocationLabel(label);
    }, 350);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: 'var(--ink-800)', display: 'flex' }}>
      {isDesktop && (
        // Width (not display) is what's animated, so collapsing this panel
        // in immersive mode reads as a slide-shut rather than a pop — the
        // inner column keeps its natural 332px width and gets progressively
        // clipped by this wrapper's overflow:hidden as it shrinks to 0.
        <div
          style={{
            flex: 'none',
            width: immersive ? 0 : 360,
            overflow: 'hidden',
            background: 'var(--surface-page)',
            borderRight: immersive ? 'none' : '1px solid var(--border-soft)',
            transition: 'width var(--dur-slow) var(--ease-out)',
          }}
        >
          <div style={{ width: 332, height: '100%', overflowY: 'auto', padding: '16px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input search iconLeft={<Search size={18} />} placeholder="Search Bali…" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                  {locationLabel}
                  {visibleVillas.length > 0 && ` · ${visibleVillas.length} verdict${visibleVillas.length === 1 ? '' : 's'}`}
                </div>
                <FiltersControl filters={filters} setFilters={setFilters} activeCount={activeFilterCount} align="right" />
              </div>
            </div>
            {filteredVillas.map((v) => (
              <VillaCard
                key={v.id}
                name={v.name} location={v.location} coords={v.coords} image={v.image}
                verdict={v.verdict} score={v.score} scoreOutOf={v.scoreOutOf} rating={v.rating}
                price={v.price} currency={v.currency} tags={v.tags}
                onClick={() => navigate(`/villa/${v.id}`)}
                style={v.id === selected ? { outline: '2px solid var(--brand)', outlineOffset: 2 } : {}}
              />
            ))}
            {villas.length > 0 && filteredVillas.length === 0 && (
              <NoMatches onReset={() => setFilters(DEFAULT_FILTERS)} />
            )}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <SatelliteMap ref={mapRef} villas={filteredVillas} selectedId={selected} onSelect={setSelected} onMoveEnd={handleMoveEnd} />

        {/* Map-only slide handle (desktop) — sits straddling the boundary
            between this side panel and the map, like a tab you pull, per
            the user's reference screenshot. Rounded on both sides (not a
            flat-one-side tab) since it's centered on that boundary rather
            than flush against either edge — a one-sided radius looked
            lopsided once it was actually straddling the line. Gated on
            `introDone` so it doesn't render — and, thanks to its z-index,
            paint over — the spinning-globe intro before the intro has
            handed off to the real map. Mobile gets its own handle on the
            tab-bar boundary, rendered in App.jsx since that's where the
            tab bar lives. */}
        {isDesktop && introDone && (
          <button
            onClick={() => setImmersive((v) => !v)}
            aria-label={immersive ? 'Show menu' : 'Hide menu — map only'}
            title={immersive ? 'Show menu' : 'Hide menu — map only'}
            style={{
              position: 'absolute', top: '50%', left: 0, zIndex: 40,
              transform: 'translate(-50%, -50%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 46, borderRadius: 'var(--radius-pill)', border: 'none',
              background: 'var(--surface-card)', boxShadow: 'var(--shadow-sm)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            {immersive ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}

        {/* Search bar floating over the map (mobile only — desktop's lives in the side panel) */}
        {!isDesktop && (
          <>
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Input search iconLeft={<Search size={18} />} placeholder="Search Bali…" />
              </div>
              <FiltersControl filters={filters} setFilters={setFilters} activeCount={activeFilterCount} align="right" compact />
            </div>

            {/* Region label — always shown as you pan around; the verdict
                count tacked onto it only appears once a villa pin is
                actually inside the current map frame, and drops away again
                when you pan/zoom away from all of them. */}
            <div style={{ position: 'absolute', top: 70, left: 16, zIndex: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {locationLabel}
              {visibleVillas.length > 0 && ` · ${visibleVillas.length} verdict${visibleVillas.length === 1 ? '' : 's'}`}
            </div>
          </>
        )}

        {/* Bottom-sheet preview — mobile only; desktop shows the same info in the side list */}
        {!isDesktop && sel && (
          <div
            style={{
              position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 12,
              background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sheet)', padding: 14,
              animation: 'sheetUp var(--dur-slow) var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/villa/${sel.id}`)}>
              <img src={sel.image} alt={sel.name} style={{ width: 92, height: 92, borderRadius: 'var(--radius-md)', objectFit: 'cover', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <VerdictBadge verdict={sel.verdict} score={sel.score} outOf={sel.scoreOutOf} size="sm" />
                  <button onClick={(e) => { e.stopPropagation(); setSelected(null); }} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)', padding: 2 }}>
                    <X size={18} />
                  </button>
                </div>
                <h3 style={{ margin: '6px 0 2px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em', color: 'var(--text-strong)' }}>{sel.name}</h3>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>{sel.location}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                  <RatingStars value={sel.rating} size={14} showValue />
                  <Tag variant="outline" tone="sun">{sel.currency}{sel.price} / night</Tag>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Explore filters — filter by bedrooms / pool / rating / verdict, and
 * sort by overall score, rating, price, or a specific review category
 * (best cleanliness, best location, etc.). Pure helpers below so the
 * logic is testable and shared by the list, the map pins and the count.
 * ------------------------------------------------------------------ */

const DEFAULT_FILTERS = { beds: 0, pool: false, minScore: 0, stayOnly: false, sort: 'best' };

const CATEGORY_SORT_KEYS = ['cleanliness', 'location', 'value', 'amenities', 'host'];

const SORT_OPTIONS = [
  { key: 'best', label: 'Best match' },
  { key: 'score', label: 'Top score' },
  { key: 'rating', label: 'Top rated' },
  { key: 'priceAsc', label: 'Price ↑' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'host', label: 'Host' },
];

const BED_OPTIONS = [0, 1, 2, 3, 4, 5];
// Minimum score on the same 0-50 scale used in "Write a review" — 30+ is a
// "Stay" (see NAY_THRESHOLD in reviewScore.js).
const SCORE_OPTIONS = [0, 30, 40, 45];

function hasPool(v) {
  return (v.tags || []).some((t) => /pool/i.test(String(t)));
}

function applyFilters(villas, f) {
  let list = villas.filter((v) => {
    if (f.beds && (v.beds || 0) < f.beds) return false;
    if (f.pool && !hasPool(v)) return false;
    // villa.score is on the legacy 0-100 display scale, so halve it to compare
    // against the 0-50 minimum the user picks (matching "Write a review").
    if (f.minScore && (v.score || 0) / 2 < f.minScore) return false;
    if (f.stayOnly && v.verdict !== 'stay') return false;
    return true;
  });
  if (f.sort === 'score') list = [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
  else if (f.sort === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (f.sort === 'priceAsc') list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (CATEGORY_SORT_KEYS.includes(f.sort)) {
    list = [...list].sort((a, b) => (b.categories?.[f.sort] ?? -1) - (a.categories?.[f.sort] ?? -1));
  }
  return list;
}

function countActiveFilters(f) {
  return [f.beds > 0, f.pool, f.minScore > 0, f.stayOnly, f.sort !== 'best'].filter(Boolean).length;
}

function FiltersControl({ filters, setFilters, activeCount, align = 'left', compact = false }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filters"
        className="press"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: compact ? '10px 12px' : '7px 12px',
          borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          border: '1px solid var(--border-default)',
          background: activeCount > 0 ? 'var(--brand-soft)' : 'var(--surface-card)',
          color: activeCount > 0 ? 'var(--brand)' : 'var(--text-body)',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
          boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap',
        }}
      >
        <SlidersHorizontal size={16} />
        {!compact && 'Filters'}
        {activeCount > 0 && (
          <span
            style={{
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--radius-pill)',
              background: 'var(--brand)', color: '#fff', fontSize: 11, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', [align]: 0, zIndex: 50,
              width: 288, maxWidth: '86vw', maxHeight: '70vh', overflowY: 'auto',
              background: 'var(--surface-card)', border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 16,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <FilterGroup label="Sort by">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SORT_OPTIONS.map((o) => (
                  <Chip key={o.key} active={filters.sort === o.key} onClick={() => set({ sort: o.key })}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Bedrooms">
              <Segmented
                options={BED_OPTIONS.map((n) => ({ value: n, label: n === 0 ? 'Any' : `${n}+` }))}
                value={filters.beds}
                onChange={(v) => set({ beds: v })}
              />
            </FilterGroup>

            <FilterGroup label="Minimum score (out of 50)">
              <Segmented
                options={SCORE_OPTIONS.map((n) => ({ value: n, label: n === 0 ? 'Any' : `${n}+` }))}
                value={filters.minScore}
                onChange={(v) => set({ minScore: v })}
              />
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-faint)' }}>
                30 and over is a “Stay”.
              </div>
            </FilterGroup>

            <FilterGroup label="Must have">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Chip active={filters.pool} onClick={() => set({ pool: !filters.pool })}>Pool</Chip>
                <Chip active={filters.stayOnly} onClick={() => set({ stayOnly: !filters.stayOnly })}>“Stay” only</Chip>
              </div>
            </FilterGroup>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 2 }}>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                disabled={activeCount === 0}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent',
                  cursor: activeCount === 0 ? 'default' : 'pointer', padding: 4,
                  color: activeCount === 0 ? 'var(--text-faint)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="press"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
                  padding: '9px 18px', borderRadius: 'var(--radius-pill)', color: '#fff',
                  background: 'var(--brand)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13.5,
                }}
              >
                <Check size={15} /> Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? 'var(--brand)' : 'var(--border-default)'}`,
        background: active ? 'var(--brand-soft)' : 'var(--surface-card)',
        color: active ? 'var(--brand)' : 'var(--text-body)',
        borderRadius: 'var(--radius-pill)', padding: '7px 12px', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, transition: 'all var(--dur-fast) var(--ease-out)',
      }}
    >
      {children}
    </button>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-pill)', padding: 4 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer', padding: '7px 0', borderRadius: 'var(--radius-pill)',
              background: active ? 'var(--surface-card)' : 'transparent',
              color: active ? 'var(--text-strong)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NoMatches({ onReset }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
        No villas match these filters.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="press"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-default)',
          background: 'var(--surface-card)', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--radius-pill)',
          color: 'var(--text-body)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
        }}
      >
        <RotateCcw size={14} /> Clear filters
      </button>
    </div>
  );
}
