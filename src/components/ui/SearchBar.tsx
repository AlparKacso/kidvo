'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  areas: { id: string; name: string; slug: string }[]
}

export function SearchBar({ areas }: Props) {
  const router              = useRouter()
  const params              = useSearchParams()
  const [, startTransition] = useTransition()

  const [q,    setQ]    = useState(params.get('q')    ?? '')
  const [area, setArea] = useState(params.get('area') ?? '')
  const [age,  setAge]  = useState(params.get('age')  ?? '')

  function apply(overrides: Record<string, string> = {}) {
    const next   = new URLSearchParams(params.toString())
    const values = { q, area, age, ...overrides }
    values.q    ? next.set('q',    values.q)    : next.delete('q')
    values.area ? next.set('area', values.area) : next.delete('area')
    values.age  ? next.set('age',  values.age)  : next.delete('age')
    startTransition(() => router.push(`/browse?${next.toString()}`))
  }

  function clear() {
    setQ(''); setArea(''); setAge('')
    const next = new URLSearchParams(params.toString())
    next.delete('q'); next.delete('area'); next.delete('age')
    startTransition(() => router.push(`/browse?${next.toString()}`))
  }

  const hasFilters = q || area || age

  return (
    <div className="mb-5">
      {/* Combined search row — pill style */}
      <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-2 mb-3 focus-within:border-primary transition-colors max-w-[600px]">
        {/* Search icon */}
        <svg className="text-ink-muted flex-shrink-0" width="14" height="14" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="Search activities or providers…"
          className="flex-1 bg-transparent font-body text-sm text-ink placeholder:text-ink-muted outline-none min-w-0"
        />

        {/* Divider */}
        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* Area select — inline, no border */}
        <select
          value={area}
          onChange={e => { setArea(e.target.value); apply({ area: e.target.value }) }}
          className="bg-transparent font-display text-xs font-semibold text-ink-mid outline-none cursor-pointer appearance-none pr-1 hidden sm:block"
        >
          <option value="">All areas</option>
          {areas.map(a => <option key={a.id} value={a.slug}>{a.name}</option>)}
        </select>

        <div className="w-px h-4 bg-border flex-shrink-0 hidden sm:block" />

        {/* Age select — inline */}
        <select
          value={age}
          onChange={e => { setAge(e.target.value); apply({ age: e.target.value }) }}
          className="bg-transparent font-display text-xs font-semibold text-ink-mid outline-none cursor-pointer appearance-none pr-1 hidden sm:block"
        >
          <option value="">All ages</option>
          {[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(a => (
            <option key={a} value={a}>Age {a}</option>
          ))}
        </select>

        {/* Search button */}
        <button
          onClick={() => apply()}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg font-display text-xs font-semibold bg-primary text-white hover:bg-primary-deep transition-colors"
        >
          Search
        </button>
      </div>

      {/* Mobile-only filter chips */}
      <div className="flex gap-2 sm:hidden flex-wrap">
        <select
          value={area}
          onChange={e => { setArea(e.target.value); apply({ area: e.target.value }) }}
          className={cn(
            'px-3 py-1.5 rounded-full border font-display text-xs font-semibold outline-none cursor-pointer appearance-none transition-all',
            area ? 'bg-primary-lt border-primary-border text-primary' : 'bg-white border-border text-ink-mid'
          )}
        >
          <option value="">All areas</option>
          {areas.map(a => <option key={a.id} value={a.slug}>{a.name}</option>)}
        </select>
        <select
          value={age}
          onChange={e => { setAge(e.target.value); apply({ age: e.target.value }) }}
          className={cn(
            'px-3 py-1.5 rounded-full border font-display text-xs font-semibold outline-none cursor-pointer appearance-none transition-all',
            age ? 'bg-primary-lt border-primary-border text-primary' : 'bg-white border-border text-ink-mid'
          )}
        >
          <option value="">All ages</option>
          {[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(a => (
            <option key={a} value={a}>Age {a}</option>
          ))}
        </select>
      </div>

      {/* Active filters + clear */}
      {hasFilters && (
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {q && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-lt border border-primary-border rounded-full font-display text-xs font-semibold text-primary">
              "{q}"
              <button onClick={() => { setQ(''); apply({ q: '' }) }} className="hover:opacity-70 transition-opacity">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </span>
          )}
          {area && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-lt border border-primary-border rounded-full font-display text-xs font-semibold text-primary">
              {areas.find(a => a.slug === area)?.name}
              <button onClick={() => { setArea(''); apply({ area: '' }) }} className="hover:opacity-70 transition-opacity">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </span>
          )}
          {age && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-lt border border-primary-border rounded-full font-display text-xs font-semibold text-primary">
              Age {age}
              <button onClick={() => { setAge(''); apply({ age: '' }) }} className="hover:opacity-70 transition-opacity">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </span>
          )}
          <button onClick={clear} className="font-display text-xs font-semibold text-ink-muted hover:text-danger transition-colors ml-1">
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
