import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, PenLine, Bell, Settings, UserRound, Globe, ScrollText, ChevronRight, ShieldCheck, ClipboardList, MapPin, LogOut } from 'lucide-react';
import { Avatar, Tag, Button } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';

const BASE_ROWS = [
  { Icon: Heart, label: 'Saved', to: '/saved' },
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
        { Icon: MapPin, label: 'Edit published reviews', to: '/you/manage' },
        { Icon: ClipboardList, label: 'Review requests', to: '/you/review-requests' },
      ]
    : BASE_ROWS;

  const handleSignOut = async () => {
    await signOut();
    navigate('/you');
  };

  return (
    <div className="hud-screen" data-theme="night">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
        <Header title="You" />
        {/* Capped + centered rather than stretched edge-to-edge once the
            shell is wide — a settings list stretched to 1400px reads worse
            than one left at a comfortable reading width. */}
        <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {user ? (
            <div className="rise holo-card" style={{ '--i': 0, display: 'flex', alignItems: 'center', gap: 16, padding: 18 }}>
              <span className="glow-ring"><Avatar name={user.email} size="lg" verified={Boolean(user.email_confirmed_at)} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="hud-label" style={{ marginBottom: 5 }}>Traveler · online</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
                <div className="stamp-in" style={{ marginTop: 6, animationDelay: '350ms' }}><Tag variant="outline" tone="stay">Signed in</Tag></div>
              </div>
            </div>
          ) : (
            <div className="rise holo-card" style={{ '--i': 0, display: 'flex', alignItems: 'center', gap: 16, padding: 18 }}>
              <span className="glow-ring"><Avatar name="Guest" size="lg" /></span>
              <div style={{ flex: 1 }}>
                <div className="hud-label" style={{ marginBottom: 5 }}>Guest mode</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--text-strong)' }}>Guest</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {configured ? 'Sign in to save your verdicts everywhere.' : 'Browsing without an account.'}
                </div>
              </div>
              <Button variant="stay" size="sm" onClick={() => navigate('/you/account')}>Sign in</Button>
            </div>
          )}
          <div className="rise hud-label" style={{ '--i': 1 }}>Control panel</div>
          <div className="rise glass-card" style={{ '--i': 1, overflow: 'hidden', marginTop: -8 }}>
            {ROWS.map(({ Icon, label, to }, i) => (
              <div
                key={label}
                className="nav-row"
                onClick={to ? () => navigate(to) : undefined}
                style={{ borderTop: i ? '1px solid var(--border-soft)' : 'none', cursor: to ? 'pointer' : 'default' }}
              >
                <span className="row-icon"><Icon size={20} /></span>
                <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>{label}</span>
                {to && <span className="row-chevron"><ChevronRight size={18} /></span>}
              </div>
            ))}
          </div>
          {user && (
            <div className="rise" style={{ '--i': 2 }}>
              <Button variant="neutral" block iconLeft={<LogOut size={18} />} onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
