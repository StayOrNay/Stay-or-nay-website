import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/shared';
import { LegalProse } from './LegalProse';

export function TermsScreen() {
  const navigate = useNavigate();
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Terms of Service" onBack={() => navigate('/you/legal')} />
      <LegalProse updated="June 24, 2026">
        <p>
          These terms govern your use of StayOrNay (the "Service"). By using the
          Service, you agree to them. If you don't agree, please don't use the
          Service.
        </p>

        <h2>1. What StayOrNay is</h2>
        <p>
          StayOrNay is a discovery and review platform for villas and stays,
          presented on an interactive map. We help you explore listings and read
          honest "stay or nay" verdicts from other users. StayOrNay does not own,
          manage, or take bookings for any property shown on the Service —
          we're a guide, not a booking platform or property manager.
        </p>

        <h2>2. Accounts</h2>
        <ul>
          <li>You must provide a valid email address to create an account.</li>
          <li>You're responsible for keeping your password secure and for all activity under your account.</li>
          <li>You must be at least 16 years old to create an account.</li>
          <li>One account per person; don't create accounts to impersonate someone else.</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these terms, abuse the
          Service, or post content that breaks the rules in Section 3.
        </p>

        <h2>3. Reviews and content you post</h2>
        <p>When you write a review, verdict, or any other content on StayOrNay, you agree it will be:</p>
        <ul>
          <li>Your own genuine opinion or experience, not paid or fabricated.</li>
          <li>Not defamatory, harassing, hateful, or knowingly false.</li>
          <li>Free of other people's private information you don't have the right to share.</li>
        </ul>
        <p>
          You keep ownership of what you write, but you grant StayOrNay a
          non-exclusive, worldwide, royalty-free license to host, display, and
          distribute it as part of the Service (for example, showing your review on
          a villa's page). We may remove content that violates these terms.
        </p>

        <h2>4. Map and listing accuracy</h2>
        <p>
          Villa locations, pricing, and availability shown on the Service are
          provided for guidance and may not always be current or fully accurate.
          Always confirm details directly with the property or booking provider
          before making travel decisions or payments.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Scrape, copy, or republish the Service's content at scale without permission.</li>
          <li>Attempt to disrupt, overload, or gain unauthorized access to the Service.</li>
          <li>Use the Service for any unlawful purpose.</li>
          <li>Reverse-engineer or interfere with the Service's underlying code.</li>
        </ul>

        <h2>6. Third-party services</h2>
        <p>
          The Service relies on third parties — including Mapbox for maps and
          Supabase for accounts — whose own terms and availability may affect your
          experience. We aren't responsible for outages or issues originating from
          these providers.
        </p>

        <h2>7. Disclaimers</h2>
        <p>
          The Service is provided "as is," without warranties of any kind. We don't
          guarantee that the Service will be uninterrupted, error-free, or that any
          villa or listing meets your expectations — verdicts and ratings reflect
          individual users' opinions, not StayOrNay's endorsement.
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, StayOrNay isn't liable for
          indirect, incidental, or consequential damages arising from your use of
          the Service, including decisions made based on listings or reviews shown
          on it.
        </p>

        <h2>9. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continuing to use the
          Service after changes take effect means you accept the updated terms.
        </p>

        <h2>10. Contact us</h2>
        <p>
          Questions about these terms can be sent to{' '}
          <a href="mailto:hello@stayornay.com">hello@stayornay.com</a>.
        </p>
      </LegalProse>
    </div>
  );
}
