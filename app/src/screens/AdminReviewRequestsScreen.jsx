import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Link2 } from 'lucide-react';
import { Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { fetchAllReviewRequests, updateReviewRequestStatus } from '../lib/reviewRequests';

const STATUSES = ['open', 'in_progress', 'fulfilled', 'declined'];
const STATUS_TONE = { open: 'sun', in_progress: 'sun', fulfilled: 'stay', declined: 'nay' };

/**
 * Admin-only queue for "Request a review" — every request anyone has sent
 * in, oldest first. Alexander moves each one through open → in_progress →
 * fulfilled/declined and can leave a short note back to the requester
 * (e.g. a link to the review once it's published). Gated on lib/admin.js's
 * hardcoded email, also enforced server-side by Supabase RLS.
 */
export function AdminReviewRequestsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

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
    const { data } = await fetchAllReviewRequests();
    setRequests(data || []);
    setLoading(false);
  };

  const setNote = (id, value) => setNoteDrafts((prev) => ({ ...prev, [id]: value }));

  const setStatus = async (id, status) => {
    setBusyId(id);
    const { data, error } = await updateReviewRequestStatus(id, status, noteDrafts[id]);
    setBusyId(null);
    if (!error && data) setRequests((prev) => prev.map((r) => (r.id === id ? data : r)));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Review requests" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {authLoading ? (
          <Loading />
        ) : !admin ? (
          <Notice>This page is only for the StayOrNay team.</Notice>
        ) : loading ? (
          <Loading />
        ) : requests.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '36px 20px', background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)' }}>
            <ClipboardList size={26} color="var(--text-faint)" />
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>No requests yet.</p>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              {requests.length} total
            </div>
            {requests.map((r) => {
              const busy = busyId === r.id;
              return (
                <div key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>
                        {r.property_name || 'Untitled property'}
                      </div>
                      <a href={r.property_link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-link)', marginTop: 2 }}>
                        <Link2 size={12} /> {r.property_link}
                      </a>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)', marginTop: 4 }}>
                        Sent {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        {r.location ? ` · ${r.location}` : ''}
                      </div>
                    </div>
                    <Tag tone={STATUS_TONE[r.status]}>{r.status.replace('_', ' ')}</Tag>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)' }}>
                    {(r.check_in || r.check_out) && (
                      <span>Stay: {r.check_in || '?'} → {r.check_out || '?'}</span>
                    )}
                  </div>

                  {r.notes && (
                    <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.5 }}>{r.notes}</p>
                  )}

                  <textarea
                    rows={2}
                    placeholder="Note back to the requester (optional) — e.g. a link once the review's up"
                    defaultValue={r.admin_note || ''}
                    onChange={(e) => setNote(r.id, e.target.value)}
                    style={{
                      resize: 'vertical', padding: 10, borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)', background: 'var(--surface-page)',
                      fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-strong)', lineHeight: 1.45,
                    }}
                  />

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {STATUSES.filter((s) => s !== r.status).map((s) => (
                      <Button key={s} variant={s === 'fulfilled' ? 'stay' : s === 'declined' ? 'nay' : 'neutral'} size="sm" disabled={busy} onClick={() => setStatus(r.id, s)}>
                        Mark {s.replace('_', ' ')}
                      </Button>
                    ))}
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
