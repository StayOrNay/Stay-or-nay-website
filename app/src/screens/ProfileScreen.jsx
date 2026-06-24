import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, Bell, Settings, UserRound, Globe, ScrollText, ChevronRight, ShieldCheck, ClipboardList, LogOut } from 'lucide-react';
import { Avatar, Tag, Button } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';

const BASE_ROWS = [
  { Icon: PenLine, label: 'Your reviews', to: '/you/reviews' },
  { Icon: Bell, label: 'Verdict alerts', to: '/you/alerts' },
  { Icon: Settings, label: 'Settings', to: '/you/settings' },
  { Icon: UserRound, label: 'Account', to: '/you/account' },
  { Icon: Globe, label: 'Language', to: '/you/language' },
  { Icon: ScrollText, label: 'Legal', to: '/you/legal' },
];

/**
 * You — profile header (reflects the signed-in account once auth is
 * configured, or a sign-in prompt if not) + the settings list. Signed-in
 * users who match lib/admin.js's allowlist get an extra "Moderate reviews"
 * row — that's the only way the moderation queue is reachable from the UI.
 */
export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, configured, signOut } = useAuth();
  const ROWS = isAdmin(user)
    ? [
        ...BASE_ROWS,
        { Icon: ShieldCheck, label: 'Moderate reviews', to: '/you/moderate' },
        { Icon: ClipboardList, label: 'Review requests', to: '/you/review-requests' },
      ]
    : BASE_ROWS;

  const handleSignOut = async () => {
    await signOut();
    navigate('/you');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="You" />
      {/* Capped + centered rather than stretched edge-to-edge once the
          shell is wide — a settings list stretched to 1400px reads worse
          than one left at a comfortable reading width. */}
      <div style={{ padding: 16, maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={user.email} size="lg" verified={Boolean(user.email_confirmed_at)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
              <div style={{ marginTop: 4 }}><Tag variant="outline" tone="stay">Signed in</Tag></div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name="Guest" size="lg" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>Guest</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {configured ? 'Sign in to save your verdicts everywhere.' : 'Browsing without an account.'}
              </div>
            </div>
            <Button variant="stay" size="sm" onClick={() => navigate('/you/account')}>Sign in</Button>
          </div>
        )}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {ROWS.map(({ Icon, label, to }, i) => (
            <div
              key={label}
              onClick={to ? () => navigate(to) : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderTop: i ? '1px solid var(--border-soft)' : 'none', cursor: to ? 'pointer' : 'default' }}
            >
              <Icon size={20} color="var(--text-muted)" />
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>{label}</span>
              {to && <ChevronRight size={18} color="var(--text-faint)" />}
            </div>
          ))}
        </div>
        {user && (
          <Button variant="neutral" block iconLeft={<LogOut size={18} />} onClick={handleSignOut}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
