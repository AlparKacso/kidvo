'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

// Shared "Continue with Google" button for the login & signup pages.
// - On signup we pass the chosen `role` so the /auth/callback can create the
//   right kind of profile (parents → /browse, providers → /dashboard).
// - `next` carries deep-link intent (e.g. ?next=/browse/<id>) through the flow.
export function GoogleButton({
  role,
  next,
}: {
  role?: 'parent' | 'provider'
  next?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = useTranslations('auth')

  async function handleGoogle() {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (next) params.set('next', next)
    const qs = params.toString()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${qs ? `?${qs}` : ''}`,
      },
    })

    // On success the browser navigates to Google, so we only reach here on error.
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full py-2.5 rounded-[10px] font-display text-[13.5px] font-semibold bg-white border border-border text-ink hover:bg-bg disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5"
      >
        <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A9 9 0 0 0 9 18Z"/>
          <path fill="#FBBC05" d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33Z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>
        </svg>
        {loading ? t('continueWithGoogleLoading') : t('continueWithGoogle')}
      </button>

      {error && (
        <div className="bg-[#fff0f0] border border-[#fecaca] text-[#dc2626] font-display text-[12.5px] rounded-[8px] px-3.5 py-2.5">
          {error}
        </div>
      )}
    </div>
  )
}

// A small "or" divider to place between the Google button and the email form.
export function AuthDivider() {
  const t = useTranslations('auth')
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="h-px flex-1 bg-border" />
      <span className="font-display text-[11px] uppercase tracking-[.08em] text-ink-muted">
        {t('orDivider')}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
