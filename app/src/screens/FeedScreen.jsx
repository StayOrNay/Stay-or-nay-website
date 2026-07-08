import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronsUp } from 'lucide-react';
import { VerdictBadge, Tag, VillaCard } from '../components/core';
import { useVillasWithReviews } from '../hooks/useVillasWithReviews';
import { useSaved } from '../context/SavedContext';
import { useIsDesktop } from '../hooks/useMediaQuery';

/**
 * Feed — TikTok-style full-screen vertical feed on mobile, where a tall
 * narrow screen is exactly the canvas that format wants. On desktop a
 * single full-bleed column stretched across 1400px of width wouldn't gain
 * anything from the extra space (and a giant hero image is a worse use of
 * it than just browsing more verdicts at once) — so above the desktop
 * breakpoint this becomes a responsive card grid instead, the same "use
 * the width" idea as Explore's side list and Saved's grid.
 */
export function FeedScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const villas = useVillasWithReviews();
  const { saved, toggleSave } = useSaved();
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    if (isDesktop) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setActiveIndex((prev) => (prev !== idx ? idx : prev));
        if (idx > 0) setShowHint(false);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isDesktop]);

  if (isDesktop) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
        <div style={{ padding: '24px 28px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
          {villas.length} verdicts
        </div>
        <div
          style={{
            padding: '12px 28px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {villas.map((v) => (
            <VillaCard
              key={v.id}
              name={v.name} location={v.location} coords={v.coords} image={v.image}
              verdict={v.verdict} score={v.score} scoreOutOf={v.scoreOutOf} rating={v.rating}
              price={v.price} currency={v.currency} tags={v.tags}
              saved={saved.has(v.id)} onToggleSave={() => toggleSave(v.id)}
              onClick={() => navigate(`/villa/${v.id}`)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        background: '#000',
        position: 'relative',
      }}
    >
      {villas.map((v, i) => (
        <FeedSlide
          key={v.id}
          villa={v}
          active={i === activeIndex}
          saved={saved.has(v.id)}
          onToggleSave={() => toggleSave(v.id)}
          onOpen={() => navigate(`/villa/${v.id}`)}
        />
      ))}

      {showHint && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 5,
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            animation: 'feedHintPulse 1.8s ease-in-out infinite',
          }}
        >
          <ChevronsUp size={16} />
          Swipe for the next verdict
        </div>
      )}

      <style>{`
        @keyframes feedHintPulse {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

function FeedSlide({ villa, active, saved, onToggleSave, onOpen }) {
  return (
    <section
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        overflow: 'hidden',
        background: '#0C1714',
      }}
    >
      <img
        src={villa.image}
        alt={villa.name}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: active ? 'scale(1)' : 'scale(1.04)',
          transition: 'transform 600ms var(--ease-out)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,23,20,0.45) 0%, rgba(12,23,20,0.05) 22%, rgba(12,23,20,0.15) 55%, rgba(12,23,20,0.88) 100%)' }} />

      {/* Coordinate stamp, top */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.85)',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        {villa.coords}
      </div>

      {/* Right action rail — TikTok-style */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 110,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          zIndex: 4,
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          aria-label={saved ? 'Remove from saved' : 'Save villa'}
          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }}
        >
          <span
            style={{
              width: 46, height: 46, borderRadius: '50%',
              background: saved ? 'var(--nay-600)' : 'rgba(255,255,255,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Heart size={22} fill={saved ? '#fff' : 'none'} />
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {saved ? 'Saved' : 'Save'}
          </span>
        </button>
        <VerdictBadge verdict={villa.verdict} score={villa.score} outOf={villa.scoreOutOf} size="sm" />
      </div>

      {/* Caption block, bottom-left — tap to open full verdict */}
      <div
        onClick={onOpen}
        style={{
          position: 'absolute',
          left: 16,
          right: 86,
          bottom: 24,
          cursor: 'pointer',
          color: '#fff',
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.015em', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
          {villa.name}
        </h2>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginBottom: 8, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {villa.location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Tag variant="outline" tone="sun" style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}>
            {villa.currency}{villa.price} / night
          </Tag>
        </div>
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {villa.headline}
        </p>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {villa.tags.slice(0, 3).map((t, i) => (
            <Tag key={i} tone="neutral" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{t}</Tag>
          ))}
        </div>
      </div>
    </section>
  );
}
