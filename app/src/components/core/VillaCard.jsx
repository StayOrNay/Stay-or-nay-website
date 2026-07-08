import React from 'react';
import { VerdictBadge } from './VerdictBadge';
import { Tag } from './Tag';
import { IconButton } from './IconButton';

/**
 * The core content unit: an aerial thumbnail with the verdict stamp pinned to
 * the corner, a paper info block below. Composes VerdictBadge, RatingStars,
 * Tag and IconButton.
 */
export function VillaCard({
  name = 'Untitled villa',
  location = '',
  coords = null,
  image = null,
  verdict = 'stay',
  score = null,
  scoreOutOf = null,
  price = null,
  currency = '€',
  tags = [],
  saved = false,
  onToggleSave = null,
  onClick = null,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-soft)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transform: hover && onClick ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      {/* Thumbnail — portrait (leans to the 9:16 vertical the videos use) */}
      <div style={{ position: 'relative', aspectRatio: '3 / 4', background: 'var(--paper-200)' }}>
        {image && (
          <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {/* top scrim for legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,23,20,0.18), transparent 38%)' }} />
        {/* verdict pinned top-left */}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <VerdictBadge verdict={verdict} score={score} outOf={scoreOutOf} size="sm" />
        </div>
        {/* save heart top-right */}
        {onToggleSave && (
          <div style={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => { e.stopPropagation(); onToggleSave(); }}>
            <IconButton ariaLabel={saved ? 'Remove from saved' : 'Save villa'} size="sm" active={saved}>
              <HeartIcon filled={saved} />
            </IconButton>
          </div>
        )}
      </div>

      {/* Info block */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em', color: 'var(--text-strong)' }}>
            {name}
          </h3>
        </div>

        {(location || coords) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            {location && <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5 }}>{location}</span>}
            {coords && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.03em', color: 'var(--text-faint)' }}>
                {coords}
              </span>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {tags.slice(0, 3).map((t, i) => (
              <Tag key={i} tone="neutral">{t}</Tag>
            ))}
          </div>
        )}

        {price != null && (
          <div style={{ marginTop: 2 }}>
            <Tag variant="outline" tone="sun">{currency}{price} / night</Tag>
          </div>
        )}
      </div>
    </article>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  );
}
