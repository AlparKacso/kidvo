'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Detects Supabase implicit-flow auth hash fragments (e.g. password recovery
 * emails sent from the Supabase dashboard) and redirects to the right page.
 * Hash fragments never reach the server, so this must be a client component.
 */
export function AuthHashRedirect() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1)) // strip leading #
    const type = params.get('type')

    if (type === 'recovery') {
      // Preserve the full hash so reset-password page can extract the token
      router.replace('/auth/reset-password' + hash)
    } else if (type === 'signup') {
      router.replace('/dashboard')
    }
  }, [router])

  return null
}
