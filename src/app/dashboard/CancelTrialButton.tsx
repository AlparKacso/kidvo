'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function CancelTrialButton({ trialId }: { trialId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('dashboard')

  async function cancel() {
    if (!confirm(t('cancelTrialConfirm'))) return
    setLoading(true)
    await fetch(`/api/trial-requests/${trialId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={cancel}
      disabled={loading}
      className="text-[11px] font-display font-semibold text-ink-muted hover:text-danger transition-colors disabled:opacity-40"
    >
      {loading ? '…' : t('cancelTrial')}
    </button>
  )
}
