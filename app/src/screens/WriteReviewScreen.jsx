import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ImagePlus, X, Send, AlertCircle, CheckCircle2, Link2, Image as ImageIcon, Video as VideoIcon, Info, MapPin, Crosshair } from 'lucide-react';
import { Input, Button, VerdictBadge, Tag } from '../components/core';
import { Header, LocationPicker } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CATEGORIES, MAX_PER_CATEGORY, NAY_THRESHOLD, MAX_TOTAL, MIN_PHOTOS, MIN_VIDEOS, MIN_BODY_CHARS, emptyScores, totalFromCategories, verdictFromTotal } from '../lib/reviewScore';
import { submitReview, uploadReviewMedia } from '../lib/reviews';
import { prepareMediaForUpload, MAX_UPLOAD_BYTES } from '../lib/compressMedia';
import { forwardGeocode } from '../lib/mapbox';

function isVideo(file) {
  return file.type.startsWith('video/');
}
function isPhoto(file) {
  return file.type.startsWith('image/');
}

/**
 * Write a review — you link + name whatever property you actually stayed
 * at yourself (exactly like "Request a review"), not a pick from the
 * site's small set of placeholder villas (data/villas.js — temporary demo
 * content, going away once the real site is finished). Five 0-10 category
 * sliders make up the real 50-point score, at least 5 photos + 2 videos
 * are required, then headline + body. Submits as 'pending' — it stays
 * invisible to everyone but the author until the site owner approves it.
 */
