import React from 'react';

/**
 * The StayOrNay verdict stamp — the brand's signature element.
 * verdict: "stay" | "nay". Optional numeric score /100.
 * sizes: sm (inline/list), md (card), lg (detail hero).
 */
export function VerdictBadge({
  verdict = 'stay',
  score = null,
  size = 'md',
  style = {},
  ...rest
}) {
  const isStay = verdict === 'stay';
  const sizes = {
    sm: { fontSize: 12, padding: '4px 10px', scoreFs: 11, gap: 6 },
    md: { fontSize: 15, padding: '7px 14px', scoreFs: 13, gap: 8 },
    lg: { fontSize: 22, padding: '10px 20px', scoreFs: 16, gap: 10 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        borderRadius: 'var(--radius-pill)',
        background: isStay ? 'var(--stay-600)' : 'var(--nay-600)',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: s.fontSize,
        letterSpacing: '0.02em',
        lineHeight: 1,
        boxShadow: 'var(--shadow-pin)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {isStay ? 'STAY' : 'NAY'}
      {score != null && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: s.scoreFs,
            background: 'rgba(255,255,255,0.22)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {score}
        </span>
      )}
    </span>
  );
}
