import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input, VerdictBadge, RatingStars, Tag, VillaCard } from '../components/core';
import { SatelliteMap } from '../components/shared';
import { villas } from '../data/villas';
import { useSaved } from '../context/SavedContext';
import { useIsDesktop } from '../hooks/useMediaQuery';

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
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);
  useSaved(); // keeps saved-state context warm for sibling routes

  const sel = villas.find((v) => v.id === selected);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: 'var(--ink-800)', display: 'flex' }}>
      {isDesktop && (
        <div
          style={{
            flex: 'none',
            width: 360,
            overflowY: 'auto',
            background: 'var(--surface-page)',
            borderRight: '1px solid var(--border-soft)',
            padding: '16px 14px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input search iconLeft={<Search size={18} />} placeholder="Search Bali…" />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              Bali, Indonesia · {villas.length} verdicts
            </div>
          </div>
          {villas.map((v) => (
            <VillaCard
              key={v.id}
              name={v.name} location={v.location} coords={v.coords} image={v.image}
              verdict={v.verdict} score={v.score} rating={v.rating}
              price={v.price} currency={v.currency} tags={v.tags}
              onClick={() => navigate(`/villa/${v.id}`)}
              style={v.id === selected ? { outline: '2px solid var(--brand)', outlineOffset: 2 } : {}}
            />
          ))}
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <SatelliteMap ref={mapRef} villas={villas} selectedId={selected} onSelect={setSelected} />

        {/* Search bar floating over the map (mobile only — desktop's lives in the side panel) */}
        {!isDesktop && (
          <>
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input search iconLeft={<Search size={18} />} placeholder="Search Bali…" />
              </div>
            </div>

            {/* Region label */}
            <div style={{ position: 'absolute', top: 70, left: 16, zIndex: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              Bali, Indonesia · {villas.length} verdicts
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
                  <VerdictBadge verdict={sel.verdict} score={sel.score} size="sm" />
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
