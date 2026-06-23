import React from 'react';

/**
 * Text input with optional leading icon and label. Sunken paper field.
 * Use `search` to get the rounded map-search look.
 */
export function Input({
  label = null,
  iconLeft = null,
  search = false,
  invalid = false,
  hint = null,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          height: 46,
          padding: '0 14px',
          background: 'var(--surface-card)',
          border: `1px solid ${invalid ? 'var(--nay-600)' : focus ? 'var(--accent)' : 'var(--border-default)'}`,
          borderRadius: search ? 'var(--radius-pill)' : 'var(--radius-sm)',
          boxShadow: focus ? 'var(--ring)' : 'var(--shadow-inset)',
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        }}
      >
        {iconLeft && <span style={{ display: 'inline-flex', color: 'var(--text-faint)' }}>{iconLeft}</span>}
        <input
          id={inputId}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-strong)',
            minWidth: 0,
          }}
          {...rest}
        />
      </div>
      {hint && (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: invalid ? 'var(--nay-600)' : 'var(--text-muted)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}
