'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent, PrivacyContent } from '@/components/ui/LegalContent'

export function FooterLegalLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const t = useTranslations('legal')
  const [open, setOpen] = useState<'terms' | 'privacy' | null>(null)

  const linkCls = tone === 'dark'
    ? 'text-xs text-white/60 hover:text-white transition-colors font-display font-semibold'
    : 'text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold'

  return (
    <>
      <button onClick={() => setOpen('privacy')} className={linkCls}>{t('privacyLink')}</button>
      <button onClick={() => setOpen('terms')}   className={linkCls}>{t('termsLink')}</button>

      {open === 'terms'   && <LegalModal title={t('termsTitle')}   onClose={() => setOpen(null)}><TermsContent /></LegalModal>}
      {open === 'privacy' && <LegalModal title={t('privacyTitle')} onClose={() => setOpen(null)}><PrivacyContent /></LegalModal>}
    </>
  )
}
