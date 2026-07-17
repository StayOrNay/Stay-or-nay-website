import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { villas } from '../data/villas';
import { fetchMyReviews } from '../lib/reviews';

/**
 * Verdict alerts — a feed of "your review got a verdict" notifications:
 * fires when one of your own submitted reviews is approved or rejected by
 * moderation. There's no separate notifications table; this just re-reads
 * your own reviews and shows the ones that have already been moderated,
 * newest decision first.
 */
export function VerdictAlertsScreen() {
  const navigate = useNavigate();
  const { configured, user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMyReviews(user.id).then(({ data }) => {
      if (cancelled) return;
      const decided = (data || [])
        .filter((r) => r.status === 'approved' || r.status === 'rejected')
        .sort((a, b) => new Date(b.moderated_at || b.created_at) - new Date(a.moderated_at || a.created_at));
      setAlerts(decided);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="hud-screen" data-theme="night">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Verdict alerts" onBack={() => navigate('/you')} />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.5 }}>
          You'll see one of these every time a review you submitted gets approved or rejected.
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
          <EmptyState icon={<Bell size={26} />} text="Nothing yet — once a review you submitted is approved or rejected, it'll show up here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((r, idx) => {
              const villa = villas.find((v) => v.id === r.villa_id);
              const propertyName = r.property_name || (villa ? villa.name : null) || 'that property';
              const approved = r.status === 'approved';
              const clickable = Boolean(villa || r.property_link);
              const handleClick = () => {
                if (villa) navigate(`/villa/${villa.id}`);
                else if (r.property_link) window.open(r.property_link, '_blank', 'noopener');
              };
              return (
                <div
                  key={r.id}
                  className={clickable ? 'rise card-lift glass-card' : 'rise glass-card'}
                  onClick={clickable ? handleClick : undefined}
                  style={{
                    '--i': Math.min(idx + 1, 8),
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: 15, cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <span className="stamp-in" style={{ animationDelay: `${250 + Math.min(idx, 6) * 70}ms`, flex: 'none', color: approved ? 'var(--stay-600)' : 'var(--nay-600)', marginTop: 1 }}>
                    {approved ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-strong)' }}>
                      Your review of <strong>{propertyName}</strong> was {approved ? 'approved' : 'rejected'}.
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
                      {new Date(r.moderated_at || r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
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
