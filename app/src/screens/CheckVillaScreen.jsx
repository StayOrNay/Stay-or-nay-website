import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Link2, PenLine, SearchX, CheckCircle2 } from 'lucide-react';
import { Input, Button, VillaCard } from '../components/core';
import { Header } from '../components/shared';
import { useVillasWithReviews } from '../hooks/useVillasWithReviews';
import { useSaved } from '../context/SavedContext';
import { findListingMatch } from '../lib/listingMatch';

/**
 * Check a villa — paste the listing link (Booking.com, Airbnb, Vrbo, the
 * villa's own site…) or type its name, and instantly see whether we've
 * already reviewed it. Found → the review card, one tap from the full
 * verdict. Not found → straight into "Request a review" with the link
 * already filled in, closing the loop: every miss becomes a request.
 */
export function CheckVillaScreen() {
  const navigate = useNavigate();
  const villas = useVillasWithReviews();
  const { saved, toggleSave } = useSaved();

  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');

  const match = useMemo(
    () => (searched ? findListingMatch(searched, villas) : null),
    [searched, villas],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearched(query.trim());
  };

  const looksLikeUrl = /[./]/.test(searched);

  return (
    <div className="hud-screen">
      <div className="hud-aurora"><div className="hud-grid" /></div>
      <div className="hud-content">
      <Header title="Check a villa" onBack={() => navigate(-1)} />
      <div style={{ padding: 18, maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>
        <p className="rise" style={{ '--i': 0, margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          About to book somewhere? Paste the listing link — Booking.com, Airbnb, Vrbo, anywhere — and
          see in one tap whether we've already been there.
        </p>

        <form onSubmit={handleSubmit} className="rise holo-card" style={{ '--i': 1, display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
          <div className="hud-label">Listing lookup</div>
          <Input
            label="Listing link or villa name"
            placeholder="Paste the Booking.com / Airbnb link…"
            iconLeft={<Link2 size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="stay" block size="lg" disabled={!query.trim()} iconLeft={<Search size={18} />}>
            Check this villa
          </Button>
        </form>

        {searched && match && (
          <div className="rise" style={{ '--i': 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--stay-600)' }}>
              <span className="stamp-in"><CheckCircle2 size={18} /></span>
              We've reviewed this one — here's our verdict.
            </div>
            <div className="explore-enter-card card-lift" style={{ borderRadius: 'var(--radius-lg)' }}>
              <VillaCard
                name={match.name} location={match.location} coords={match.coords} image={match.image}
                verdict={match.verdict} score={match.score} scoreOutOf={match.scoreOutOf} rating={match.rating}
                price={match.price} currency={match.currency} tags={match.tags}
                saved={saved.has(match.id)} onToggleSave={() => toggleSave(match.id)}
                onClick={() => navigate(`/villa/${match.id}`)}
              />
            </div>
          </div>
        )}

        {searched && !match && (
          <div className="rise glass-card" style={{ '--i': 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '28px 20px' }}>
            <span className="empty-breath" style={{ color: 'var(--text-faint)' }}><SearchX size={26} /></span>
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: 320 }}>
              We haven't reviewed this one yet. Want us to go take a look? It's free, takes about
              3 days, and you'll be notified here on the site when the verdict is in.
            </p>
            <Button
              variant="stay"
              iconLeft={<PenLine size={16} />}
              onClick={() => navigate('/request-review', { state: { propertyLink: looksLikeUrl ? searched : '' } })}
            >
              Request a review of this villa
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
