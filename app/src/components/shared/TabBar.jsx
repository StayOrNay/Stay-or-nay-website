import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, Layers, Heart, PenLine, User } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Explore', Icon: Map },
  { to: '/feed', label: 'Feed', Icon: Layers },
  { to: '/saved', label: 'Saved', Icon: Heart },
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
              <Icon size={22} fill={isActive && label === 'Saved' ? 'currentColor' : 'none'} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
