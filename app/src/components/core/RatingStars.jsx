import React from 'react';

/**
 * Amber star rating. Read-only display by default; pass onRate for interactive.
 * Renders 5 stars with half-step support via fractional `value`.
 */
export function RatingStars({
  value = 0,
  max = 5,
  size = 16,
  showValue = false,
  onRate = null,
  style = {},
  ...rest
}) {
  const stars = [];
  for (let i = 1; i <= max; i++) {
    const fill = Math.max(0, Math.min(1, value - (i - 1)));
    stars.push(
      <span
        key={i}
        onClick={onRate ? () => onRate(i) : undefined}
        style={{
          position: 'relative',
          width: size,
          height: size,
          cursor: onRate ? 'pointer' : 'default',
          display: 'inline-block',
        }}
      >
        <Star size={size} color="var(--rating-off)" />
        <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
          <Star size={size} color="var(--rating-on)" />
        </span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.18), ...style }} {...rest}>
      <span style={{ display: 'inline-flex', gap: Math.round(size * 0.12) }}>{stars}</span>
      {showValue && (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size * 0.78, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function Star({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block' }}>
      <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.77l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z" />
    </svg>
  );
}
