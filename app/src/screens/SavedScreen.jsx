import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Map as MapIcon } from 'lucide-react';
import { VillaCard, Button } from '../components/core';
import { Header } from '../components/shared';
import { villas } from '../data/villas';
import { useSaved } from '../context/SavedContext';

/**
 * Saved — shortlist of saved villas, with an empty state.
 */
export function SavedScreen() {
  const navigate = useNavigate();
  const { saved, toggleSave } = useSaved();
  const savedVillas = villas.filter((v) => saved.has(v.id));

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Saved villas" />
      {savedVillas.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 32px', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--paper-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
            <Heart size={28} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>No villas saved yet</div>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', maxWidth: 240, lineHeight: 1.5 }}>
            Go find one worth the flight. Tap the heart on any verdict to shortlist it.
          </p>
          <Button variant="stay" onClick={() => navigate('/')} iconLeft={<MapIcon size={18} />}>Explore the map</Button>
        </div>
      ) : (
        <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            {savedVillas.length} on your shortlist
          </div>
          {savedVillas.map((v) => (
            <VillaCard
              key={v.id}
              name={v.name} location={v.location} coords={v.coords} image={v.image}
              verdict={v.verdict} score={v.score} rating={v.rating}
              price={v.price} currency={v.currency} tags={v.tags}
              saved={true} onToggleSave={() => toggleSave(v.id)} onClick={() => navigate(`/villa/${v.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
