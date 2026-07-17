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
        margin: '0 10px 8px',
        borderRadius: 20,
        // Dark glass, matching Explore's dock and the night screens — the
        // one piece of chrome that's visible everywhere, so it sets the tone.
        background: 'rgba(12,23,20,0.72)',
        backdropFilter: 'blur(16px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 14px 34px -12px rgba(0,0,0,0.6)',
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
            color: isActive ? 'var(--stay-400)' : 'rgba(214,220,214,0.6)',
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
                  background: isActive ? 'rgba(26,160,107,0.22)' : 'transparent',
                  boxShadow: isActive ? '0 0 14px rgba(26,160,107,0.35)' : 'none',
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
