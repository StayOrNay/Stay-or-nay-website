import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Share, Heart, MapPin as LocationIcon, PenLine } from 'lucide-react';
import { VerdictBadge, RatingStars, Tag, Avatar, Button, IconButton } from '../components/core';
import { useSaved } from '../context/SavedContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useVillaWithReviews } from '../hooks/useVillasWithReviews';
import { fetchApprovedReviewsForVilla } from '../lib/reviews';
import { MAX_TOTAL } from '../lib/reviewScore';

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

  const hero = (
    <div style={{ position: 'relative', height: isDesktop ? '100%' : 280 }}>
      <img src={villa.image} alt={villa.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,23,20,0.30) 0%, transparent 30%, transparent 60%, rgba(12,23,20,0.55) 100%)' }} />
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
      {/* big verdict bottom-left */}
      <div style={{ position: 'absolute', left: 16, bottom: 16 }}>
        <VerdictBadge verdict={villa.verdict} score={villa.score} size="lg" />
      </div>
      {/* coords bottom-right */}
      <div style={{ position: 'absolute', right: 16, bottom: 20, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
        {villa.coords}
      </div>
    </div>
  );

  const body = (
    <div style={{ padding: isDesktop ? '28px 32px 16px' : '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{villa.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <LocationIcon size={15} color="var(--text-muted)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)' }}>{villa.location}</span>
        </div>
      </div>

      {/* facts row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Tag variant="outline">Sleeps {villa.sleeps}</Tag>
        <Tag variant="outline">{villa.beds} beds</Tag>
        <Tag variant="outline">{villa.baths} baths</Tag>
      </div>

      {/* reviewer verdict block */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={villa.reviewer} verified={villa.verified} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{villa.reviewer}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Verified stayer</div>
          </div>
          <RatingStars value={villa.rating} size={16} showValue />
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
            No approved reviews yet — be the first to write one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {realReviews.map((r) => (
              <div key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag tone={r.verdict === 'stay' ? 'stay' : 'nay'}>{r.total} / {MAX_TOTAL}</Tag>
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
      <Button variant={isStay ? 'stay' : 'neutral'} size="lg" block style={{ flex: 1 }}>
        {isStay ? 'Check availability' : 'See it anyway'}
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
