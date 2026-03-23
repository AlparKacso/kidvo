'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const t = useTranslations('auth')
  const tLogin = useTranslations('auth.login')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-border rounded-[10px] bg-white font-display text-[13.5px] text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block font-display font-black leading-none hover:opacity-80 transition-opacity" style={{ fontSize: '28px', letterSpacing: '-1px' }}>
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </Link>
          <p className="font-display text-[13px] text-ink-muted mt-2">{t('tagline')}</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-[18px] p-7 shadow-card">
          <h1 className="font-display text-[20px] font-extrabold text-ink mb-1 leading-snug" style={{ letterSpacing: '-0.3px' }}>
            {tLogin('title')}
          </h1>
          <p className="font-display text-[13px] text-ink-muted mb-6">{tLogin('subtitle')}</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid block mb-1.5">{tLogin('email')}</label>
              <input
                className={inputCls}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid">{tLogin('password')}</label>
                <Link href="/auth/forgot-password" className="font-display text-[11px] font-semibold text-primary hover:opacity-75 transition-opacity">
                  {tLogin('forgot')}
                </Link>
              </div>
              <input
                className={inputCls}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-[#fff0f0] border border-[#fecaca] text-[#dc2626] font-display text-[12.5px] rounded-[8px] px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[10px] font-display text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? tLogin('signingIn') : tLogin('signIn')}
            </button>
          </form>
        </div>

        <p className="text-center font-display text-[13px] text-ink-muted mt-5">
          {tLogin('noAccount')}{' '}
          <Link href="/auth/signup" className="text-primary font-semibold hover:opacity-75 transition-opacity">{tLogin('signUp')}</Link>
        </p>
      </div>
    </div>
  )
}
