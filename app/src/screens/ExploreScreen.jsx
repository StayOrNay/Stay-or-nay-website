import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Navigation, X } from 'lucide-react';
import { Input, IconButton, VerdictBadge, RatingStars, Tag } from '../components/core';
import { MapPin } from '../components/shared';
import { villas } from '../data/villas';
import mapTerrain from '../assets/map-terrain.svg';
import { useSaved } from '../context/SavedContext';

/**
 * Explore — the Google-Earth-style map with verdict pins and a bottom-sheet
 * preview. Tap a pin to preview; tap the sheet to open the full verdict.
 */
export function ExploreScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  useSaved(); // keeps saved-state context warm for sibling routes

  const sel = villas.find((v) => v.id === selected);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: 'var(--ink-800)' }}>
      {/* Map backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: `url('${mapTerrain}') center/cover`, transform: 'scale(1.25)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 30%, transparent 50%, rgba(12,23,20,0.35))' }} />

      {/* Search bar floating over the map */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Input search iconLeft={<Search size={18} />} placeholder="Search the coast…" />
        </div>
        <IconButton ariaLabel="Filters"><SlidersHorizontal size={18} /></IconButton>
      </div>

      {/* Region label */}
      <div style={{ position: 'absolute', top: 70, left: 16, zIndex: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
        Ionian coast · {villas.length} verdicts
      </div>

      {/* Pins */}
      {villas.map((v) => (
        <MapPin key={v.id} villa={v} active={selected === v.id} onClick={() => setSelected(v.id)} />
      ))}

      {/* Locate FAB */}
      <div style={{ position: 'absolute', right: 14, bottom: sel ? 250 : 24, zIndex: 8, transition: 'bottom var(--dur-base) var(--ease-out)' }}>
        <IconButton variant="brand" size="lg" ariaLabel="Locate me"><Navigation size={20} /></IconButton>
      </div>

      {/* Bottom-sheet preview */}
      {sel && (
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
  );
}