export function WriteReviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { configured, user } = useAuth();

  // VillaDetailScreen's "Write a review" button passes the villa's name
  // along as a starting point (it has no link to prefill — none of the
  // sample villas have one — so this is just a convenience, fully editable
  // and not locked the way the old per-villa route used to be).
  const prefillName = location.state?.propertyName || '';

  const [name, setName] = useState(user?.user_metadata?.display_name || user?.user_metadata?.name || '');
  const [propertyLink, setPropertyLink] = useState('');
  const [propertyName, setPropertyName] = useState(prefillName);
  const [area, setArea] = useState('');
  const [coords, setCoords] = useState(null); // {lon, lat} once the reviewer places/geocodes the pin
  const [locating, setLocating] = useState(false);
  const [beds, setBeds] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [currency, setCurrency] = useState('$');
  const [scores, setScores] = useState(emptyScores);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [prep, setPrep] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const total = useMemo(() => totalFromCategories(scores), [scores]);
  const verdict = useMemo(() => verdictFromTotal(total), [total]);

  const photoCount = useMemo(() => files.filter(isPhoto).length, [files]);
  const videoCount = useMemo(() => files.filter(isVideo).length, [files]);
  const mediaReady = photoCount >= MIN_PHOTOS && videoCount >= MIN_VIDEOS;

  const setScore = (key, value) => setScores((prev) => ({ ...prev, [key]: value }));

  // Compress right when a file is dropped in — not at submit — so by the time
  // someone hits "Submit" every clip is already small and upload is instant.
  // Small files pass straight through; big videos get squeezed toward ~10 MB.
  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setError(null);
    setProcessing((n) => n + picked.length);
    for (const file of picked) {
      let out = file;
      try {
        const prepared = await prepareMediaForUpload([file], (info) => setPrep({ ...info, name: file.name }));
        out = prepared.files[0];
      } catch (err) {
        setError(`Couldn't process "${file.name}": ${err?.message || err}. Try a more common format (MP4/MOV).`);
      } finally {
        setPrep(null);
      }
      setFiles((prev) => [...prev, out]);
      setProcessing((n) => Math.max(0, n - 1));
    }
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  // Drop the map pin roughly on whatever area they typed, as a starting point
  // they can then fine-tune by dragging.
  const locateFromArea = async () => {
    if (!area.trim()) return;
    setLocating(true);
    const geo = await forwardGeocode(area);
    setLocating(false);
    if (geo) setCoords({ lon: geo.lon, lat: geo.lat });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Add your name so people can see who wrote this review.');
      return;
    }

    if (body.trim().length < MIN_BODY_CHARS) {
      setError(`Add a bit more to your write-up — at least ${MIN_BODY_CHARS} characters so it's genuinely useful (you have ${body.trim().length}).`);
      return;
    }

    if (!mediaReady) {
      setError(`You need at least ${MIN_PHOTOS} photo${MIN_PHOTOS === 1 ? '' : 's'} and ${MIN_VIDEOS} video${MIN_VIDEOS === 1 ? '' : 's'} — you have ${photoCount} photo${photoCount === 1 ? '' : 's'} and ${videoCount} video${videoCount === 1 ? '' : 's'} so far.`);
      return;
    }

    // Media was already compressed the moment it was added (see handleFiles),
    // so submit is just a size sanity-check + upload. If compression is still
    // running, ask them to wait rather than uploading a half-processed set.
    if (processing > 0) {
      setError('Still compressing your video — give it a moment, then submit.');
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is still ${Math.ceil(tooBig.size / (1024 * 1024))} MB, over the 50 MB limit. Please upload a shorter or lower-resolution video.`);
      return;
    }

    setSubmitting(true);

    // Remember the reviewer's name on their account so it's prefilled next
    // time (best-effort — a failure here shouldn't block the review).
    const cleanName = name.trim();
    if (cleanName && cleanName !== (user?.user_metadata?.display_name || '')) {
      try { await supabase.auth.updateUser({ data: { display_name: cleanName } }); } catch { /* non-fatal */ }
    }

    const { urls, error: uploadErr } = await uploadReviewMedia(files, user.id);
    if (uploadErr) {
      setError(uploadErr.message);
      setSubmitting(false);
      return;
    }
    // uploadReviewMedia uploads in order and stops at the first failure, so
    // urls[i] always corresponds to files[i] for every i < urls.length —
    // safe to zip them back together to tag each URL as a photo or video.
    const mediaUrls = urls.map((url, i) => ({ url, type: isVideo(files[i]) ? 'video' : 'photo' }));

    // Prefer the exact spot the reviewer placed on the map. Only fall back to
    // geocoding the free-text area when they didn't drop a pin. Either way the
    // review still saves if there's no location (it just won't have a pin).
    const geo = coords || (await forwardGeocode(area || propertyName));

    const { error: submitErr } = await submitReview({
      propertyLink,
      propertyName,
      userId: user.id,
      reviewerName: cleanName,
      scores,
      headline,
      body,
      mediaUrls,
      beds: beds ? Number(beds) : null,
      pricePaid: pricePaid ? Number(pricePaid) : null,
      currency,
      area,
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
    });
    setSubmitting(false);
    if (submitErr) {
      setError(submitErr.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
        <Header title="Review submitted" onBack={() => navigate('/you/reviews')} />
        <div style={{ padding: 24, maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <CheckCircle2 size={40} color="var(--success)" />
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>Thanks — it's in the queue</h2>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Your review is pending review by the StayOrNay team. You'll see it under "Your reviews" right away, and get a verdict alert once it's approved or rejected.
          </p>
          <Button variant="stay" onClick={() => navigate('/you/reviews')}>Go to your reviews</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Write a review" onBack={() => navigate(-1)} />
      <div style={{ padding: 16, maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 48 }}>
        {!configured ? (
          <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
            Sign-in isn't set up yet on this deploy, so reviews can't be submitted right now.
          </Notice>
        ) : !user ? (
          <>
            <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
              You need an account to write a review — it's how we know who to credit and how to reach you if we have a question about it.
            </Notice>
            <Button variant="stay" block onClick={() => navigate('/you/account')}>Sign in or create an account</Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Input
              label="Your name"
              required
              placeholder="First name is fine — e.g. Benjamin"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Property link"
              required
              type="url"
              placeholder="Booking.com, Airbnb, Vrbo, the villa's own site…"
              iconLeft={<Link2 size={16} />}
              value={propertyLink}
              onChange={(e) => setPropertyLink(e.target.value)}
            />
            <Input
              label="Property name"
              required
              placeholder="e.g. Villa Mawar, The Sanctuary Bali…"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />

            <Input
              label="Area / town"
              required
              placeholder="e.g. Uluwatu, Bali"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />

            {/* Exact location — Airbnb never gives a precise address, so the
                reviewer drops the pin themselves. We seed it from the typed
                area, then they drag it onto the real spot. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>Pin the exact spot</label>
                <Button type="button" variant="ghost" size="sm" iconLeft={<Crosshair size={15} />} disabled={locating || !area.trim()} onClick={locateFromArea}>
                  {locating ? 'Locating…' : 'Center on area'}
                </Button>
              </div>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)' }}>
                Drag the pin (or tap the map) to place the villa as precisely as you can.
              </p>
              <div style={{ position: 'relative', height: 240, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                <LocationPicker
                  value={coords}
                  onChange={(lon, lat) => setCoords({ lon, lat })}
                />
              </div>
              {coords && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>
                  <MapPin size={13} /> {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                </div>
              )}
            </div>

            <Input
              label="Bedrooms"
              required
              type="number"
              min={1}
              max={30}
              placeholder="e.g. 3"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
            />

            {/* How much they paid — currency picker + amount, per night. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>
                How much did you pay?{' '}
                <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>per night</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Currency"
                  style={{
                    flex: 'none', width: 74, padding: '0 10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)', background: 'var(--surface-card)',
                    fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-strong)', cursor: 'pointer',
                  }}
                >
                  <option value="$">$ USD</option>
                  <option value="€">€ EUR</option>
                  <option value="£">£ GBP</option>
                  <option value="Rp">Rp IDR</option>
                  <option value="A$">A$ AUD</option>
                </select>
                <input
                  type="number"
                  required
                  min={0}
                  step="1"
                  placeholder="e.g. 350"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  style={{
                    flex: 1, minWidth: 0, padding: '12px 12px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)', background: 'var(--surface-card)',
                    fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-strong)',
                  }}
                />
              </div>
            </div>

            {/* Live total/verdict preview */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Your score</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--text-strong)' }}>{total} / {MAX_TOTAL}</div>
              </div>
              <VerdictBadge verdict={verdict} size="md" />
            </div>
            <p style={{ margin: '-10px 0 0', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)' }}>
              {MAX_TOTAL} points total across five categories · under {NAY_THRESHOLD} is a Nay
            </p>

            {/* Category sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CATEGORIES.map((c) => (
                <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <LabelWithHint label={c.label} hint={c.hint} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>{scores[c.key]} / {MAX_PER_CATEGORY}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={MAX_PER_CATEGORY}
                    step={1}
                    value={scores[c.key]}
                    onChange={(e) => setScore(c.key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--brand)' }}
                  />
                </div>
              ))}
            </div>

            <Input
              label="Headline"
              required
              placeholder="Sum it up in one line"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>Your review</label>
              <textarea
                required
                rows={6}
                placeholder="What was it actually like to stay there?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  resize: 'vertical', padding: 12, borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)', background: 'var(--surface-card)',
                  fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-strong)', lineHeight: 1.5,
                }}
              />
            </div>

            {/* Media upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>Photos & videos</label>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)' }}>
                At least {MIN_PHOTOS} photos and {MIN_VIDEOS} videos are required. Long videos are
                compressed automatically in your browser before upload, so full walkthroughs are fine.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Tag tone={photoCount >= MIN_PHOTOS ? 'stay' : 'neutral'} iconLeft={<ImageIcon size={12} />}>
                  {photoCount} / {MIN_PHOTOS} photos
                </Tag>
                <Tag tone={videoCount >= MIN_VIDEOS ? 'stay' : 'neutral'} iconLeft={<VideoIcon size={12} />}>
                  {videoCount} / {MIN_VIDEOS} videos
                </Tag>
              </div>
              <label
                htmlFor="review-media-input"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-md)',
                  padding: '18px 12px', cursor: 'pointer', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                }}
              >
                <ImagePlus size={20} />
                Add photos or videos
              </label>
              <input id="review-media-input" type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {files.map((f, i) => (
                    <Tag key={i} tone="neutral" style={{ paddingRight: 6 }}>
                      {f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove ${f.name}`}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: 0, marginLeft: 2, color: 'var(--text-faint)' }}
                      >
                        <X size={13} />
                      </button>
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            {prep && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Compressing video{prep.total > 1 ? ` ${prep.index + 1} of ${prep.total}` : ''} for upload — {Math.round((prep.fraction || 0) * 100)}%
                  <span style={{ color: 'var(--text-faint)' }}> (this can take a minute for long clips; keep this tab open)</span>
                </span>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--border-default)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((prep.fraction || 0) * 100)}%`, background: 'var(--success)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
              </div>
            )}

            <Button type="submit" variant="stay" block size="lg" disabled={submitting || processing > 0} iconLeft={<Send size={18} />}>
              {processing > 0 ? 'Compressing…' : submitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// A category label with a small info icon that reveals a plain-English
// description of what the category means — on hover (mouse), on tap (touch),
// and on keyboard focus. Kept self-contained so each label owns its own
// open/closed state.
function LabelWithHint({ label, hint }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, position: 'relative' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--text-strong)' }}>{label}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label={`${label}: ${hint}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', color: 'var(--text-faint)' }}
      >
        <Info size={14} />
      </span>
      {show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width: 240,
            maxWidth: '80vw',
            background: 'var(--text-strong)',
            color: 'var(--surface-card)',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 12.5,
            lineHeight: 1.45,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {hint}
        </span>
      )}
    </span>
  );
}

function Notice({ icon, children }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', gap: 12 }}>
      <span style={{ flex: 'none', marginTop: 1 }}>{icon}</span>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{children}</p>
    </div>
  );
}
