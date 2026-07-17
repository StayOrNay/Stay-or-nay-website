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
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Settings" onBack={() => navigate('/you')} />
      <div style={{ padding: 18, maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="rise glass-card" style={{ '--i': 0, overflow: 'hidden' }}>
          {ROWS.map(({ Icon, label, hint, to }, i) => (
            <div
              key={label}
              className="nav-row"
              onClick={() => navigate(to)}
              style={{ borderTop: i ? '1px solid var(--border-soft)' : 'none' }}
            >
              <span className="row-icon"><Icon size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</div>
              </div>
              <span className="row-chevron"><ChevronRight size={18} /></span>
            </div>
          ))}
        </div>

        {user && (
          <div className="rise" style={{ '--i': 1 }}>
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
