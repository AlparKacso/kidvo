'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import type { Category } from '@/types/database'

interface CategoryPillsProps {
  categories: Category[]
}

type PillItem = { slug: string; name: string }

export function CategoryPills({ categories }: CategoryPillsProps) {
  const router = useRouter()
  const params = useSearchParams()
  const active = params.get('category') ?? 'all'

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
              'inline-flex items-center gap-1.5 rounded-full font-display text-[13px] font-semibold transition-all border-[1.5px]',
              isActive
                ? ''
                : 'bg-white border-border text-ink-mid hover:border-primary/40 hover:text-primary hover:bg-primary-lt/50'
            )}
            style={{ padding: '6px 14px', ...activeStyle }}
          >
            <CategoryIcon slug={cat.slug} size={14} />
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
