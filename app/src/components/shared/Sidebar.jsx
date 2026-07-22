import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Layers, Star, User, Search } from 'lucide-react';

// Write + Request live behind ONE "Review" entry (they fork on /review).
// The `also` list keeps the entry lit while inside either flow.
const NAV_ITEMS = [
  { to: '/', label: 'Explore', Icon: Map },
  { to: '/feed', label: 'Feed', Icon: Layers },
  { to: '/check', label: 'Check a villa', Icon: Search },
  { to: '/review', label: 'Review', Icon: Star, also: ['/write-review', '/request-review'] },
  { to: '/you', label: 'You', Icon: User },
];

/**
 * Desktop left nav — replaces the bottom TabBar above the desktop
 * breakpoint, where a fixed bottom bar reads as a leftover mobile habit
 * instead of a real website. Same four destinations, same active-state
 * logic, just reflowed for a wide canvas with room to spare.
 */
export function Sidebar({ onLogoClick }) {
  const { pathname } = useLocation();
  return (
    <nav
      style={{
        flex: 'none',
        width: 232,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '28px 14px',
        background: 'rgba(255,255,255,0.55)',
        borderRight: '1px solid var(--border-soft)',
      }}
    >
      <button
        type="button"
        onClick={onLogoClick}
        aria-label="Replay the StayOrNay intro"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 19,
          letterSpacing: '-0.01em',
          padding: '0 12px',
          marginBottom: 22,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          width: 'fit-content',
        }}
      >
        <span style={{ color: 'var(--stay-600)' }}>Stay</span>
        <span style={{ color: 'var(--ink-400)' }}>Or</span>
        <span style={{ color: 'var(--nay-600)' }}>Nay</span>
      </button>

      {NAV_ITEMS.map(({ to, label, Icon, also }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive: navActive }) => {
            const isActive = navActive || (also || []).includes(pathname);
            return ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 12px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 15,
            color: isActive ? 'var(--brand)' : 'var(--text-muted)',
            background: isActive ? 'var(--brand-soft)' : 'transparent',
          });
          }}
        >
          {({ isActive: navActive }) => {
            const isActive = navActive || (also || []).includes(pathname);
            return (
              <>
                <Icon size={20} fill={isActive && label === 'Saved' ? 'currentColor' : 'none'} />
                {label}
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
