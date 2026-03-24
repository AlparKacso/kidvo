'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StagingLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/staging-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-8">
          <span className="font-display font-black text-[28px] tracking-[-1px]">
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </span>
          <p className="font-display text-[13px] text-ink-muted mt-1">Staging environment</p>
        </div>
        <div className="bg-white border border-border rounded-[18px] p-7 shadow-card">
          <h1 className="font-display text-[18px] font-extrabold text-ink mb-4">Enter password</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-border rounded-[10px] font-display text-[13.5px] text-ink outline-none focus:border-primary transition-all"
            />
            {error && (
              <p className="font-display text-[12px] text-red-500">Incorrect password</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-[10px] font-display text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-deep transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
