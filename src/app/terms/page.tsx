import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  robots: { index: false },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F5F4F6] font-body">
      <nav className="flex items-center justify-between px-5 md:px-8 py-4 max-w-[800px] mx-auto">
        <Link href="/" className="font-display leading-none" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' }}>
          <span style={{ color: '#523650' }}>kid</span><span style={{ color: '#F0A500' }}>vo</span>
        </Link>
      </nav>

      <main className="max-w-[800px] mx-auto px-5 md:px-8 py-10 pb-20">
        <h1 className="font-display text-3xl font-bold text-[#1a0f1e] mb-2">Terms of Use</h1>
        <p className="text-sm text-[#9b89a5] mb-10">Last updated: February 2026</p>

        <div className="bg-white rounded-2xl border border-[#e8e0ec] p-8 flex flex-col gap-8 text-sm text-[#4a3a52] leading-relaxed">

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">1. What kidvo is</h2>
            <p>kidvo is a discovery and connection platform. We help parents in Timișoara find and contact local activity providers for children. <strong className="text-[#1a0f1e]">kidvo is not an intermediary.</strong> All agreements, contracts, and payments are made directly between parents and providers. kidvo takes no responsibility for the quality, safety, or conduct of any activity or provider.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">2. Eligibility</h2>
            <p>You must be at least 18 years old to create an account. By registering, you confirm that the information you provide is accurate and complete.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">3. Provider responsibilities</h2>
            <p className="mb-2">Providers who list activities on kidvo agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide accurate and up-to-date information about their activities</li>
              <li>Hold all required licenses, certifications, and insurance</li>
              <li>Respond to trial session requests in a timely manner</li>
              <li>Not list activities that are illegal, misleading, or harmful</li>
            </ul>
            <p className="mt-2">kidvo reserves the right to remove any listing that violates these terms without notice.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">4. Trial sessions</h2>
            <p>Trial session requests sent through kidvo are expressions of interest only. They do not constitute a booking, reservation, or contract. The provider may accept or decline at their discretion. Any arrangement following a trial request is solely between the parent and provider.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">5. Payments</h2>
            <p>kidvo does not process, handle, or facilitate any payments. All financial transactions occur directly between parents and providers. kidvo has no liability for any payment disputes.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">6. Limitation of liability</h2>
            <p>kidvo provides the platform "as is". We are not liable for any damages arising from the use of the platform, the conduct of providers, the quality of activities, or any direct relationship between parents and providers. Our total liability is limited to the amount you paid to kidvo in the 12 months preceding the claim (if any).</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">7. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Use kidvo for any unlawful purpose</li>
              <li>Post false, misleading, or fraudulent information</li>
              <li>Attempt to gain unauthorised access to other accounts or systems</li>
              <li>Scrape, copy, or redistribute kidvo content without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">8. Termination</h2>
            <p>You may delete your account at any time. kidvo reserves the right to suspend or terminate accounts that violate these terms. We may also discontinue the platform at any time with reasonable notice.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">9. Governing law</h2>
            <p>These terms are governed by Romanian law. Any disputes shall be resolved in the courts of Timișoara, Romania.</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-[#1a0f1e] mb-3">10. Contact</h2>
            <p>Questions? Email <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a></p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="font-display text-sm font-semibold text-[#523650] hover:underline">← Back to kidvo</Link>
        </div>
      </main>
    </div>
  )
}
