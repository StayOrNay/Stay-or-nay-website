import React from 'react';

/**
 * Avatar — reviewer photo or initials, optional verified pin badge.
 * sizes: sm 28, md 40, lg 56.
 */
export function Avatar({
  src = null,
  name = '',
  size = 'md',
  verified = false,
  style = {},
  ...rest
}) {
  const dims = { sm: 28, md: 40, lg: 56 };
  const dim = dims[size] || dims.md;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: dim, height: dim, flex: 'none', ...style }} {...rest}>
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: dim, height: dim, borderRadius: 'var(--radius-pill)', objectFit: 'cover', display: 'block', border: '2px solid var(--paper-000)', boxShadow: 'var(--shadow-xs)' }}
        />
      ) : (
        <span
          style={{
            width: dim,
            height: dim,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--stay-100)',
            color: 'var(--stay-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: dim * 0.38,
            border: '2px solid var(--paper-000)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {initials || '?'}
        </span>
      )}
      {verified && (
        <span
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: dim * 0.42,
            height: dim * 0.42,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--sky-600)',
            border: '2px solid var(--paper-000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
          title="Verified stayer"
        >
          <svg width={dim * 0.22} height={dim * 0.22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4 4 10-11" />
          </svg>
        </span>
      )}
    </span>
  );
}
