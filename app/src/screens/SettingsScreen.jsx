import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, Globe, ScrollText, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../context/LanguageContext';

/**
 * Settings — umbrella screen for Account, Language, and Legal, so they're
 * reachable both as quick rows on the You tab and grouped here the way most
 * apps group "settings."
 */
export function SettingsScreen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const currentLanguageName = LANGUAGES.find((l) => l.code === language)?.name ?? 'English';

  const ROWS = [
    { Icon: UserRound, label: 'Account', hint: user ? user.email : 'Sign in or create an account', to: '/you/account' },
    { Icon: Globe, label: 'Language', hint: currentLanguageName, to: '/you/language' },
    { Icon: ScrollText, label: 'Legal', hint: 'Privacy, terms, cookies', to: '/you/legal' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/you');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Settings" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {ROWS.map(({ Icon, label, hint, to }, i) => (
            <div
              key={label}
              onClick={() => navigate(to)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderTop: i ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' }}
            >
              <Icon size={20} color="var(--text-muted)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</div>
              </div>
              <ChevronRight size={18} color="var(--text-faint)" />
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
