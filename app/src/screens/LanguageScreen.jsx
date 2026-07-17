import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Header } from '../components/shared';
import { useLanguage } from '../context/LanguageContext';

/**
 * Language — English-only for now. The list and storage already support
 * more languages; turning one on later is just flipping `available: true`
 * in LanguageContext once it actually has translated copy behind it,
 * rather than rebuilding this screen from scratch.
 */
export function LanguageScreen() {
  const navigate = useNavigate();
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Language" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          More languages are on the way. For now, StayOrNay is available in English.
        </p>
        <div className="rise" style={{ '--i': 1, background: 'var(--surface-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {languages.map((lang, i) => {
            const selected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                disabled={!lang.available}
                className={lang.available ? 'nav-row' : undefined}
                onClick={() => setLanguage(lang.code)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '15px 16px', border: 'none', background: 'transparent',
                  borderTop: i ? '1px solid var(--border-soft)' : 'none',
                  cursor: lang.available ? 'pointer' : 'default',
                  opacity: lang.available ? 1 : 0.45,
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-strong)' }}>
                  {lang.name}
                </span>
                {!lang.available && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                    Coming soon
                  </span>
                )}
                {selected && <span key={language} className="stamp-in"><Check size={18} color="var(--brand)" /></span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
