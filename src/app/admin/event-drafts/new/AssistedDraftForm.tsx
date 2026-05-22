'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Fields {
  title:         string
  description:   string
  eventUrl:      string
  coverImageUrl: string
  eventStartAt:  string
  eventEndAt:    string
  venueName:     string
  priceLabel:    string
  organizerName: string
}

const EMPTY: Fields = {
  title: '', description: '', eventUrl: '', coverImageUrl: '',
  eventStartAt: '', eventEndAt: '', venueName: '', priceLabel: '', organizerName: '',
}

const inputCls = 'w-full px-3 py-2 border border-border rounded bg-white font-body text-sm text-ink outline-none focus:border-primary transition-all'

// 24h time list — 30-min steps, locale-independent (matches the wizard).
const EVENT_TIMES = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
)
// Helpers over a combined "YYYY-MM-DDTHH:mm" value.
const dtDate = (v: string) => (v ? v.split('T')[0] : '')
const dtTime = (v: string) => (v && v.includes('T') ? v.split('T')[1].slice(0, 5) : '')
const joinDateTime = (d: string, tm: string) => (d ? `${d}T${tm || '00:00'}` : '')

export function AssistedDraftForm() {
  const router = useRouter()
  const [url, setUrl]         = useState('')
  const [fetching, setFetch]  = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [f, setF]             = useState<Fields>(EMPTY)

  function set<K extends keyof Fields>(k: K, v: Fields[K]) { setF(prev => ({ ...prev, [k]: v })) }

  async function fetchMeta() {
    setError(''); setFetch(true)
    try {
      const res = await fetch('/api/admin/event-drafts/fetch-meta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Failed to fetch'); return }
      setF(prev => ({
        ...prev,
        title:         body.title || prev.title,
        description:   body.description || prev.description,
        coverImageUrl: body.coverImageUrl || prev.coverImageUrl,
        eventUrl:      body.eventUrl || url,
      }))
    } finally { setFetch(false) }
  }

  async function save() {
    setError('')
    const missing: string[] = []
    if (!f.title.trim())         missing.push('title')
    if (!f.eventStartAt)         missing.push('start')
    if (!f.eventEndAt)           missing.push('end')
    if (!f.venueName.trim())     missing.push('venue')
    if (!f.coverImageUrl.trim()) missing.push('cover image')
    if (!f.eventUrl.trim())      missing.push('event URL')
    if (missing.length) {
      setError(`Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/event-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setError(body.error ?? 'Failed to save'); setSaving(false); return }
      router.push('/admin')
    } catch {
      setError('Failed to save'); setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Add event (assisted)</h1>
        <Link href="/admin" className="font-display text-sm font-semibold text-ink-muted hover:text-primary transition-colors">← Admin</Link>
      </div>
      <p className="text-sm text-ink-mid">
        Paste an event URL (e.g. a public Facebook event or a venue page) to prefill from its
        OpenGraph tags, then correct anything and save. It lands in the admin review queue.
      </p>

      {/* URL prefill */}
      <div className="bg-white border border-border rounded-lg p-4 flex flex-col gap-2">
        <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid">Source URL</label>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
          <button onClick={fetchMeta} disabled={!url || fetching}
            className="px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 whitespace-nowrap">
            {fetching ? 'Fetching…' : 'Prefill'}
          </button>
        </div>
      </div>

      {/* Editable fields — * marks required (also enforced server-side) */}
      <div className="bg-white border border-border rounded-lg p-4 flex flex-col gap-3">
        <Field label="Title *"><input className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
        <Field label="Description"><textarea className={inputCls} rows={4} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts *">
            <div className="flex gap-2">
              <input type="date" className={inputCls} value={dtDate(f.eventStartAt)}
                onChange={e => set('eventStartAt', joinDateTime(e.target.value, dtTime(f.eventStartAt)))} />
              <select className={`${inputCls} w-[104px]`} value={dtTime(f.eventStartAt)}
                onChange={e => set('eventStartAt', joinDateTime(dtDate(f.eventStartAt), e.target.value))}>
                <option value="">––:––</option>
                {EVENT_TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Ends *">
            <div className="flex gap-2">
              <input type="date" className={inputCls} value={dtDate(f.eventEndAt)}
                onChange={e => set('eventEndAt', joinDateTime(e.target.value, dtTime(f.eventEndAt)))} />
              <select className={`${inputCls} w-[104px]`} value={dtTime(f.eventEndAt)}
                onChange={e => set('eventEndAt', joinDateTime(dtDate(f.eventEndAt), e.target.value))}>
                <option value="">––:––</option>
                {EVENT_TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Venue *"><input className={inputCls} value={f.venueName} onChange={e => set('venueName', e.target.value)} /></Field>
          <Field label="Price (free text)"><input className={inputCls} placeholder="Free / 30 RON" value={f.priceLabel} onChange={e => set('priceLabel', e.target.value)} /></Field>
        </div>
        <Field label="Organizer"><input className={inputCls} value={f.organizerName} onChange={e => set('organizerName', e.target.value)} /></Field>
        <Field label="Event URL *"><input className={inputCls} value={f.eventUrl} onChange={e => set('eventUrl', e.target.value)} /></Field>
        <Field label="Cover image URL *"><input className={inputCls} value={f.coverImageUrl} onChange={e => set('coverImageUrl', e.target.value)} /></Field>
      </div>

      {error && <div className="bg-danger-lt border border-danger/20 text-danger text-sm rounded p-3">{error}</div>}

      <button onClick={save} disabled={saving}
        className="self-start px-5 py-2.5 rounded font-display text-sm font-semibold bg-success text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
        {saving ? 'Saving…' : 'Save to review queue'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">{label}</label>
      {children}
    </div>
  )
}
