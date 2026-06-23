import React from 'react';
import { Compass, PenLine, Bell, Settings, ChevronRight } from 'lucide-react';
import { Avatar, Tag } from '../components/core';
import { Header } from '../components/shared';

const ROWS = [
  { Icon: Compass, label: 'Trips' },
  { Icon: PenLine, label: 'Your reviews' },
  { Icon: Bell, label: 'Verdict alerts' },
  { Icon: Settings, label: 'Settings' },
];

/**
 * You — simple profile + settings list.
 */
export function ProfileScreen() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="You" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name="Sam Okafor" size="lg" verified />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>Sam Okafor</div>
            <div style={{ marginTop: 4 }}><Tag variant="outline" tone="stay">12 verdicts written</Tag></div>
          </div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {ROWS.map(({ Icon, label }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderTop: i ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' }}>
              <Icon size={20} color="var(--text-muted)" />
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>{label}</span>
              <ChevronRight size={18} color="var(--text-faint)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
