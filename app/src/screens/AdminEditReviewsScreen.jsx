import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Save, Check, ImagePlus, X, Trash2, EyeOff, Play } from 'lucide-react';
import { Input, Button, Tag } from '../components/core';
import { Header, LocationPicker } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { fetchAllApprovedReviews, updateReview, deleteReview, uploadReviewMedia } from '../lib/reviews';
import { CATEGORIES, MAX_PER_CATEGORY, MAX_TOTAL, totalFromCategories, verdictFromTotal } from '../lib/reviewScore';
import { prepareMediaForUpload } from '../lib/compressMedia';

/**
 * Admin-only editor for ALREADY-PUBLISHED reviews. Full control: the map pin
 * and address, the write-up, the property name/link, all five category
 * scores (total + verdict recalculate automatically), price/beds/reviewer
 * name, and the photo/video set (add via upload — HEIC and oversized files
 * are converted/compressed exactly like "Write a review" — or remove any
 * existing item). A review can also be unpublished back to the moderation
 * queue or deleted outright. Saves straight to the review row; allowed for
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

  const removeFromList = (id) => setReviews((prev) => prev.filter((r) => r.id !== id));

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
          reviews.map((r) => (
            <ReviewEditor key={r.id} review={r} adminUserId={user.id} onGone={() => removeFromList(r.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function isVideoUrl(url) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url || '');
}

function ReviewEditor({ review, adminUserId, onGone }) {
  const hasCoords = typeof review.lon === 'number' && typeof review.lat === 'number';
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(hasCoords ? { lon: review.lon, lat: review.lat } : null);
  const [area, setArea] = useState(review.area || '');
  const [headline, setHeadline] = useState(review.headline || '');
  const [body, setBody] = useState(review.body || '');
  const [propertyName, setPropertyName] = useState(review.property_name || '');
  const [propertyLink, setPropertyLink] = useState(review.property_link || '');
  const [reviewerName, setReviewerName] = useState(review.reviewer_name || '');
  const [price, setPrice] = useState(review.price_paid ?? '');
  const [currency, setCurrency] = useState(review.currency || '$');
  const [beds, setBeds] = useState(review.beds ?? '');
  const [scores, setScores] = useState(() =>
    CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: Number(review[`score_${c.key}`]) || 0 }), {})
  );
  const [mediaUrls, setMediaUrls] = useState(() => Array.isArray(review.media_urls) ? review.media_urls : []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(null); // 'unpublish' | 'delete'
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const total = totalFromCategories(scores);
  const verdict = verdictFromTotal(total);
  const name = propertyName || 'Untitled property';

  const setScore = (key, value) => setScores((prev) => ({ ...prev, [key]: value }));

  // Add photos/videos: same pipeline as "Write a review" — HEIC converts to
  // JPEG, oversized videos compress — then upload to storage and append the
  // public URLs. They're only written to the review row on Save.
  const handleAddFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setError(null);
    setUploading(true);
    try {
      const { files: prepared } = await prepareMediaForUpload(picked);
      const { urls, error: upErr } = await uploadReviewMedia(prepared, adminUserId);
      if (urls.length) setMediaUrls((prev) => [...prev, ...urls]);
      if (upErr) setError(upErr.message || String(upErr));
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (url) => setMediaUrls((prev) => prev.filter((u) => u !== url));

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await updateReview(review.id, {
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      area,
      headline,
      body,
      property_name: propertyName,
      property_link: propertyLink,
      reviewer_name: reviewerName || null,
      price_paid: price === '' ? null : Number(price),
      currency,
      beds: beds === '' ? null : Number(beds),
      media_urls: mediaUrls,
      score_location: scores.location,
      score_value: scores.value,
      score_cleanliness: scores.cleanliness,
      score_amenities: scores.amenities,
      score_host: scores.host,
      total,
      verdict,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Unpublish: back to the moderation queue (status 'pending') — it
  // disappears from the public site immediately but nothing is lost.
  const unpublish = async () => {
    setBusy('unpublish');
    setError(null);
    const { error: err } = await updateReview(review.id, { status: 'pending' });
    setBusy(null);
    if (err) { setError(err.message); return; }
    onGone();
  };

  // Delete: two clicks required — the first arms the button, the second
  // actually removes the row for good.
  const doDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); return; }
    setBusy('delete');
    setError(null);
    const { error: err } = await deleteReview(review.id);
    setBusy(null);
    if (err) { setError(err.message); return; }
    onGone();
  };

  const label = { fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' };

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
          <Tag tone={verdict === 'stay' ? 'stay' : 'nay'}>{total} / {MAX_TOTAL}</Tag>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Edit'}</Button>
        </div>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ---- Photos & videos ---- */}
          <div>
            <label style={label}>Photos & videos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {mediaUrls.map((url) => (
                <div key={url} style={{ position: 'relative', width: 84, height: 84, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-soft)', background: 'var(--surface-sunken)' }}>
                  {isVideoUrl(url) ? (
                    <>
                      <video src={url} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', left: 4, bottom: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                        <Play size={11} />
                      </span>
                    </>
                  ) : (
                    <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(url)}
                    aria-label="Remove this file"
                    title="Remove"
                    style={{
                      position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%',
                      border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <label
                htmlFor={`admin-media-${review.id}`}
                style={{
                  width: 84, height: 84, borderRadius: 'var(--radius-md)', cursor: uploading ? 'wait' : 'pointer',
                  border: '1.5px dashed var(--border-default)', display: 'inline-flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textAlign: 'center',
                }}
              >
                <ImagePlus size={18} />
                {uploading ? 'Uploading…' : 'Add'}
              </label>
              <input
                id={`admin-media-${review.id}`}
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.heic,.heif,image/heic,image/heif"
                multiple
                disabled={uploading}
                onChange={handleAddFiles}
                style={{ display: 'none' }}
              />
            </div>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)' }}>
              Removals only take effect when you save. iPhone HEIC photos convert automatically.
            </p>
          </div>

          {/* ---- Scores ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={label}>Scores — total {total} / {MAX_TOTAL} ({verdict === 'stay' ? 'Stay' : 'Nay'})</label>
            {CATEGORIES.map((c) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 'none', width: 120, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>{c.label}</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_PER_CATEGORY}
                  step={1}
                  value={scores[c.key]}
                  onChange={(e) => setScore(c.key, Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--brand)' }}
                />
                <span style={{ flex: 'none', width: 26, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{scores[c.key]}</span>
              </div>
            ))}
          </div>

          {/* ---- Property ---- */}
          <Input label="Property name" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
          <Input label="Listing link" placeholder="https://…" value={propertyLink} onChange={(e) => setPropertyLink(e.target.value)} />

          {/* ---- Details ---- */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 64, flex: 'none' }}>
              <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Price per night" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div style={{ width: 84, flex: 'none' }}>
              <Input label="Beds" type="number" value={beds} onChange={(e) => setBeds(e.target.value)} />
            </div>
          </div>
          <Input label="Reviewer name (shown publicly)" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} />

          {/* ---- Location ---- */}
          <div>
            <label style={label}>Location on the map</label>
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
            <label style={label}>Review text</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-strong)', lineHeight: 1.5 }}
            />
          </div>

          {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--danger)' }}>{error}</div>}

          <Button variant="stay" disabled={saving || uploading} iconLeft={saved ? <Check size={16} /> : <Save size={16} />} onClick={save}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </Button>

          {/* ---- Danger zone ---- */}
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
            <Button variant="ghost" size="sm" disabled={busy !== null} iconLeft={<EyeOff size={15} />} onClick={unpublish}>
              {busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish (back to moderation)'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              iconLeft={<Trash2 size={15} />}
              onClick={doDelete}
              style={{ color: 'var(--danger)' }}
            >
              {busy === 'delete' ? 'Deleting…' : confirmDelete ? 'Click again to delete forever' : 'Delete'}
            </Button>
          </div>
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
