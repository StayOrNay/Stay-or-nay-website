import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, AlertCircle, CheckCircle2, Clock, Loader2, XCircle, Link2, Bell } from 'lucide-react';
import { Input, Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { submitReviewRequest, fetchMyReviewRequests } from '../lib/reviewRequests';

const STATUS_META = {
  open: { label: 'Open — waiting on us', tone: 'sun', Icon: Clock },
  in_progress: { label: 'Being looked into', tone: 'sun', Icon: Loader2 },
  fulfilled: { label: 'Review ready', tone: 'stay', Icon: CheckCircle2 },
  declined: { label: 'Declined', tone: 'nay', Icon: XCircle },
};

/**
 * "Request a review" — ask the StayOrNay team to go (or arrange for
 * someone to go) honestly review a property. Free for the requester.
 *
 * Deliberately a ONE-FIELD form: just the listing link. Everything else
 * (name, location, dates) is readable from the link itself, and every
 * extra field cost real requests. The review comes back in about 3 days,
 * and the requester is notified in-app (Verdict alerts + the status list
 * on this screen) because they're signed in.
 */
export function RequestReviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { configured, user, loading: authLoading } = useAuth();

  // The URL-search screen ("Check a villa") sends people here with the link
  // they already pasted, so they never type it twice.
  const [propertyLink, setPropertyLink] = useState(location.state?.propertyLink || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [myRequests, setMyRequests] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingMine(false);
      return;
    }
    let cancelled = false;
    fetchMyReviewRequests(user.id).then(({ data }) => {
      if (!cancelled) {
        setMyRequests(data || []);
        setLoadingMine(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, done]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: submitErr } = await submitReviewRequest({
      userId: user.id,
      propertyLink: propertyLink.trim(),
    });
    setSubmitting(false);
    if (submitErr) {
      setError(submitErr.message);
      return;
    }
    setPropertyLink('');
    setDone(true);
  };

  return (
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Request a review" onBack={() => navigate(-1)} />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Paste the listing link — that's all we need. We'll go take an honest look (it's free) and you'll
          usually have your review back within <strong>about 3 days</strong>. You'll be notified right here
          on the site the moment it's ready.
        </p>

        {!configured ? (
          <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
            Sign-in isn't set up yet on this deploy, so review requests can't be submitted right now.
          </Notice>
        ) : !user ? (
          <>
            <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
              You need an account to request a review — it's how we notify you when your review is ready.
            </Notice>
            <Button variant="stay" block onClick={() => navigate('/you/account')}>Sign in or create an account</Button>
          </>
        ) : done ? (
          <div className="rise holo-card" style={{ '--i': 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: 26 }}>
            <span className="stamp-in success-ring" style={{ animationDelay: '150ms' }}><CheckCircle2 size={32} color="var(--success)" /></span>
            <h2 className="rise" style={{ '--i': 3, margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)' }}>Request sent</h2>
            <p className="rise" style={{ '--i': 4, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Expect your review back in about 3 days. We'll notify you here on the site — check{' '}
              <span style={{ whiteSpace: 'nowrap' }}><Bell size={13} style={{ verticalAlign: -2 }} /> Verdict alerts</span>{' '}
              or the status list below.
            </p>
            <Button variant="neutral" size="sm" onClick={() => setDone(false)}>Send another request</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rise holo-card" style={{ '--i': 1, display: 'flex', flexDirection: 'column', gap: 16, padding: 18 }}>
            <div className="hud-label">New mission briefing</div>
            <div className="rise" style={{ '--i': 1 }}>
              <Input
                label="Property link"
                required
                type="url"
                placeholder="Booking.com, Airbnb, Vrbo, the villa's own site…"
                iconLeft={<Link2 size={16} />}
                value={propertyLink}
                onChange={(e) => setPropertyLink(e.target.value)}
              />
            </div>
            <p style={{ margin: '-6px 0 0', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
              That's it — no forms. We read everything else from the listing. Review back in ~3 days,
              notification here on the site when it's ready.
            </p>

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
              </div>
            )}

            <div className="rise" style={{ '--i': 2 }}>
              <Button type="submit" variant="stay" block size="lg" disabled={submitting || !propertyLink.trim()} iconLeft={<Send size={18} />}>
                {submitting ? 'Sending…' : 'Send request'}
              </Button>
            </div>
          </form>
        )}

        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="hud-label">
              <span className="hud-live-dot" /> Your requests
            </div>
            {authLoading || loadingMine ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</div>
            ) : myRequests.length === 0 ? (
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-faint)' }}>No requests yet.</p>
            ) : (
              myRequests.map((r, idx) => {
                const meta = STATUS_META[r.status] || STATUS_META.open;
                return (
                  <div key={r.id} className="rise card-lift glass-card" style={{ '--i': Math.min(idx, 6), padding: 15, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <a href={r.property_link} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-strong)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.property_name || r.property_link}
                      </a>
                      <span key={r.status} className="stamp-in" style={{ animationDelay: `${200 + Math.min(idx, 6) * 70}ms` }}>
                        <Tag tone={meta.tone} iconLeft={<meta.Icon size={12} />}>{meta.label}</Tag>
                      </span>
                    </div>
                    {r.location && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-muted)' }}>{r.location}</span>}
                    {r.admin_note && (
                      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
                        From us: {r.admin_note}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function Notice({ icon, children }) {
  return (
    <div className="rise glass-card" style={{ '--i': 1, padding: 18, display: 'flex', gap: 12 }}>
      <span style={{ flex: 'none', marginTop: 1 }}>{icon}</span>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{children}</p>
    </div>
  );
}
