import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Link2, AlertCircle, Clock, CheckCircle2, XCircle, HandHeart, Star } from 'lucide-react';
import { Button, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import {
  fetchOpenReviewRequests,
  fetchMyClaims,
  claimReviewRequest,
  withdrawClaim,
} from '../lib/reviewRequests';

const CLAIM_META = {
  pending: { label: 'Waiting on confirmation', tone: 'sun', Icon: Clock },
  approved: { label: "You're confirmed", tone: 'stay', Icon: CheckCircle2 },
  rejected: { label: 'Went to someone else', tone: 'nay', Icon: XCircle },
  withdrawn: { label: 'Withdrawn', tone: 'neutral', Icon: XCircle },
};

/**
 * Open requests — the community board. Everything someone has asked us to
 * go review and nobody's been handed yet, and a button to put your hand up
 * for one.
 *
 * Taking a request here is an application, not an assignment: the claim
 * lands as 'pending' and the request stays on the board until Alexander
 * confirms the person (Profile → Review requests). That's deliberate —
 * the whole value of a StayOrNay verdict is that we know who wrote it, so
 * a stranger can't self-serve their way onto a property. The copy on this
 * screen says so plainly rather than letting people think they're done.
 */
export function OpenRequestsScreen() {
  const navigate = useNavigate();
  const { configured, user, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFormId, setOpenFormId] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: reqs }, { data: mine }] = await Promise.all([
        fetchOpenReviewRequests(),
        fetchMyClaims(user.id),
      ]);
      if (cancelled) return;
      setRequests(reqs || []);
      setClaims(mine || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Claim lookup by request, so each card knows whether this is a fresh
  // request, one you're waiting on, or one you already lost.
  const claimByRequest = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      map[c.request_id] = c;
    });
    return map;
  }, [claims]);

  // You can't review the property you asked someone else to go review.
  const board = useMemo(
    () => requests.filter((r) => r.user_id !== user?.id),
    [requests, user],
  );

  const liveClaims = claims.filter((c) => c.status === 'pending' || c.status === 'approved');

  const handleClaim = async (request) => {
    setBusyId(request.id);
    setError(null);
    const { data, error: claimErr } = await claimReviewRequest({
      requestId: request.id,
      userId: user.id,
      displayName: user.user_metadata?.display_name || user.email,
      message: messageDraft.trim(),
    });
    setBusyId(null);
    if (claimErr) {
      setError(claimErr.message);
      return;
    }
    setClaims((prev) => [data, ...prev]);
    setOpenFormId(null);
    setMessageDraft('');
  };

  const handleWithdraw = async (claim) => {
    setBusyId(claim.request_id);
    const { data, error: withdrawErr } = await withdrawClaim(claim.id);
    setBusyId(null);
    if (!withdrawErr && data) {
      setClaims((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    }
  };

  return (
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Open requests" onBack={() => navigate('/review')} />
      <div style={{ padding: 18, maxWidth: 620, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 48 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          These are places people have asked us to go look at. Take one and we'll get in touch —
          <strong> a request is only yours once we've confirmed you</strong>, so nothing is assigned the
          second you tap.
        </p>

        {!configured ? (
          <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
            Sign-in isn't set up yet on this deploy, so the request board isn't live right now.
          </Notice>
        ) : !user ? (
          <>
            <Notice icon={<AlertCircle size={20} color="var(--warning)" />}>
              You need an account to take a request — we confirm every reviewer before handing one over.
            </Notice>
            <Button variant="stay" block onClick={() => navigate('/you/account')}>Sign in or create an account</Button>
          </>
        ) : authLoading || loading ? (
          <Loading />
        ) : (
          <>
            {liveClaims.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="hud-label"><span className="hud-live-dot" /> Your claims</div>
                {liveClaims.map((c, idx) => {
                  const meta = CLAIM_META[c.status] || CLAIM_META.pending;
                  const req = requests.find((r) => r.id === c.request_id);
                  return (
                    <div key={c.id} className="rise glass-card" style={{ '--i': Math.min(idx, 6), padding: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req?.property_name || req?.property_link || 'Request'}
                        </span>
                        <Tag tone={meta.tone} iconLeft={<meta.Icon size={12} />}>{meta.label}</Tag>
                      </div>
                      {c.status === 'pending' && (
                        <>
                          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            We're checking you over before handing this one across. You'll see it here the moment it's confirmed.
                          </p>
                          <div>
                            <Button variant="neutral" size="sm" disabled={busyId === c.request_id} onClick={() => handleWithdraw(c)}>
                              Withdraw
                            </Button>
                          </div>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <>
                          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
                            It's yours — go take an honest look, then write it up.
                          </p>
                          <div>
                            <Button variant="stay" size="sm" iconLeft={<Star size={15} />} onClick={() => navigate('/write-review')}>
                              Write the review
                            </Button>
                          </div>
                        </>
                      )}
                      {c.admin_note && (
                        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
                          From us: {c.admin_note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="hud-label">{board.length} open {board.length === 1 ? 'request' : 'requests'}</div>

              {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                  <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
                </div>
              )}

              {board.length === 0 ? (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '36px 20px' }}>
                  <ClipboardList size={26} color="var(--text-faint)" />
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
                    Nothing open right now — check back soon.
                  </p>
                </div>
              ) : (
                board.map((r, idx) => {
                  const claim = claimByRequest[r.id];
                  const claimed = claim && claim.status !== 'withdrawn';
                  const formOpen = openFormId === r.id;
                  const busy = busyId === r.id;
                  return (
                    <div key={r.id} className="rise card-lift glass-card" style={{ '--i': Math.min(idx, 6), padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>
                          {r.property_name || 'Untitled property'}
                        </div>
                        <a href={r.property_link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-link)', marginTop: 2, wordBreak: 'break-all' }}>
                          <Link2 size={12} style={{ flex: 'none' }} /> {r.property_link}
                        </a>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)', marginTop: 4 }}>
                          Asked {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {r.location ? ` · ${r.location}` : ''}
                          {r.check_in || r.check_out ? ` · ${r.check_in || '?'} → ${r.check_out || '?'}` : ''}
                        </div>
                      </div>

                      {r.notes && (
                        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.5 }}>{r.notes}</p>
                      )}

                      {claimed ? (
                        <Tag tone={(CLAIM_META[claim.status] || CLAIM_META.pending).tone}>
                          {(CLAIM_META[claim.status] || CLAIM_META.pending).label}
                        </Tag>
                      ) : formOpen ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <textarea
                            rows={3}
                            autoFocus
                            placeholder="Why you? Where you are, when you could go, anything that helps us confirm you (optional)."
                            value={messageDraft}
                            onChange={(e) => setMessageDraft(e.target.value)}
                            style={{
                              resize: 'vertical', padding: 10, borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-default)', background: 'var(--surface-page)',
                              fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-strong)', lineHeight: 1.45,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="stay" size="sm" disabled={busy} onClick={() => handleClaim(r)}>
                              {busy ? 'Sending…' : 'Send claim'}
                            </Button>
                            <Button variant="neutral" size="sm" disabled={busy} onClick={() => { setOpenFormId(null); setMessageDraft(''); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Button variant="stay" size="sm" iconLeft={<HandHeart size={15} />} onClick={() => { setOpenFormId(r.id); setMessageDraft(''); }}>
                            Take this request
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</div>;
}

function Notice({ icon, children }) {
  return (
    <div className="rise glass-card" style={{ '--i': 1, padding: 18, display: 'flex', gap: 12 }}>
      <span style={{ flex: 'none', marginTop: 1 }}>{icon}</span>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{children}</p>
    </div>
  );
}
