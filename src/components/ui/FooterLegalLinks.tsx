'use client'

import { useState } from 'react'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent, PrivacyContent } from '@/components/ui/LegalContent'

export function FooterLegalLinks() {
  const [open, setOpen] = useState<'terms' | 'privacy' | null>(null)

  return (
    <>
      <button onClick={() => setOpen('privacy')} className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">Privacy</button>
      <button onClick={() => setOpen('terms')}   className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">Terms</button>

      {open === 'terms'   && <LegalModal title="Terms of Use"   onClose={() => setOpen(null)}><TermsContent /></LegalModal>}
      {open === 'privacy' && <LegalModal title="Privacy Policy" onClose={() => setOpen(null)}><PrivacyContent /></LegalModal>}
    </>
  )
}
