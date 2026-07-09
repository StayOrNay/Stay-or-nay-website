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
    <nav
      style={{
        display: 'flex',
        height: 64,
        flex: 'none',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-soft)',
        paddingBottom: 4,
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
            color: isActive ? 'var(--brand)' : 'var(--text-faint)',
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
                  background: isActive ? 'var(--brand-soft)' : 'transparent',
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
