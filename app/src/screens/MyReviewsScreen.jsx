import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { villas } from '../data/villas';
import { fetchMyReviews } from '../lib/reviews';
import { MAX_TOTAL } from '../lib/reviewScore';

const STATUS_META = {
  pending: { label: 'Pending', tone: 'sun', Icon: Clock },
  approved: { label: 'Approved', tone: 'stay', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', tone: 'nay', Icon: XCircle },
};

/**
 * "Your reviews" — every review the signed-in user has submitted, in any
 * status, newest first. Entry point for writing a new one.
 */
export function MyReviewsScreen() {
  const navigate = useNavigate();
  const { configured, user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMyReviews(user.id).then(({ data }) => {
      if (!cancelled) {
        setReviews(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Your reviews" onBack={() => navigate('/you')} />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!configured ? (
          <EmptyState text="Sign-in isn't set up yet on this deploy, so reviews aren't available right now." />
        ) : authLoading || loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</div>
        ) : !user ? (
          <>
            <EmptyState text="Sign in to write and track your villa reviews." />
            <Button variant="stay" block onClick={() => navigate('/you/account')}>Sign in or create an account</Button>
          </>
        ) : (
          <>
            <div className="rise" style={{ '--i': 0 }}>
              <Button variant="stay" block iconLeft={<PenLine size={18} />} onClick={() => navigate('/write-review')}>
                Write a review
              </Button>
            </div>

            {reviews.length === 0 ? (
              <EmptyState text="You haven't reviewed a villa yet. Stayed somewhere recently? Tell us about it." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.map((r, idx) => {
                  const villa = villas.find((v) => v.id === r.villa_id);
                  const propertyName = r.property_name || (villa ? villa.name : null) || 'Untitled property';
                  const meta = STATUS_META[r.status] || STATUS_META.pending;
                  return (
                    <div
                      key={r.id}
                      className="rise card-lift glass-card"
                      style={{
                        '--i': Math.min(idx + 1, 8),
                        padding: 15, display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          {r.property_link ? (
                            <a href={r.property_link} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)', textDecoration: 'none' }}>
                              {propertyName}
                            </a>
                          ) : (
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>
                              {propertyName}
                            </div>
                          )}
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>
                            {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <span key={r.status} className="stamp-in" style={{ animationDelay: `${250 + Math.min(idx, 6) * 70}ms` }}>
                          <Tag tone={meta.tone} iconLeft={<meta.Icon size={12} />}>{meta.label}</Tag>
                        </span>
                      </div>
                      {r.headline && (
                        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--text-strong)' }}>
                          "{r.headline}"
                        </p>
                      )}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                        {r.total} / {MAX_TOTAL} points
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rise glass-card" style={{ '--i': 1, padding: 18, textAlign: 'center' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}
