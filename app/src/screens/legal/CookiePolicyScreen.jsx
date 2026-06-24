import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/shared';
import { LegalProse } from './LegalProse';

export function CookiePolicyScreen() {
  const navigate = useNavigate();
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Cookie Policy" onBack={() => navigate('/you/legal')} />
      <LegalProse updated="June 24, 2026">
        <p>
          This policy explains how StayOrNay uses cookies and similar browser
          storage (like localStorage), and what choices you have about them.
        </p>

        <h2>1. What these technologies do</h2>
        <p>
          Cookies are small pieces of data a website asks your browser to store.
          We also use localStorage, a similar browser feature that doesn't
          automatically expire or get sent with every request, which is well-suited
          to remembering app preferences without any server round-trip.
        </p>

        <h2>2. What we use, and why</h2>
        <h3>Strictly necessary</h3>
        <p>
          Used to keep you signed in. Supabase, our authentication provider, stores
          a session token (via cookie and/or localStorage) so you don't have to log
          in on every visit. Without this, account features won't work.
        </p>
        <h3>Preferences</h3>
        <p>Stored in localStorage, not sent to any server:</p>
        <ul>
          <li>Your saved villas shortlist.</li>
          <li>Your chosen language.</li>
        </ul>
        <h3>Analytics</h3>
        <p>
          Our hosting provider, Cloudflare, may collect basic, aggregated traffic
          statistics (like page views and approximate location by IP) to help us
          understand site performance. This doesn't rely on tracking cookies tied
          to your identity across other websites.
        </p>

        <h2>3. What we don't use</h2>
        <p>
          We don't use third-party advertising cookies, and we don't sell or share
          browsing data with ad networks.
        </p>

        <h2>4. Managing cookies</h2>
        <p>
          Most browsers let you block or delete cookies in their settings. Doing so
          may sign you out or reset preferences like your saved villas, since those
          rely on the same browser storage. Strictly necessary storage can't be
          turned off selectively within the Service itself, since it's required for
          basic functionality like staying signed in.
        </p>

        <h2>5. Changes to this policy</h2>
        <p>
          If the cookies or storage we use change meaningfully, we'll update the
          date at the top of this page.
        </p>

        <h2>6. Contact us</h2>
        <p>
          Questions about this policy can be sent to{' '}
          <a href="mailto:hello@stayornay.com">hello@stayornay.com</a>.
        </p>
      </LegalProse>
    </div>
  );
}
