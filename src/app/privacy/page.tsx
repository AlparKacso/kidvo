import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: { index: false },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F4F6] font-body">
      <nav className="flex items-center justify-between px-5 md:px-8 py-4 max-w-[800px] mx-auto">
        <Link href="/" className="font-display leading-none" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' }}>
          <span style={{ color: '#523650' }}>kid</span><span style={{ color: '#F0A500' }}>vo</span>
        </Link>
      </nav>

      <main className="max-w-[800px] mx-auto px-5 md:px-8 py-10 pb-20">
        <h1 className="font-display text-3xl font-bold text-[#1a0f1e] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#9b89a5] mb-10">Last updated: February 2026</p>

        <div className="bg-white rounded-2xl border border-[#e8e0ec] p-8 flex flex-col gap-8 text-sm text-[#4a3a52] leading-relaxed">

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">1. Who we are</h2>
            <p>kidvo (kidvo.eu) is a discovery platform connecting parents with local activity providers in Timișoara, Romania. We are the data controller for personal data collected through this platform.</p>
            <p className="mt-2">Contact: <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a></p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">2. What data we collect</h2>
            <p className="mb-2"><strong className="text-[#1a0f1e]">Parents:</strong> Email address, full name, children's names and birth years, neighborhood preference, saved activities, trial session requests.</p>
            <p><strong className="text-[#1a0f1e]">Providers:</strong> Email address, display name, business description, contact phone, contact email, activity listings and schedules.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">3. Why we collect it</h2>
            <p className="mb-2">We collect and process your data to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide and operate the kidvo platform</li>
              <li>Facilitate trial session requests between parents and providers</li>
              <li>Send transactional emails (trial confirmations, notifications)</li>
              <li>Improve the platform based on usage</li>
            </ul>
            <p className="mt-2">Legal basis: contract performance (Art. 6(1)(b) GDPR) and legitimate interests (Art. 6(1)(f) GDPR).</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">4. Cookies</h2>
            <p>kidvo uses only essential cookies required for authentication and session management (Supabase Auth). We do not use tracking, advertising, or analytics cookies.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">5. Data sharing</h2>
            <p className="mb-2">We share your data only with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-[#1a0f1e]">Supabase</strong> — database and authentication (EU servers)</li>
              <li><strong className="text-[#1a0f1e]">Resend</strong> — transactional email delivery</li>
              <li><strong className="text-[#1a0f1e]">Vercel</strong> — hosting and infrastructure</li>
            </ul>
            <p className="mt-2">When a trial is confirmed, your contact details are shared with the relevant provider. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">6. Your rights</h2>
            <p className="mb-2">Under GDPR you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Object to processing</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-2">To exercise any right, email <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">7. Data retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, all personal data is removed within 30 days. Anonymised usage data may be retained longer.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">8. Changes</h2>
            <p>We may update this policy. We will notify users of significant changes via email. Continued use of the platform constitutes acceptance of the updated policy.</p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="font-display text-sm font-semibold text-[#523650] hover:underline">← Back to kidvo</Link>
        </div>
      </main>
    </div>
  )
}
