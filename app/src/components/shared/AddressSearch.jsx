import React, { useRef, useState } from 'react';
import { Search, X, CornerDownLeft, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '../core';
import { geocodeAddressCandidates } from '../../lib/mapbox';

/**
 * "Type the address instead of hunting for it on the map."
 *
 * Renders the heading row that sits directly above the map pin picker — the
 * section label on the left, an "Enter address" toggle (plus any extra
 * buttons the screen passes in `trailing`) on the right — and, when opened,
 * a single text field underneath. Paste or type the villa's full address,
 * press Enter, pick the right match, and the pin jumps there; the reviewer
 * can still drag it afterwards to fine-tune.
 *
 * It owns the heading row rather than being dropped into one so the results
 * panel has somewhere full-width to expand into, instead of being squeezed
 * in beside the buttons.
 *
 * Deliberately shows the matches rather than silently moving the pin to the
 * top hit: street names repeat all over Bali, and a geocoder that lands in
 * the wrong regency (or the wrong country) is worse than no result at all if
 * nobody notices. The list also flags when a match is only street- or
 * town-level rather than an exact address.
 *
 * Props:
 *   label        — heading text shown on the left ("Pin the exact spot").
 *   near         — { lon, lat } | null, current pin; biases results nearby.
 *   onPick       — ({ lon, lat, label }) => void, fired when a result is chosen.
 *   initialQuery — seeds the field the first time it's opened (e.g. the
 *                  "Area / town" the reviewer already typed).
 *   trailing     — optional extra button(s) for the right-hand side.
 */
export function AddressSearch({ label, near = null, onPick, initialQuery = '', trailing = null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | searching | none | done
  const inputRef = useRef(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setQuery((q) => q || initialQuery || '');
    setStatus('idle');
    // Focus after the field has actually rendered.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setStatus('searching');
    setResults([]);
    const found = await geocodeAddressCandidates(q, near);
    setResults(found);
    setStatus(found.length ? 'done' : 'none');
  };

  const choose = (r) => {
    onPick?.({ lon: r.lon, lat: r.lat, label: r.label });
    setResults([]);
    setStatus('idle');
    setOpen(false);
  };

  // Enter searches without submitting the surrounding review form.
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const labelStyle = { fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {label ? <label style={labelStyle}>{label}</label> : <span />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconLeft={open ? <X size={15} /> : <Search size={15} />}
            onClick={toggle}
            aria-expanded={open}
          >
            {open ? 'Close' : 'Enter address'}
          </Button>
          {trailing}
        </div>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Full address, e.g. Jl. Pantai Berawa No.12, Canggu, Bali"
              aria-label="Full address"
              style={{
                flex: 1, minWidth: 0, height: 40, padding: '0 12px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                background: 'var(--surface-card)', fontFamily: 'var(--font-body)',
                fontSize: 14.5, color: 'var(--text-strong)',
              }}
            />
            <Button
              type="button"
              variant="neutral"
              size="sm"
              style={{ height: 40, flex: 'none' }}
              disabled={status === 'searching' || !query.trim()}
              onClick={search}
            >
              {status === 'searching' ? 'Finding…' : 'Find'}
            </Button>
          </div>

          {status === 'idle' && (
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)' }}>
              <CornerDownLeft size={12} /> Press Enter to search, then pick the right match.
            </p>
          )}

          {status === 'none' && (
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-muted)' }}>
              No match for that address. Try just the street and town — or place the pin by hand on the map.
            </p>
          )}

          {status === 'done' && results.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {results.map((r, i) => {
                // Anything coarser than a street is a rough drop, not the villa.
                const rough = r.accuracy && !['address', 'street'].includes(r.accuracy);
                return (
                  <li key={`${r.lon},${r.lat},${i}`}>
                    <button
                      type="button"
                      onClick={() => choose(r)}
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-soft)', background: 'var(--surface-card)',
                      }}
                    >
                      <MapPin size={14} style={{ flex: 'none', marginTop: 2, color: 'var(--brand)' }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-strong)' }}>
                          {r.label}
                        </span>
                        {(r.detail || rough) && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 11.5, color: rough ? 'var(--text-muted)' : 'var(--text-faint)' }}>
                            {rough && <AlertTriangle size={10} />}
                            {rough ? `Approximate — ${r.accuracy}-level match${r.detail ? ` · ${r.detail}` : ''}` : r.detail}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
