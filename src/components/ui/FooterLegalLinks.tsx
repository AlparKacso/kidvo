'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent, PrivacyContent } from '@/components/ui/LegalContent'

export function FooterLegalLinks() {
  const t = useTranslations('legal')
  const [open, setOpen] = useState<'terms' | 'privacy' | null>(null)

  return (
    <>
      <button onClick={() => setOpen('privacy')} className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">{t('privacyLink')}</button>
      <button onClick={() => setOpen('terms')}   className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">{t('termsLink')}</button>

      {open === 'terms'   && <LegalModal title={t('termsTitle')}   onClose={() => setOpen(null)}><TermsContent /></LegalModal>}
      {open === 'privacy' && <LegalModal title={t('privacyTitle')} onClose={() => setOpen(null)}><PrivacyContent /></LegalModal>}
    </>
  )
}
