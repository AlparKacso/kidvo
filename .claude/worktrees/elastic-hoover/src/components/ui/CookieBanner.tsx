'use client'

import { useState, useEffect } from 'react'
import { LegalModal } from '@/components/ui/LegalModal'
import { PrivacyContent } from '@/components/ui/LegalContent'

export function CookieBanner() {
  const [visible, setVisible]         = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('kidvo_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept()  { localStorage.setItem('kidvo_cookie_consent', 'accepted');  setVisible(false) }
  function decline() { localStorage.setItem('kidvo_cookie_consent', 'declined'); setVisible(false) }

  if (!visible) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
        <div className="mb-16 md:mb-0 max-w-2xl mx-auto md:mx-0 md:max-w-none">
          <div className="bg-[#1a0f1e] text-white rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xl">
            <p className="text-sm text-white/75 leading-relaxed flex-1">
              kidvo uses only essential cookies required for authentication and session management. No tracking or advertising cookies.{' '}
              <button onClick={() => setShowPrivacy(true)} className="text-[#F0A500] hover:underline font-semibold">
                Privacy Policy
              </button>
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={decline} className="px-4 py-2 rounded-lg font-display text-sm font-semibold text-white/60 hover:text-white transition-colors">
                Decline
              </button>
              <button onClick={accept} className="px-4 py-2 rounded-lg font-display text-sm font-semibold bg-[#F0A500] text-[#1a0f1e] hover:bg-[#d4920a] transition-colors">
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPrivacy && (
        <LegalModal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
          <PrivacyContent />
        </LegalModal>
      )}
    </>
  )
}
