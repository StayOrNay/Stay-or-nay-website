import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown } from 'lucide-react';
import { VillaCard } from '../components/core';
import { Header } from '../components/shared';
import { villas } from '../data/villas';
import { useSaved } from '../context/SavedContext';

/**
 * Feed — a scrollable column of villa verdict cards.
 */
export function FeedScreen() {
  const navigate = useNavigate();
  const { saved, toggleSave } = useSaved();

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header
        title="Verdicts near you"
        right={
          <button aria-label="Sort" style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: 6, color: 'var(--text-strong)' }}>
            <ArrowUpDown size={20} />
          </button>
        }
      />
      <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Honest reviews from verified stayers — the road noise, the dated kitchen, the perfect pool. No sponsored fluff.
        </p>
        {villas.map((v) => (
          <VillaCard
            key={v.id}
            name={v.name}
            location={v.location}
            coords={v.coords}
            image={v.image}
            verdict={v.verdict}
            score={v.score}
            rating={v.rating}
            price={v.price}
            currency={v.currency}
            tags={v.tags}
            saved={saved.has(v.id)}
            onToggleSave={() => toggleSave(v.id)}
            onClick={() => navigate(`/villa/${v.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
