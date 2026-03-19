'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router  = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [status,    setStatus]    = useState<'idle' | 'saving' | 'done' | 'invalid'>('idle')
  const [error,     setError]     = useState('')
  const [ready,     setReady]     = useState(false)

  // Supabase reset links can arrive in two formats depending on how they were generated:
  //
  // 1. PKCE flow (?code=xxx) — produced by supabase.auth.resetPasswordForEmail() with @supabase/ssr.
  //    Requires calling exchangeCodeForSession(code) to obtain a session.
  //
  // 2. Implicit / admin-generated flow (#access_token=xxx&type=recovery) — produced by
  //    adminClient.auth.admin.generateLink({ type: 'recovery' }). The Supabase server
  //    bypasses the PKCE dance because no client-side code_verifier was stored, so it
  //    falls back to embedding the session directly in the hash fragment.
  //    Requires calling setSession({ access_token, refresh_token }).
  //
  // We handle both here so either link format works.
  useEffect(() => {
    const supabase = createClient()

    // Case 1: PKCE — code in query string
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setStatus('invalid')
        else setReady(true)
      })
      return
    }

    // Case 2: Implicit / admin-generated — tokens in hash fragment
    const hash         = new URLSearchParams(window.location.hash.slice(1))
    const accessToken  = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')
    const type         = hash.get('type')

    if (accessToken && type === 'recovery') {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' })
        .then(({ error }) => {
          if (error) setStatus('invalid')
          else setReady(true)
        })
      return
    }

    // Nothing usable — show expired
    setStatus('invalid')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setStatus('saving')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setStatus('idle')
    } else {
      setStatus('done')
      setTimeout(() => router.push('/settings'), 2000)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-border rounded bg-bg font-body text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary focus:shadow-focus transition-all'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <span className="font-display font-bold text-[26px] leading-none tracking-tight">
            <span className="text-primary">kid</span>
            <span className="text-gold">vo</span>
          </span>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">

          {/* Invalid / expired token */}
          {status === 'invalid' && (
            <>
              <h1 className="font-display text-lg font-bold text-ink mb-2">Link expired</h1>
              <p className="text-sm text-ink-muted mb-5">This password reset link is invalid or has expired. Request a new one from Settings.</p>
              <Link href="/settings" className="block w-full text-center py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
                Back to Settings
              </Link>
            </>
          )}

          {/* Waiting for session to be set */}
          {status !== 'invalid' && !ready && (
            <p className="text-sm text-ink-muted text-center py-4">Verifying link…</p>
          )}

          {/* Success */}
          {status === 'done' && (
            <>
              <div className="text-2xl text-center mb-3">✓</div>
              <h1 className="font-display text-lg font-bold text-ink text-center mb-1">Password updated!</h1>
              <p className="text-sm text-ink-muted text-center">Redirecting you to Settings…</p>
            </>
          )}

          {/* Form */}
          {ready && status !== 'done' && (
            <>
              <h1 className="font-display text-lg font-bold text-ink mb-1">Set new password</h1>
              <p className="text-sm text-ink-muted mb-5">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">New password</label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    minLength={6}
                    required
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="bg-danger-lt border border-danger/20 text-danger text-sm rounded p-3">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={status === 'saving'}
                  className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors mt-1"
                >
                  {status === 'saving' ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
