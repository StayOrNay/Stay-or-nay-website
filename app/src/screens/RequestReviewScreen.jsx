import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, AlertCircle, CheckCircle2, Clock, Loader2, XCircle, Link2 } from 'lucide-react';
import { Input, Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { submitReviewRequest, fetchMyReviewRequests } from '../lib/reviewRequests';

const STATUS_META = {
  open: { label: 'Open — waiting on us', tone: 'sun', Icon: Clock },
  in_progress: { label: 'Being looked into', tone: 'sun', Icon: Loader2 },
  fulfilled: { label: 'Fulfilled', tone: 'stay', Icon: CheckCircle2 },
  declined: { label: 'Declined', tone: 'nay', Icon: XCircle },
};

// Native <input type="date"> renders its calendar/format using the
// device's OS-level locale, not this site's html lang="en" — that's why
// it can show up as European-style dd/mm/yyyy on a browser/OS set to a
// non-US locale even though every other part of the site is in English.
// A plain Month/Day/Year set of <select> dropdowns sidesteps that
// entirely: the month names are hardcoded English strings we render
// ourselves, so the field reads in English no matter the visitor's
// device settings.
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isoToParts(iso) {
  if (!iso) return { y: '', m: '', d: '' };
  const [y, m, d] = iso.split('-');
  return { y: y || '', m: m || '', d: d || '' };
}

function partsToIso(y, m, d) {
  if (!y || !m || !d) return '';
  return `${y}-${m}-${d}`;
}

function DateSelect({ label, value, onChange }) {
  const { y, m, d } = isoToParts(value);
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const selectStyle = {
    flex: 1,
    height: 46,
    padding: '0 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-default)',
    background: 'var(--surface-card)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--text-strong)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <select style={{ ...selectStyle, flex: 1.6 }} value={m} onChange={(e) => onChange(partsToIso(y, e.target.value, d))}>
          <option value="">Month</option>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
          ))}
        </select>
        <select style={selectStyle} value={d} onChange={(e) => onChange(partsToIso(y, m, e.target.value))}>
          <option value="">Day</option>
          {days.map((dd) => (
            <option key={dd} value={dd}>{dd}</option>
          ))}
        </select>
        <select style={selectStyle} value={y} onChange={(e) => onChange(partsToIso(e.target.value, m, d))}>
          <option value="">Year</option>
          {years.map((yy) => (
            <option key={yy} value={String(yy)}>{yy}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * "Request a review" — ask the StayOrNay team to go (or arrange for
 * someone to go) honestly review a property before you book or while
 * you're staying there. Free for the requester — no payment, no fee.
 */
export function RequestReviewScreen() {
  const navigate = useNavigate();
  const { configured, user, loading: authLoading } = useAuth();

  const [propertyLink, setPropertyLink] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes] = useState('');
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
      propertyLink,
      propertyName,
      location,
      checkIn,
      checkOut,
      notes,
    });
    setSubmitting(false);
    if (submitErr) {
      setError(submitErr.message);
      return;
    }
    setPropertyLink('');
    setPropertyName('');
    setLocation('');
    setCheckIn('');
    setCheckOut('');
    setNotes('');
    setDone(true);
  };

  return (
    <div className="hud-screen" data-theme="night">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Request a review" onBack={() => navigate(-1)} />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Booked (or thinking about booking) somewhere and want an honest review before or during your stay? Send us the link and we'll go — or arrange for someone to. It's free.
        </p>

        {!configured ? (
          <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
            Sign-in isn't set up yet on this deploy, so review requests can't be submitted right now.
          </Notice>
        ) : !user ? (
          <>
            <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
              You need an account to request a review — it's how we get back to you.
            </Notice>
            <Button variant="stay" block onClick={() => navigate('/you/account')}>Sign in or create an account</Button>
          </>
        ) : done ? (
          <div className="rise holo-card" style={{ '--i': 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: 26 }}>
            <span className="stamp-in success-ring" style={{ animationDelay: '150ms' }}><CheckCircle2 size={32} color="var(--success)" /></span>
            <h2 className="rise" style={{ '--i': 3, margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)' }}>Request sent</h2>
            <p className="rise" style={{ '--i': 4, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              We'll get back to you below once we've looked at it.
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
            <div className="rise" style={{ '--i': 2 }}>
              <Input
                label="Property name"
                required
                placeholder="e.g. Villa Mawar, The Sanctuary Bali…"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
              />
            </div>
            <div className="rise" style={{ '--i': 3 }}>
              <Input
                label="Location"
                placeholder="e.g. Canggu, Bali"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="rise" style={{ '--i': 4, display: 'flex', gap: 12 }}>
              <DateSelect label="Check-in (optional)" value={checkIn} onChange={setCheckIn} />
              <DateSelect label="Check-out (optional)" value={checkOut} onChange={setCheckOut} />
            </div>
            <div className="rise" style={{ '--i': 5, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-body)' }}>Anything else we should know?</label>
              <textarea
                rows={4}
                placeholder="What are you most unsure about — the photos, the location, something specific?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  resize: 'vertical', padding: 12, borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)', background: 'var(--surface-card)',
                  fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-strong)', lineHeight: 1.5,
                }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
              </div>
            )}

            <div className="rise" style={{ '--i': 6 }}>
              <Button type="submit" variant="stay" block size="lg" disabled={submitting} iconLeft={<Send size={18} />}>
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
