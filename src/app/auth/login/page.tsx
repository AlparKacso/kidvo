'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check role and redirect
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (user?.role === 'provider' || user?.role === 'both') {
      router.push('/listings')
    } else {
      router.push('/browse')
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-border rounded bg-bg font-body text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary focus:shadow-focus transition-all'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display font-bold text-[26px] leading-none tracking-tight">
            <span className="text-primary">kid</span>
            <span className="text-gold">vo</span>
          </span>
          <p className="text-sm text-ink-muted mt-2">Activities for kids in Timișoara</p>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h1 className="font-display text-lg font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink-muted mb-5">Sign in to your account</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">Email</label>
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
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">Password</label>
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
              <div className="bg-danger-lt border border-danger/20 text-danger text-sm rounded p-3">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-4">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-primary font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
