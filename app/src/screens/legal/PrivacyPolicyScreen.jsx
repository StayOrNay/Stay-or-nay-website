import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/shared';
import { LegalProse } from './LegalProse';

export function PrivacyPolicyScreen() {
  const navigate = useNavigate();
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Privacy Policy" onBack={() => navigate('/you/legal')} />
      <LegalProse updated="June 24, 2026">
        <p>
          StayOrNay ("we", "us") helps you explore real villas on a satellite map and
          decide whether they're worth booking. This policy explains what information
          we collect when you use the site, why we collect it, and what choices you
          have.
        </p>

        <h2>1. Information we collect</h2>
        <h3>Account information</h3>
        <p>
          If you create an account, we collect the email address and password you
          provide. Passwords are never stored in plain text — authentication is
          handled by our backend provider, Supabase, which stores a securely hashed
          version only.
        </p>
        <h3>Map and location data</h3>
        <p>
          The Explore map shows your current view's place name (e.g. "Koh Tao,
          Thailand") by sending the map's center coordinates to Mapbox's geocoding
          service as you pan and zoom. We do not request or store your device's GPS
          location — this is based entirely on where you've scrolled the map to, not
          where you actually are.
        </p>
        <h3>Saved villas and reviews</h3>
        <p>
          Villas you save and reviews or verdicts you write are stored so they're
          there the next time you visit. Today this data lives in your browser; if
          we move it to your account in the future, this policy will be updated
          first.
        </p>
        <h3>Usage data</h3>
        <p>
          Like most websites, our hosting and analytics providers may automatically
          log basic technical information — IP address, browser type, pages viewed,
          and timestamps — used only to keep the site running reliably and to
          understand aggregate usage.
        </p>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To create and secure your account, and let you log in.</li>
          <li>To show your saved villas and written reviews back to you.</li>
          <li>To label the map with the place you're currently viewing.</li>
          <li>To diagnose bugs and understand how the site is used, in aggregate.</li>
          <li>To send account-related email, such as confirmations and password resets.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for ad targeting.</p>

        <h2>3. Who we share it with</h2>
        <p>We rely on a small number of service providers to run StayOrNay:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication and account storage.</li>
          <li><strong>Mapbox</strong> — map tiles, satellite imagery, and place-name lookups.</li>
          <li><strong>Cloudflare</strong> — hosting and content delivery.</li>
        </ul>
        <p>
          Each only receives the information needed to perform its function, and is
          bound by its own privacy and security commitments. We don't share your data
          with anyone else for their own marketing purposes.
        </p>

        <h2>4. Cookies and local storage</h2>
        <p>
          We use cookies and browser local storage to keep you signed in and to
          remember preferences like your saved villas and language choice. See our{' '}
          <a href="/you/legal/cookies">Cookie Policy</a> for details.
        </p>

        <h2>5. Data retention</h2>
        <p>
          Account information is kept for as long as your account exists. If you
          delete your account, we delete your account record and authentication
          data within 30 days, except where we're required to keep limited records
          for legal or security reasons.
        </p>

        <h2>6. Your rights</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you.</li>
          <li>Correct inaccurate information.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Object to or restrict certain processing of your data.</li>
          <li>Receive a copy of your data in a portable format.</li>
        </ul>
        <p>To exercise any of these rights, contact us using the details below.</p>

        <h2>7. Children's privacy</h2>
        <p>
          StayOrNay isn't directed at children, and we don't knowingly collect
          personal information from anyone under 16. If you believe a child has
          created an account, contact us and we'll remove it.
        </p>

        <h2>8. Changes to this policy</h2>
        <p>
          If we make material changes to this policy, we'll update the date at the
          top of this page and, where appropriate, let you know directly.
        </p>

        <h2>9. Contact us</h2>
        <p>
          Questions about this policy or your data can be sent to{' '}
          <a href="mailto:hello@stayornay.com">hello@stayornay.com</a>.
        </p>
      </LegalProse>
    </div>
  );
}
