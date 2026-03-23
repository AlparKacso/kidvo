'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [role, setRole]           = useState<'parent' | 'provider'>('parent')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const t = useTranslations('auth')
  const tSignup = useTranslations('auth.signup')

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!isValidEmail(email)) {
      setError(tSignup('invalidEmail'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(tSignup('passwordTooShort'))
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('password') && msg.includes('short'))
        setError(tSignup('passwordTooShort'))
      else if (msg.includes('already registered') || msg.includes('already exists'))
        setError(tSignup('emailExists'))
      else if (msg.includes('invalid email'))
        setError(tSignup('invalidEmailSimple'))
      else
        setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError(tSignup('failed'))
      setLoading(false)
      return
    }

    const { error: userError } = await supabase.from('users').insert({
      id:        data.user.id,
      email,
      full_name: fullName,
      role,
      city:      'Timișoara',
    })

    if (userError) {
      await supabase.auth.signOut()
      setError(userError.message)
      setLoading(false)
      return
    }

    if (role === 'provider') {
      await supabase.from('providers').insert({
        user_id:       data.user.id,
        display_name:  fullName,
        contact_email: email,
      })
    }

    fetch('/api/auth/welcome', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, name: fullName, role }),
    }).catch(() => {})

    setLoading(false)
    // Show a 1-second welcome flash then navigate
    await new Promise(r => setTimeout(r, 900))
    router.push('/dashboard')
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-border rounded-[10px] bg-white font-display text-[13.5px] text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">

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
            {tSignup('title')}
          </h1>
          <p className="font-display text-[13px] text-ink-muted mb-6">{tSignup('subtitle')}</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">

            {/* Role selector */}
            <div>
              <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid block mb-1.5">{tSignup('iam')}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['parent', 'provider'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'py-2.5 rounded-[10px] border font-display text-[13px] font-semibold transition-all',
                      role === r
                        ? 'bg-[#f0e8ff] border-primary text-primary'
                        : 'bg-bg border-border text-ink-mid hover:border-primary/50 hover:text-ink'
                    )}
                  >
                    {r === 'parent' ? tSignup('parent') : tSignup('provider')}
                  </button>
                ))}
              </div>
              <p className="font-display text-[11px] text-ink-muted mt-1.5">
                {role === 'parent' ? tSignup('parentSub') : tSignup('providerSub')}
              </p>
            </div>

            <div>
              <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid block mb-1.5">{tSignup('fullName')}</label>
              <input
                className={inputCls}
                type="text"
                placeholder={tSignup('namePlaceholder')}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid block mb-1.5">{tSignup('email')}</label>
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
              <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid block mb-1.5">{tSignup('password')}</label>
              <input
                className={inputCls}
                type="password"
                placeholder={tSignup('passwordHint')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
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
              {loading ? tSignup('creating') : tSignup('create')}
            </button>
          </form>
        </div>

        <p className="text-center font-display text-[13px] text-ink-muted mt-5">
          {tSignup('hasAccount')}{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:opacity-75 transition-opacity">{tSignup('signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
