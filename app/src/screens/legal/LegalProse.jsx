import React from 'react';

/**
 * Shared typography wrapper for the three legal documents — keeps headings,
 * paragraphs, and lists consistent without restyling each policy by hand.
 * Pass plain JSX (h2/h3/p/ul/li) as children.
 */
export function LegalProse({ updated, children }) {
  return (
    <div style={{ padding: '16px 20px 48px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 20 }}>
        Last updated {updated}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          lineHeight: 1.65,
          color: 'var(--text-body)',
        }}
        className="legal-prose"
      >
        {children}
      </div>
      <style>{`
        .legal-prose h2 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 19px;
          letter-spacing: -0.01em;
          color: var(--text-strong);
          margin: 28px 0 10px;
        }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 16px;
          color: var(--text-strong);
          margin: 18px 0 6px;
        }
        .legal-prose p { margin: 0 0 12px; }
        .legal-prose ul { margin: 0 0 12px; padding-left: 20px; }
        .legal-prose li { margin-bottom: 6px; }
        .legal-prose a { color: var(--text-link); }
        .legal-prose strong { color: var(--text-strong); }
      `}</style>
    </div>
  );
}
