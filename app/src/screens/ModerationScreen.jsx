import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Check, X, Image as ImageIcon } from 'lucide-react';
import { Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { villas } from '../data/villas';
import { fetchPendingReviews, moderateReview } from '../lib/reviews';
import { MAX_TOTAL, CATEGORIES } from '../lib/reviewScore';

/**
 * Moderation queue — admin-only (gated on lib/admin.js's hardcoded email,
 * also enforced server-side by Supabase RLS so this isn't just a hidden
 * route). Every pending review, full content + media, Approve/Reject.
 */
export function ModerationScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const admin = isAdmin(user);

  useEffect(() => {
    if (!admin) {
      setLoading(false);
      return;
    }
    load();
  }, [admin]);

  const load = async () => {
    setLoading(true);
    const { data } = await fetchPendingReviews();
    setReviews(data || []);
    setLoading(false);
  };

  const decide = async (id, status) => {
    setBusyId(id);
    const { error } = await moderateReview(id, status);
    setBusyId(null);
    if (!error) setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Moderate reviews" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {authLoading ? (
          <Loading />
        ) : !admin ? (
          <Notice>This page is only for the StayOrNay team.</Notice>
        ) : loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '36px 20px', background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)' }}>
            <ShieldCheck size={26} color="var(--text-faint)" />
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>Queue's empty — nothing waiting on you.</p>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              {reviews.length} pending
            </div>
            {reviews.map((r) => {
              const villa = villas.find((v) => v.id === r.villa_id);
              const busy = busyId === r.id;
              return (
                <div key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-strong)' }}>
                        {villa ? villa.name : r.villa_id}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>
                        Submitted {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <Tag tone={r.verdict === 'stay' ? 'stay' : 'nay'}>{r.total} / {MAX_TOTAL} · {r.verdict.toUpperCase()}</Tag>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.map((c) => (
                      <Tag key={c.key} variant="outline">{c.label}: {r[`score_${c.key}`]}</Tag>
                    ))}
                  </div>

                  {r.headline && (
                    <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>"{r.headline}"</p>
                  )}
                  {r.body && (
                    <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-body)', lineHeight: 1.55 }}>{r.body}</p>
                  )}

                  {Array.isArray(r.media_urls) && r.media_urls.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {r.media_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-link)' }}>
                          <ImageIcon size={14} /> Media {i + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <Button variant="stay" size="sm" disabled={busy} iconLeft={<Check size={16} />} onClick={() => decide(r.id, 'approved')}>
                      Approve
                    </Button>
                    <Button variant="nay" size="sm" disabled={busy} iconLeft={<X size={16} />} onClick={() => decide(r.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
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
