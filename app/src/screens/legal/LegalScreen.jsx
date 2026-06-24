import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, Cookie, ChevronRight } from 'lucide-react';
import { Header } from '../../components/shared';

const DOCS = [
  { to: '/you/legal/privacy', Icon: ShieldCheck, label: 'Privacy Policy', hint: 'What we collect and why' },
  { to: '/you/legal/terms', Icon: FileText, label: 'Terms of Service', hint: 'The rules of using StayOrNay' },
  { to: '/you/legal/cookies', Icon: Cookie, label: 'Cookie Policy', hint: 'Cookies and similar tech' },
];

/**
 * Legal — hub linking to the three policy documents.
 */
export function LegalScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Legal" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {DOCS.map(({ to, Icon, label, hint }, i) => (
            <div
              key={to}
              onClick={() => navigate(to)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderTop: i ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' }}
            >
              <Icon size={20} color="var(--text-muted)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)', marginTop: 1 }}>{hint}</div>
              </div>
              <ChevronRight size={18} color="var(--text-faint)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
