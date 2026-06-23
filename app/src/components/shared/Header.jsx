import React from 'react';
import { ChevronLeft } from 'lucide-react';

/**
 * Translucent sticky header used on Feed / Saved / You / Villa detail back-nav.
 */
export function Header({ title, onBack = null, right = null }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 56,
        padding: '0 12px',
        background: 'rgba(247,242,232,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-soft)',
        flex: 'none',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: 6, color: 'var(--text-strong)' }}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <h1
        style={{
          margin: 0,
          flex: 1,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.015em',
          color: 'var(--text-strong)',
          paddingLeft: onBack ? 0 : 6,
        }}
      >
        {title}
      </h1>
      {right}
    </header>
  );
}
