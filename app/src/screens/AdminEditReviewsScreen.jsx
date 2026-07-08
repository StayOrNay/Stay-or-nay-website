import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Save, Check } from 'lucide-react';
import { Input, Button, Tag } from '../components/core';
import { Header, LocationPicker } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { fetchAllApprovedReviews, updateReview } from '../lib/reviews';
import { MAX_TOTAL } from '../lib/reviewScore';

/**
 * Admin-only editor for ALREADY-PUBLISHED reviews. The main job is location:
 * drop/adjust the map pin (and/or type an address) for reviews that came in
 * without a precise spot — e.g. older ones placed at a town-center fallback.
 * You can also fix the write-up. Saves straight to the review row; allowed for
 * the admin email only, via the same RLS policy moderation uses.
 */
export function AdminEditReviewsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const admin = isAdmin(user);

  useEffect(() => {
    if (!admin) { setLoading(false); return; }
    let cancelled = false;
    fetchAllApprovedReviews().then(({ data }) => {
      if (cancelled) return;
      const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReviews(sorted);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Edit published reviews" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {authLoading || loading ? (
          <Loading />
        ) : !admin ? (
          <Notice>This page is only for the StayOrNay team.</Notice>
        ) : reviews.length === 0 ? (
          <Notice>No published reviews yet.</Notice>
        ) : (
          reviews.map((r) => <ReviewEditor key={r.id} review={r} />)
        )}
      </div>
    </div>
  );
}

function ReviewEditor({ review }) {
  const hasCoords = typeof review.lon === 'number' && typeof review.lat === 'number';
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(hasCoords ? { lon: review.lon, lat: review.lat } : null);
  const [area, setArea] = useState(review.area || '');
  const [headline, setHeadline] = useState(review.headline || '');
  const [body, setBody] = useState(review.body || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const name = review.property_name || 'Untitled property';

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await updateReview(review.id, {
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      area,
      headline,
      body,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>{name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontFamily: 'var(--font-body)', fontSize: 12.5, color: hasCoords ? 'var(--text-muted)' : 'var(--danger)' }}>
            <MapPin size={13} />
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` : 'No location set'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag tone={review.verdict === 'stay' ? 'stay' : 'nay'}>{review.total} / {MAX_TOTAL}</Tag>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Edit'}</Button>
        </div>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>Location on the map</label>
            <p style={{ margin: '4px 0 8px', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)' }}>
              Drag the pin (or tap the map) onto where you think the villa is. It updates instantly on save.
            </p>
            <div style={{ position: 'relative', height: 260, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
              <LocationPicker value={coords} onChange={(lon, lat) => setCoords({ lon, lat })} initialCenter={coords || undefined} />
            </div>
          </div>

          <Input label="Address / area" placeholder="e.g. Berawa, Canggu" value={area} onChange={(e) => setArea(e.target.value)} />
          <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>Review text</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-strong)', lineHeight: 1.5 }}
            />
          </div>

          {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--danger)' }}>{error}</div>}

          <Button variant="stay" disabled={saving} iconLeft={saved ? <Check size={16} /> : <Save size={16} />} onClick={save}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </Button>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</div>;
}

function Notice({ children }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 18, textAlign: 'center' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>{children}</p>
    </div>
  );
}
