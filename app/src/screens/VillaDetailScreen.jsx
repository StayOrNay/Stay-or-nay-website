import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Share, Heart, MapPin as LocationIcon, PenLine, X, KeyRound, Copy, Check } from 'lucide-react';
import { reverseGeocodeFullAddress } from '../lib/mapbox';
import { VerdictBadge, Tag, Avatar, Button, IconButton } from '../components/core';
import { useSaved } from '../context/SavedContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useVillaWithReviews } from '../hooks/useVillasWithReviews';
import { fetchApprovedReviewsForVilla } from '../lib/reviews';
import { MAX_TOTAL, CATEGORIES } from '../lib/reviewScore';

/**
 * Villa detail — hero aerial, big verdict, reviewer block, amenities,
 * sticky price + CTA. On mobile it's one scrolling column (hero on top).
 * On desktop the hero becomes a fixed-height side panel and the write-up
 * scrolls in its own column next to it — a single full-width hero image
 * followed by a column of text would leave most of a wide screen as
 * whitespace either side of the copy.
 */
export function VillaDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isDesktop = useIsDesktop();
  const { saved, toggleSave } = useSaved();
  const villa = useVillaWithReviews(id);
  const [realReviews, setRealReviews] = useState([]);
  const [activeMedia, setActiveMedia] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchApprovedReviewsForVilla(id).then(({ data }) => {
      if (!cancelled) setRealReviews(data || []);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!villa) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>That verdict doesn't exist (yet).</p>
        <Button variant="neutral" onClick={() => navigate('/')}>Back to the map</Button>
      </div>
    );
  }

  const isStay = villa.verdict === 'stay';
  const isSaved = saved.has(villa.id);

  // All of the reviewer's media — photos and video — for the gallery. Falls
  // back to the single card image for older/legacy listings with no media.
  const media = (Array.isArray(villa.mediaUrls) && villa.mediaUrls.length > 0)
    ? villa.mediaUrls
    : [{ url: villa.image, type: 'photo' }];
  const activeIdx = Math.min(activeMedia, media.length - 1);
  const active = media[activeIdx] || media[0];

  const hero = (
    <div style={{ position: 'relative', height: isDesktop ? '100%' : 'auto', display: 'flex', flexDirection: 'column', background: 'var(--paper-200)' }}>
      {/* main viewer — a full-width, near-full-height frame. Photos use
          object-fit:cover so they FILL the frame edge to edge (no black
          letterbox bars, no side gutters — the frame is exactly the shell's
          width, and a phone photo just crops a sliver to fit). Videos keep
          object-fit:contain so nothing is cut off while they play; portrait
          review clips fill the tall frame almost exactly anyway. */}
      <div style={{ position: 'relative', flex: isDesktop ? '1 1 auto' : 'none', minHeight: 0, width: '100%', height: isDesktop ? 'auto' : '76dvh', background: '#000' }}>
        {active.type === 'video' ? (
          <video key={active.url} src={active.url} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }} />
        ) : (
          <img src={active.url} alt={villa.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(12,23,20,0.30) 0%, transparent 26%, transparent 62%, rgba(12,23,20,0.55) 100%)' }} />
        {/* top controls */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between' }}>
          <IconButton ariaLabel="Back" onClick={() => navigate(-1)}><ChevronLeft size={22} /></IconButton>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton ariaLabel="Share"><Share size={19} /></IconButton>
            <IconButton ariaLabel="Save" active={isSaved} onClick={() => toggleSave(villa.id)}>
              <Heart size={19} fill={isSaved ? 'currentColor' : 'none'} />
            </IconButton>
          </div>
        </div>
        {/* coords bottom-right */}
        {villa.coords && (
          <div style={{ position: 'absolute', right: 16, bottom: 20, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {villa.coords}
          </div>
        )}
      </div>
      {/* thumbnail filmstrip */}
      {media.length > 1 && (
        <div style={{ flex: 'none', display: 'flex', gap: 8, padding: 10, overflowX: 'auto', background: 'var(--surface-card)', borderTop: '1px solid var(--border-soft)' }}>
          {media.map((m, i) => {
            const on = i === activeIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveMedia(i)}
                aria-label={`View ${m.type === 'video' ? 'video' : 'photo'} ${i + 1}`}
                style={{ position: 'relative', flex: 'none', width: 46, height: 72, borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer', background: '#000', border: on ? '2px solid var(--stay-600)' : '2px solid transparent', boxShadow: on ? 'var(--shadow-sm)' : 'none' }}
              >
                {m.type === 'video' ? (
                  <>
                    <video src={m.url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.28)' }}>
                      <PlayIcon />
                    </span>
                  </>
                ) : (
                  <img src={m.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const body = (
    <div style={{ padding: isDesktop ? '28px 32px 16px' : '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="explore-enter-card" style={{ animationDelay: '60ms' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{villa.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <LocationIcon size={15} color="var(--text-muted)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)' }}>{villa.location}</span>
          {typeof villa.lon === 'number' && typeof villa.lat === 'number' && (
            <AddressReveal lon={villa.lon} lat={villa.lat} name={villa.name} />
          )}
        </div>
      </div>

      {/* facts row */}
      <div className="explore-enter-card" style={{ animationDelay: '140ms', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {villa.beds != null && <Tag variant="outline">{villa.beds} bed{villa.beds === 1 ? '' : 's'}</Tag>}
        {villa.sleeps != null && <Tag variant="outline">Sleeps {villa.sleeps}</Tag>}
        {villa.baths != null && <Tag variant="outline">{villa.baths} baths</Tag>}
        {villa.price != null && <Tag variant="outline" tone="sun">{villa.currency}{villa.price} / night</Tag>}
      </div>

      {/* verdict badge — moved off the photo so the media reads cleaner;
          stamps in like the landing's STAY/NAY slam */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span className="stamp-in" style={{ animationDelay: '350ms' }}>
          <VerdictBadge verdict={villa.verdict} score={villa.score} outOf={villa.scoreOutOf} size="lg" />
        </span>
      </div>

      {/* score breakdown FIRST — the five categories that make up the /50 total */}
      {villa.categories && (
        <div className="explore-enter-card" style={{ animationDelay: '260ms' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
            — Score breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CATEGORIES.map((c, ci) => {
              const val = Number(villa.categories[c.key]) || 0;
              return (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 118, flex: 'none', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-body)' }}>{c.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--paper-200)', overflow: 'hidden' }}>
                    <ScoreBar pct={(val / 10) * 100} delay={450 + ci * 110} color={isStay ? 'var(--stay-600)' : 'var(--nay-600)'} />
                  </div>
                  <span style={{ width: 42, flex: 'none', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--text-strong)' }}>{val}/10</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>Total</span>
              <Tag tone={isStay ? 'stay' : 'nay'}>{villa.total} / {MAX_TOTAL} · {villa.verdict.toUpperCase()}</Tag>
            </div>
          </div>
        </div>
      )}

      {/* the review itself — comes AFTER the score breakdown */}
      <div className="explore-enter-card" style={{ animationDelay: '380ms', background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={villa.reviewer} verified={villa.verified} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{villa.reviewer}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Verified stayer</div>
          </div>
        </div>
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 17, lineHeight: 1.4, color: 'var(--text-strong)' }}>
          "{villa.headline}"
        </p>
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-body)' }}>
          {villa.body}
        </p>
      </div>

      {/* amenities */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
          — What you get
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {villa.tags.map((t, i) => <Tag key={i} tone={isStay ? 'stay' : 'neutral'}>{t}</Tag>)}
        </div>
      </div>

      {/* real, verified-stayer reviews */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            — Reviews {villa.reviewCount ? `(${villa.reviewCount})` : ''}
          </div>
          <Button variant="ghost" size="sm" iconLeft={<PenLine size={15} />} onClick={() => navigate('/write-review', { state: { propertyName: villa.name } })}>
            Write a review
          </Button>
        </div>
        {realReviews.length === 0 ? (
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-faint)' }}>
            This is one honest take. Stayed here too? Share your own Stay or Nay.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {realReviews.map((r) => (
              <div key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag tone={r.verdict === 'stay' ? 'stay' : 'nay'}>{r.total} / {MAX_TOTAL}</Tag>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, color: 'var(--text-strong)' }}>{(r.reviewer_name || '').trim().split(/\s+/)[0] || 'A guest'}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)' }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {r.headline && <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14.5, color: 'var(--text-strong)' }}>"{r.headline}"</p>}
                {r.body && <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-body)', lineHeight: 1.55 }}>{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const cta = (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: isDesktop ? '16px 32px' : '12px 16px', background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border-soft)' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-strong)', lineHeight: 1 }}>{villa.currency}{villa.price}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>per night</div>
      </div>
      <Button
        variant={isStay ? 'stay' : 'neutral'}
        size="lg"
        block
        style={{ flex: 1 }}
        onClick={() => { if (villa.propertyLink) window.open(villa.propertyLink, '_blank', 'noopener,noreferrer'); }}
      >
        {villa.propertyLink ? 'Take me there' : isStay ? 'Check availability' : 'See it anyway'}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', background: 'var(--surface-page)', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 44%', minWidth: 0 }}>{hero}</div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>{body}</div>
          {cta}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {hero}
        {body}
      </div>
      {cta}
    </div>
  );
}

/**
 * Score bar that FILLS on arrival — 0 to its real value with a long
 * map-flight ease, staggered per category — instead of just being there.
 * Purely presentational; the value itself never changes after mount.
 */
function ScoreBar({ pct, delay = 0, color }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setFilled(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return (
    <div
      style={{
        height: '100%',
        width: filled ? `${pct}%` : '0%',
        borderRadius: 999,
        background: color,
        transition: 'width 900ms var(--ease-fly)',
      }}
    />
  );
}

/**
 * The address "cheat code" — booking sites hide the exact address until
 * after you pay, but our pin comes from the listing's own map, so we can
 * reverse-geocode it into the real street address. A small chip next to
 * the location line; tap → popup with the full address (fetched on first
 * open, then cached); tap anywhere outside, the X, or Escape to close.
 */
function AddressReveal({ lon, lat, name }) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(null); // null = not fetched, '' = failed
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const reveal = async () => {
    setOpen(true);
    if (address === null) {
      const a = await reverseGeocodeFullAddress(lon, lat);
      setAddress(a || '');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address || `${lat}, ${lon}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — no-op */ }
  };

  return (
    <>
      <button
        type="button"
        onClick={reveal}
        className="press"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
          border: '1px solid var(--border-default)', background: 'var(--surface-card)',
          borderRadius: 'var(--radius-pill)', padding: '4px 10px',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--brand)',
        }}
      >
        <KeyRound size={13} /> See exact address
      </button>

      {/* Portaled to <body> — the screen's entrance animations create CSS
          containing blocks, which would trap this position:fixed overlay
          and clip it half off-screen (the desktop glitch). */}
      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Exact address"
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(6, 12, 10, 0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 380,
              background: 'var(--surface-card)', border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 12,
              animation: 'sheetUp var(--dur-slow) var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em', color: 'var(--text-strong)' }}>
                {name} — exact address
              </h3>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {address === null ? (
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>Looking it up…</p>
            ) : address ? (
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.5 }}>{address}</p>
            ) : (
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
                No street address found for this spot — use the coordinates below.
              </p>
            )}

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="stay" size="sm" iconLeft={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copy} disabled={address === null}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="neutral"
                size="sm"
                onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank', 'noopener')}
              >
                Open in Google Maps
              </Button>
            </div>

            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.45 }}>
              From the reviewer's pin — the nearest registered address, so double-check the gate when you arrive.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
