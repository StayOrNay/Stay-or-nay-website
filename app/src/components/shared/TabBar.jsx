import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, Layers, PenLine, Star, User } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Explore', Icon: Map },
  { to: '/feed', label: 'Feed', Icon: Layers },
  { to: '/write-review', label: 'Write', Icon: Star },
  { to: '/request-review', label: 'Request', Icon: PenLine },
  { to: '/you', label: 'You', Icon: User },
];

/**
 * Fixed bottom tab bar: Explore · Feed · Saved · You.
 */
export function TabBar() {
  return (
    // A floating glass dock rather than an edge-to-edge bar — sits inside
    // the 64px slot AppShell reserves, with breathing room on three sides
    // so it reads as chrome floating over the app, not a wall under it.
    <nav
      style={{
        display: 'flex',
        height: 56,
        flex: 'none',
        // Sit as low as possible: a slim 4px gap, plus whatever safe-area
        // inset the phone reports (home-indicator area on iPhones — the
        // viewport-fit=cover meta in index.html makes the shell extend
        // under it, and this margin keeps the dock tappable above it).
        margin: '0 10px',
        marginBottom: 'calc(2px + max(env(safe-area-inset-bottom, 0px) - 6px, 0px))',
        borderRadius: 20,
        // Bright sunlit glass — the one piece of chrome visible everywhere,
        // so it sets the (happy) tone.
        background: 'rgba(255,253,247,0.85)',
        backdropFilter: 'blur(16px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
        border: '1px solid rgba(12,23,20,0.08)',
        boxShadow: '0 12px 30px -12px rgba(12,23,20,0.3)',
      }}
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            color: isActive ? 'var(--stay-600)' : 'var(--text-faint)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 11,
            textDecoration: 'none',
          })}
        >
          {({ isActive }) => (
            <>
              {/* Active tab gets a soft brand pill behind the icon, with a
                  small pop (transform, not layout) on activation. */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 42,
                  height: 26,
                  borderRadius: 'var(--radius-pill)',
                  background: isActive ? 'var(--stay-100)' : 'transparent',
                  boxShadow: isActive ? '0 0 14px rgba(26,160,107,0.3)' : 'none',
                  transform: isActive ? 'translateY(-1px)' : 'none',
                  transition: 'background var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-pop)',
                }}
              >
                <Icon size={21} fill={isActive && label === 'Saved' ? 'currentColor' : 'none'} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
