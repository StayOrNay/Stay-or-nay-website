import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, PenLine, ChevronRight } from 'lucide-react';
import { Header } from '../components/shared';

/**
 * Review — the single "Review" tab's landing screen. Write and Request
 * used to be two separate nav tabs; merging them behind one entry keeps
 * the nav clean, and this screen is just the fork in the road: did you
 * stay somewhere yourself (write), or do you want us to go for you
 * (request)?
 */
const OPTIONS = [
  {
    to: '/write-review',
    Icon: Star,
    title: 'Write a review',
    text: 'Stayed somewhere yourself? Score it across five categories, add your photos and videos, and give it a Stay or a Nay.',
  },
  {
    to: '/request-review',
    Icon: PenLine,
    title: 'Request a review',
    text: "Thinking about booking? Paste the listing link and we'll go take an honest look for you — free, verdict back in about 3 days.",
  },
];

export function ReviewHubScreen() {
  const navigate = useNavigate();
  return (
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Review" />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 48 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Been there yourself, or want us to go for you?
        </p>
        {OPTIONS.map((o, i) => (
          <button
            key={o.to}
            type="button"
            onClick={() => navigate(o.to)}
            className="rise card-lift holo-card"
            style={{
              '--i': i + 1,
              display: 'flex', alignItems: 'center', gap: 16, padding: 20,
              border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%',
              background: 'transparent',
            }}
          >
            <span
              style={{
                flex: 'none', width: 48, height: 48, borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--brand-soft)', color: 'var(--brand)',
              }}
            >
              <o.Icon size={24} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-strong)' }}>{o.title}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{o.text}</span>
            </span>
            <ChevronRight size={20} style={{ flex: 'none', color: 'var(--text-faint)' }} />
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
