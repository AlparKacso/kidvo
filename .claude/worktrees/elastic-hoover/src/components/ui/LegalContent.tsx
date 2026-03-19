// src/components/ui/LegalContent.tsx
// Standalone content for Privacy Policy and Terms — used inside LegalModal

export function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-[#9b89a5]">Last updated: February 2026</p>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">1. Who we are</h3>
        <p>kidvo (kidvo.eu) is a discovery platform connecting parents with local activity providers in Timișoara, Romania. Contact: <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a></p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">2. What data we collect</h3>
        <p className="mb-1"><strong className="text-[#1a0f1e]">Parents:</strong> Email, full name, children's names and birth years, neighborhood, saved activities, trial requests.</p>
        <p><strong className="text-[#1a0f1e]">Providers:</strong> Email, display name, business description, contact phone, contact email, listings and schedules.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">3. Why we collect it</h3>
        <p>To operate the kidvo platform, facilitate trial requests, send transactional emails, and improve the product. Legal basis: contract performance and legitimate interests (GDPR Art. 6).</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">4. Cookies</h3>
        <p>kidvo uses only essential cookies required for authentication and session management. No tracking or advertising cookies.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">5. Data sharing</h3>
        <p>We share data only with Supabase (database/auth), Resend (email), and Vercel (hosting). When a trial is confirmed, your contact details are shared with the relevant provider. We do not sell your data.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">6. Your rights</h3>
        <p>You have the right to access, correct, delete, or export your data. Email <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a> and we'll respond within 30 days.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">7. Retention</h3>
        <p>Data is retained while your account is active. On account deletion, personal data is removed within 30 days.</p>
      </section>
    </>
  )
}

export function TermsContent() {
  return (
    <>
      <p className="text-xs text-[#9b89a5]">Last updated: February 2026</p>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">1. What kidvo is</h3>
        <p>kidvo is a discovery and connection platform. <strong className="text-[#1a0f1e]">kidvo is not an intermediary.</strong> All agreements, contracts, and payments are made directly between parents and providers. kidvo takes no responsibility for the quality, safety, or conduct of any activity or provider.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">2. Provider responsibilities</h3>
        <p>Providers must provide accurate information, hold all required licenses and insurance, offer a free trial session for every listing, and respond to trial requests in a timely manner. kidvo may remove listings that violate these terms.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">3. Trial sessions</h3>
        <p>Trial requests are expressions of interest only — not bookings or contracts. Any arrangement following a trial request is solely between the parent and provider.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">4. Payments</h3>
        <p>kidvo does not process or handle any payments. All financial transactions occur directly between parents and providers.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">5. Limitation of liability</h3>
        <p>kidvo provides the platform "as is" and is not liable for damages arising from use of the platform or the conduct of providers. Our total liability is limited to the amount you paid to kidvo in the preceding 12 months.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">6. Acceptable use</h3>
        <p>You agree not to use kidvo for unlawful purposes, post false information, attempt unauthorized access, or scrape content without permission.</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">7. Governing law</h3>
        <p>These terms are governed by Romanian law. Disputes shall be resolved in the courts of Timișoara, Romania.</p>
      </section>
    </>
  )
}
