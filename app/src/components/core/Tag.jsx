import React from 'react';

/**
 * Small metadata chip / tag. Two looks:
 *  - "soft" (default): tinted fill, for amenities & facts ("Sleeps 8", "Pool")
 *  - "outline": mono stamp look, for coordinates & technical meta
 * tone: neutral | stay | nay | sky | sun
 */
export function Tag({
  variant = 'soft',
  tone = 'neutral',
  iconLeft = null,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: { soft: ['var(--paper-200)', 'var(--ink-700)'], line: ['var(--border-strong)', 'var(--text-strong)'] },
    stay: { soft: ['var(--stay-100)', 'var(--stay-700)'], line: ['var(--stay-600)', 'var(--stay-700)'] },
    nay: { soft: ['var(--nay-100)', 'var(--nay-700)'], line: ['var(--nay-600)', 'var(--nay-700)'] },
    sky: { soft: ['var(--sky-100)', 'var(--sky-700)'], line: ['var(--sky-600)', 'var(--sky-700)'] },
    sun: { soft: ['var(--sun-100)', 'var(--sun-600)'], line: ['var(--sun-600)', 'var(--sun-600)'] },
  };
  const t = tones[tone] || tones.neutral;
  const isOutline = variant === 'outline';
  const [bg, fg] = isOutline ? ['transparent', t.line[1]] : [t.soft[0], t.soft[1]];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: isOutline ? '3px 9px' : '4px 10px',
        background: bg,
        color: fg,
        border: isOutline ? `1.5px solid ${t.line[0]}` : '1px solid transparent',
        borderRadius: isOutline ? 'var(--radius-xs)' : 'var(--radius-pill)',
        fontFamily: isOutline ? 'var(--font-mono)' : 'var(--font-body)',
        fontWeight: isOutline ? 700 : 600,
        fontSize: isOutline ? 11 : 12.5,
        letterSpacing: isOutline ? '0.06em' : '0',
        textTransform: isOutline ? 'uppercase' : 'none',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children}
    </span>
  );
}
