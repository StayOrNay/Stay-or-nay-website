import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ImagePlus, X, Send, AlertCircle, CheckCircle2, Link2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { Input, Button, VerdictBadge, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, MAX_PER_CATEGORY, NAY_THRESHOLD, MAX_TOTAL, MIN_PHOTOS, MIN_VIDEOS, emptyScores, totalFromCategories, verdictFromTotal } from '../lib/reviewScore';
import { submitReview, uploadReviewMedia } from '../lib/reviews';

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

  const [propertyLink, setPropertyLink] = useState('');
  const [propertyName, setPropertyName] = useState(prefillName);
  const [scores, setScores] = useState(emptyScores);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const total = useMemo(() => totalFromCategories(scores), [scores]);
  const verdict = useMemo(() => verdictFromTotal(total), [total]);

  const photoCount = useMemo(() => files.filter(isPhoto).length, [files]);
  const videoCount = useMemo(() => files.filter(isVideo).length, [files]);
  const mediaReady = photoCount >= MIN_PHOTOS && videoCount >= MIN_VIDEOS;

  const setScore = (key, value) => setScores((prev) => ({ ...prev, [key]: value }));

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!mediaReady) {
      setError(`You need at least ${MIN_PHOTOS} photos and ${MIN_VIDEOS} videos — you have ${photoCount} photo${photoCount === 1 ? '' : 's'} and ${videoCount} video${videoCount === 1 ? '' : 's'} so far.`);
      return;
    }

    setSubmitting(true);

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

    const { error: submitErr } = await submitReview({
      propertyLink,
      propertyName,
      userId: user.id,
      scores,
      headline,
      body,
      mediaUrls,
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
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--text-strong)' }}>{c.label}</span>
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
                At least {MIN_PHOTOS} photos and {MIN_VIDEOS} videos are required.
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

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
              </div>
            )}

            <Button type="submit" variant="stay" block size="lg" disabled={submitting} iconLeft={<Send size={18} />}>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </form>
        )}
      </div>
    </div>
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
