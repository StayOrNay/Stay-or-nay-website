import React from 'react';

/**
 * StayOrNay primary button.
 * Variants: stay (brand green), nay (coral), neutral (ink outline), ghost.
 * Sizes: sm, md, lg. Full-width on mobile via `block`.
 */
export function Button({
  variant = 'stay',
  size = 'md',
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '0 14px', height: 36, fontSize: 14, radius: 'var(--radius-sm)', gap: 7 },
    md: { padding: '0 18px', height: 44, fontSize: 15, radius: 'var(--radius-sm)', gap: 8 },
    lg: { padding: '0 24px', height: 52, fontSize: 17, radius: 'var(--radius-md)', gap: 9 },
  };
  const variants = {
    stay: { background: 'var(--brand)', color: '#fff', border: '1px solid transparent' },
    nay: { background: 'var(--nay-600)', color: '#fff', border: '1px solid transparent' },
    neutral: { background: 'var(--paper-000)', color: 'var(--text-strong)', border: '1px solid var(--border-default)' },
    ghost: { background: 'transparent', color: 'var(--text-strong)', border: '1px solid transparent' },
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.stay;

  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const hoverBg = {
    stay: 'var(--brand-hover)',
    nay: 'var(--nay-700)',
    neutral: 'var(--paper-100)',
    ghost: 'var(--paper-100)',
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: s.fontSize,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: press && !disabled ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)',
        boxShadow: variant === 'stay' || variant === 'nay' ? 'var(--shadow-sm)' : 'none',
        ...v,
        ...(hover && !disabled ? { background: hoverBg } : null),
        ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
