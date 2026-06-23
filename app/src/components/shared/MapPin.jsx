import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * Verdict pin dropped on the aerial map, sized/positioned by percentage
 * coordinates (villa.pin.x / villa.pin.y).
 */
export function MapPin({ villa, active, onClick }) {
  const isStay = villa.verdict === 'stay';
  return (
    <button
      onClick={onClick}
      aria-label={villa.name}
      style={{
        position: 'absolute',
        left: villa.pin.x + '%',
        top: villa.pin.y + '%',
        transform: `translate(-50%,-100%) scale(${active ? 1.12 : 1})`,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        transition: 'transform var(--dur-base) var(--ease-pop)',
        zIndex: active ? 6 : 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px 4px 5px',
          background: isStay ? 'var(--stay-600)' : 'var(--nay-600)',
          color: '#fff',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-pin)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: 'nowrap',
          border: active ? '2px solid #fff' : '2px solid transparent',
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {isStay ? <Check size={12} /> : <X size={12} />}
        </span>
        {villa.score}
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          margin: '0 auto',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `7px solid ${isStay ? 'var(--stay-600)' : 'var(--nay-600)'}`,
        }}
      />
    </button>
  );
}
