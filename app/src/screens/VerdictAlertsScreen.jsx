import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react';
import { Button } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { villas } from '../data/villas';
import { fetchMyReviews } from '../lib/reviews';
import { fetchMyReviewRequests } from '../lib/reviewRequests';
import { useVillasWithReviews } from '../hooks/useVillasWithReviews';
import { sameListing } from '../lib/listingMatch';

/**
 * Verdict alerts — the site's in-app notification feed. Two kinds of
 * notification land here, merged newest-first:
 *   1. "Your review got a verdict" — one of your own submitted reviews was
 *      approved or rejected by moderation.
 *   2. "Your requested review is ready" — a review you REQUESTED (via
 *      Request a review) was fulfilled or declined. Fulfilled ones link
 *      straight to the published review when we can match it by listing URL.
 * There's no separate notifications table; both lists are just re-read from
 * the user's own rows, which RLS already scopes to them.
 */
export function VerdictAlertsScreen() {
  const navigate = useNavigate();
  const { configured, user, loading: authLoading } = useAuth();
  const published = useVillasWithReviews();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([fetchMyReviews(user.id), fetchMyReviewRequests(user.id)]).then(([mine, requests]) => {
      if (cancelled) return;
      const reviewAlerts = (mine.data || [])
        .filter((r) => r.status === 'approved' || r.status === 'rejected')
        .map((r) => ({ kind: 'review', at: r.moderated_at || r.created_at, row: r }));
      const requestAlerts = (requests.data || [])
        .filter((r) => r.status === 'fulfilled' || r.status === 'declined')
        .map((r) => ({ kind: 'request', at: r.updated_at || r.created_at, row: r }));
      const merged = [...reviewAlerts, ...requestAlerts].sort((a, b) => new Date(b.at) - new Date(a.at));
      setAlerts(merged);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Verdict alerts" onBack={() => navigate('/you')} />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.5 }}>
          You'll see one of these when a review you submitted gets a verdict — and when a review you requested is ready.
        </p>

        {!configured ? (
          <EmptyState icon={<Bell size={26} />} text="Sign-in isn't set up yet on this deploy." />
        ) : authLoading || loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</div>
        ) : !user ? (
          <>
            <EmptyState icon={<Bell size={26} />} text="Sign in to get alerts about your reviews." />
            <Button variant="stay" block onClick={() => navigate('/you/account')}>Sign in or create an account</Button>
          </>
        ) : alerts.length === 0 ? (
          <EmptyState icon={<Bell size={26} />} text="Nothing yet — once a review you submitted or requested has news, it'll show up here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a, idx) =>
              a.kind === 'review'
                ? <ReviewAlert key={`rv-${a.row.id}`} r={a.row} idx={idx} navigate={navigate} />
                : <RequestAlert key={`rq-${a.row.id}`} r={a.row} idx={idx} navigate={navigate} published={published} />
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function AlertCard({ idx, clickable, onClick, icon, iconColor, children, date }) {
  return (
    <div
      className={clickable ? 'rise card-lift glass-card' : 'rise glass-card'}
      onClick={clickable ? onClick : undefined}
      style={{
        '--i': Math.min(idx + 1, 8),
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: 15, cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <span className="stamp-in" style={{ animationDelay: `${250 + Math.min(idx, 6) * 70}ms`, flex: 'none', color: iconColor, marginTop: 1 }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-strong)' }}>{children}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
          {new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

function ReviewAlert({ r, idx, navigate }) {
  const villa = villas.find((v) => v.id === r.villa_id);
  const propertyName = r.property_name || (villa ? villa.name : null) || 'that property';
  const approved = r.status === 'approved';
  const clickable = Boolean(villa || r.property_link);
  const handleClick = () => {
    if (villa) navigate(`/villa/${villa.id}`);
    else if (r.property_link) window.open(r.property_link, '_blank', 'noopener');
  };
  return (
    <AlertCard
      idx={idx} clickable={clickable} onClick={handleClick} date={r.moderated_at || r.created_at}
      icon={approved ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
      iconColor={approved ? 'var(--stay-600)' : 'var(--nay-600)'}
    >
      Your review of <strong>{propertyName}</strong> was {approved ? 'approved' : 'rejected'}.
    </AlertCard>
  );
}

function RequestAlert({ r, idx, navigate, published }) {
  const fulfilled = r.status === 'fulfilled';
  // Link the alert straight to the published review when the listing URLs
  // line up — that's the whole point of the notification.
  const match = fulfilled ? published.find((v) => sameListing(r.property_link, v.propertyLink)) : null;
  const label = r.property_name || match?.name || 'the villa you asked about';
  const clickable = Boolean(match || r.property_link);
  const handleClick = () => {
    if (match) navigate(`/villa/${match.id}`);
    else if (r.property_link) window.open(r.property_link, '_blank', 'noopener');
  };
  return (
    <AlertCard
      idx={idx} clickable={clickable} onClick={handleClick} date={r.updated_at || r.created_at}
      icon={fulfilled ? <ClipboardCheck size={20} /> : <XCircle size={20} />}
      iconColor={fulfilled ? 'var(--stay-600)' : 'var(--nay-600)'}
    >
      {fulfilled ? (
        <>Your requested review of <strong>{label}</strong> is ready{match ? ' — tap to read the verdict.' : '.'}</>
      ) : (
        <>We couldn't fulfil your review request for <strong>{label}</strong>.{r.admin_note ? ` "${r.admin_note}"` : ''}</>
      )}
    </AlertCard>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="rise glass-card" style={{ '--i': 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '36px 20px' }}>
      <span className="empty-breath" style={{ color: 'var(--text-faint)' }}>{icon}</span>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: 280 }}>{text}</p>
    </div>
  );
}
