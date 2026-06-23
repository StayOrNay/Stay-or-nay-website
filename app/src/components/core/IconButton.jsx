import React from 'react';

/**
 * Round/square icon-only button. Used in map overlays, headers, and cards.
 * Variants: solid (paper, pinned over map), ghost (transparent), brand.
 */
export function IconButton({
  variant = 'solid',
  size = 'md',
  shape = 'circle',
  active = false,
  disabled = false,
  ariaLabel,
  children,
  style = {},
  ...rest
}) {
  const sizes = { sm: 32, md: 40, lg: 48 };
  const dim = sizes[size] || sizes.md;

  const variants = {
    solid: { background: 'var(--paper-000)', color: 'var(--text-strong)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-pin)' },
    ghost: { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent', boxShadow: 'none' },
    brand: { background: 'var(--brand)', color: '#fff', border: '1px solid transparent', boxShadow: 'var(--shadow-sm)' },
  };
  const v = variants[variant] || variants.solid;
  const [press, setPress] = React.useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        borderRadius: shape === 'circle' ? 'var(--radius-pill)' : 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        color: active ? 'var(--nay-600)' : v.color,
        transform: press ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform var(--dur-fast) var(--ease-out)',
        flex: 'none',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
