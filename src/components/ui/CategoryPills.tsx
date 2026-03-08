'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

interface CategoryPillsProps {
  categories: Category[]
}

// Pill items include a synthetic "All" entry
type PillItem = { slug: string; name: string; accent_color?: string }

const CATEGORY_EMOJI: Record<string, string> = {
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

/** Convert hex to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(124,58,237,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

export function CategoryPills({ categories }: CategoryPillsProps) {
  const router  = useRouter()
  const params  = useSearchParams()
  const active  = params.get('category') ?? 'all'

  function select(slug: string) {
    const next = new URLSearchParams(params.toString())
    if (slug === 'all') next.delete('category')
    else next.set('category', slug)
    router.push(`/browse?${next.toString()}`)
  }

  const pills: PillItem[] = [
    { slug: 'all', name: 'All' },
    ...categories,
  ]

  return (
    <div className="flex gap-2 flex-wrap mb-[18px]">
      {pills.map(cat => {
        const isActive = active === cat.slug
        const accent   = cat.accent_color

        // Active styles: "All" → dark fill; categories → per-category tint
        const activeStyle = isActive
          ? cat.slug === 'all'
            ? { background: '#1c1c27', color: '#ffffff', borderColor: '#1c1c27' }
            : accent
              ? { background: hexToRgba(accent, 0.12), color: accent, borderColor: hexToRgba(accent, 0.35) }
              : { background: '#f0e8ff', color: '#7c3aed', borderColor: 'rgba(124,58,237,0.35)' }
          : {}

        return (
          <button
            key={cat.slug}
            onClick={() => select(cat.slug)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-display font-semibold transition-all',
              'text-[13px]',
              isActive
                ? 'border-[1.5px]'
                : 'border-[1.5px] bg-white border-border text-ink-mid hover:border-primary/40 hover:text-primary hover:bg-primary-lt/50'
            )}
            style={{ padding: '7px 16px', ...activeStyle }}
          >
            {cat.slug !== 'all' && CATEGORY_EMOJI[cat.slug] && (
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{CATEGORY_EMOJI[cat.slug]}</span>
            )}
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
