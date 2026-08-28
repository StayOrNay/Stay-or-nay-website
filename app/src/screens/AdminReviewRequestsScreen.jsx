import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Link2, UserCheck, Check, X } from 'lucide-react';
import { Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import {
  fetchAllReviewRequests,
  updateReviewRequestStatus,
  fetchAllClaims,
  approveClaim,
  rejectClaim,
} from '../lib/reviewRequests';

const STATUSES = ['open', 'assigned', 'in_progress', 'fulfilled', 'declined'];
const STATUS_TONE = { open: 'sun', assigned: 'sky', in_progress: 'sun', fulfilled: 'stay', declined: 'nay' };
const CLAIM_TONE = { pending: 'sun', approved: 'stay', rejected: 'nay', withdrawn: 'neutral' };

/**
 * Admin-only queue for "Request a review" — every request anyone has sent
 * in, oldest first. Alexander moves each one through open → in_progress →
 * fulfilled/declined and can leave a short note back to the requester
 * (e.g. a link to the review once it's published). Gated on lib/admin.js's
 * hardcoded email, also enforced server-side by Supabase RLS.
 *
 * It's also the confirmation gate for the community board (/requests):
 * anyone can put their hand up for an open request, but nothing is handed
 * over until it's confirmed here. Confirming assigns the request and turns
 * the other applicants down in the same action, so a request never ends up
 * with two people believing it's theirs.
 */
export function AdminReviewRequestsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [claims, setClaims] = useState([]);
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
    const [{ data: reqs }, { data: allClaims }] = await Promise.all([
      fetchAllReviewRequests(),
      fetchAllClaims(),
    ]);
    setRequests(reqs || []);
    setClaims(allClaims || []);
    setLoading(false);
  };

  const setNote = (id, value) => setNoteDrafts((prev) => ({ ...prev, [id]: value }));

  const setStatus = async (id, status) => {
    setBusyId(id);
    const { data, error } = await updateReviewRequestStatus(id, status, noteDrafts[id]);
    setBusyId(null);
    if (!error && data) setRequests((prev) => prev.map((r) => (r.id === id ? data : r)));
  };

  // Confirming touches the request and several claims at once, so this
  // reloads rather than patching state by hand — the losing claims flip to
  // rejected server-side and there's no honest way to guess that locally.
  const confirmClaim = async (claim) => {
    setBusyId(claim.id);
    const { error } = await approveClaim(claim);
    setBusyId(null);
    if (!error) load();
  };

  const declineClaim = async (claim) => {
    setBusyId(claim.id);
    const { data, error } = await rejectClaim(claim.id);
    setBusyId(null);
    if (!error && data) setClaims((prev) => prev.map((c) => (c.id === data.id ? data : c)));
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
              {requests.length} total · {claims.filter((c) => c.status === 'pending').length} waiting on you
            </div>
            {requests.map((r) => {
              const busy = busyId === r.id;
              const myClaims = claims.filter((c) => c.request_id === r.id && c.status !== 'withdrawn');
              const pending = myClaims.filter((c) => c.status === 'pending');
              const approved = myClaims.find((c) => c.status === 'approved');
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

                  {/* Who put their hand up. Nobody here has the request yet —
                      confirming one of them is what hands it over. */}
                  {myClaims.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                        <UserCheck size={13} />
                        {approved ? 'Confirmed reviewer' : `${pending.length} want${pending.length === 1 ? 's' : ''} this one`}
                      </div>
                      {myClaims.map((c) => {
                        const claimBusy = busyId === c.id;
                        return (
                          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-page)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.display_name || c.user_id}
                              </span>
                              <Tag tone={CLAIM_TONE[c.status]}>{c.status}</Tag>
                            </div>
                            {c.message && (
                              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>{c.message}</p>
                            )}
                            {c.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Button variant="stay" size="sm" disabled={claimBusy} iconLeft={<Check size={14} />} onClick={() => confirmClaim(c)}>
                                  Confirm {c.display_name ? c.display_name.split(' ')[0] : 'them'}
                                </Button>
                                <Button variant="nay" size="sm" disabled={claimBusy} iconLeft={<X size={14} />} onClick={() => declineClaim(c)}>
                                  Turn down
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
