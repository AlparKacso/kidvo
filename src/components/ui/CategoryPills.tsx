'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

interface CategoryPillsProps {
  categories: Category[]
}

export function CategoryPills({ categories }: CategoryPillsProps) {
  const router     = useRouter()
  const params     = useSearchParams()
  const active     = params.get('category') ?? 'all'

  function select(slug: string) {
    const next = new URLSearchParams(params.toString())
    if (slug === 'all') next.delete('category')
    else next.set('category', slug)
    router.push(`/browse?${next.toString()}`)
  }

  return (
    <div className="flex gap-1.5 flex-wrap mb-[18px]">
      {[{ slug: 'all', name: 'All' }, ...categories].map(cat => (
        <button
          key={cat.slug}
          onClick={() => select(cat.slug)}
          className={cn(
            'px-3 py-1 rounded-full border font-body text-sm font-medium transition-all',
            active === cat.slug
              ? 'bg-primary border-primary text-white'
              : 'bg-white border-border text-ink-mid hover:border-primary hover:text-primary hover:bg-primary-lt'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
