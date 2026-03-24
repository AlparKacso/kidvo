// src/components/ui/LegalContent.tsx
// Standalone content for Privacy Policy and Terms — used inside LegalModal
'use client'

import { useTranslations } from 'next-intl'

export function PrivacyContent() {
  const t = useTranslations('legal')
  const s = useTranslations('legal.privacySections')

  return (
    <>
      <p className="text-xs text-[#9b89a5]">{t('lastUpdated')}</p>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('whoWeAre')}</h3>
        <p>{s('whoWeAreBody')} <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a></p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('whatWeCollect')}</h3>
        <p className="mb-1"><strong className="text-[#1a0f1e]">{s('parents')}</strong> {s('parentsBody')}</p>
        <p><strong className="text-[#1a0f1e]">{s('providers')}</strong> {s('providersBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('whyWeCollect')}</h3>
        <p>{s('whyWeCollectBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('cookies')}</h3>
        <p>{s('cookiesBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('dataSharing')}</h3>
        <p>{s('dataSharingBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('yourRights')}</h3>
        <p>{s('yourRightsBody')} <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a></p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('retention')}</h3>
        <p>{s('retentionBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('childrenData')}</h3>
        <p className="mb-2">{s('childrenDataIntro')}</p>
        <p className="mb-1"><strong className="text-[#1a0f1e]">{s('childrenDataCollected')}</strong> {s('childrenDataCollectedBody')}</p>
        <p className="mb-1"><strong className="text-[#1a0f1e]">{s('childrenDataWho')}</strong> {s('childrenDataWhoBody')}</p>
        <p className="mb-1"><strong className="text-[#1a0f1e]">{s('childrenDataUse')}</strong> {s('childrenDataUseBody')}</p>
        <p className="mb-1"><strong className="text-[#1a0f1e]">{s('childrenDataAccess')}</strong> {s('childrenDataAccessBody')}</p>
        <p className="mb-1"><strong className="text-[#1a0f1e]">{s('childrenDataRetention')}</strong> {s('childrenDataRetentionBody')} <a href="mailto:hello@kidvo.eu" className="text-[#523650] font-semibold hover:underline">hello@kidvo.eu</a></p>
        <p className="mt-2">{s('childrenDataNoAccounts')}</p>
      </section>
    </>
  )
}

export function TermsContent() {
  const t = useTranslations('legal')
  const s = useTranslations('legal.termsSections')

  return (
    <>
      <p className="text-xs text-[#9b89a5]">{t('lastUpdated')}</p>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('whatKidvoIs')}</h3>
        <p>{s('whatKidvoIsBody1')} <strong className="text-[#1a0f1e]">{s('whatKidvoIsNotIntermediary')}</strong> {s('whatKidvoIsBody2')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('providerResponsibilities')}</h3>
        <p>{s('providerResponsibilitiesBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('trialSessions')}</h3>
        <p>{s('trialSessionsBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('payments')}</h3>
        <p>{s('paymentsBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('liability')}</h3>
        <p>{s('liabilityBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('acceptableUse')}</h3>
        <p>{s('acceptableUseBody')}</p>
      </section>

      <section>
        <h3 className="font-display text-sm font-bold text-[#1a0f1e] mb-2">{s('governingLaw')}</h3>
        <p>{s('governingLawBody')}</p>
      </section>
    </>
  )
}
