'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

const CATEGORY_EMOJI: Record<string, string> = {
  all:         '✦',
  sport:       '⚽',
  dance:       '💃',
  music:       '🎵',
  coding:      '💻',
  arts:        '🎨',
  language:    '🌍',
  languages:   '🌍',
  chess:       '♟️',
  gym:         '🤸',
  gymnastics:  '🤸',
  babysitting: '🍼',
  other:       '✨',
}

interface CategoryPillsProps {
  categories: Category[]
}

type PillItem = { slug: string; name: string }

export function CategoryPills({ categories }: CategoryPillsProps) {
  const router = useRouter()
  const params = useSearchParams()
  const t      = useTranslations('categories')
  const active = params.get('category') ?? 'all'

  function select(slug: string) {
    const next = new URLSearchParams(params.toString())
    if (slug === 'all') next.delete('category')
    else next.set('category', slug)
    router.push(`/browse?${next.toString()}`)
  }

  const pills: PillItem[] = [
    { slug: 'all', name: t('all') },
    ...categories,
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-2 sm:flex-wrap" style={{ width: 'max-content' }}>
        {pills.map(cat => {
          const isActive = active === cat.slug
          // Use translated name if available, fall back to DB name
          const label = cat.slug !== 'all' ? (t.has(cat.slug) ? t(cat.slug as any) : cat.name) : cat.name

          const activeStyle = isActive
            ? cat.slug === 'all'
              ? { background: '#1c1c27', color: '#ffffff', borderColor: '#1c1c27' }
              : { background: '#f0e8ff', color: '#7c3aed', borderColor: '#7c3aed' }
            : {}

          return (
            <button
              key={cat.slug}
              onClick={() => select(cat.slug)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-display text-[13px] font-semibold transition-all border-[1.5px] whitespace-nowrap',
                isActive
                  ? ''
                  : 'bg-white border-border text-ink-mid hover:border-primary/40 hover:text-primary hover:bg-primary-lt/50'
              )}
              style={{ padding: '6px 14px', ...activeStyle }}
            >
              <span style={{ fontSize: '13px', lineHeight: 1 }}>{CATEGORY_EMOJI[cat.slug] ?? '✨'}</span>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
