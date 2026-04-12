'use client'

import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function LocaleToggle() {
  const locale = useLocale()
  const t = useTranslations('language')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function switchLocale(next: 'ro' | 'en') {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
    // Persist to DB so recipient-facing emails use the correct language
    fetch('/api/auth/update-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {}) // best-effort — cookie is the primary source
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border p-0.5 flex-shrink-0">
      {(['ro', 'en'] as const).map(l => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          disabled={isPending || locale === l}
          className={[
            'font-display text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors',
            locale === l
              ? 'bg-ink text-white'
              : 'text-ink-muted hover:text-ink',
          ].join(' ')}
        >
          {t(l)}
        </button>
      ))}
    </div>
  )
}
