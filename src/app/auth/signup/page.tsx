'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [role, setRole]           = useState<'parent' | 'provider'>('parent')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Create auth user
    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Signup failed — please try again.')
      setLoading(false)
      return
    }

    // Create users row
    const { error: userError } = await supabase.from('users').insert({
      id:        data.user.id,
      email,
      full_name: fullName,
      role,
      city:      'Timișoara',
    })

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    // If provider, create providers row
    if (role === 'provider') {
      await supabase.from('providers').insert({
        user_id:       data.user.id,
        display_name:  fullName,
        contact_email: email,
      })
      router.push('/browse')
    } else {
      router.push('/browse')
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-border rounded bg-bg font-body text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary focus:shadow-focus transition-all'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display font-bold text-[26px] leading-none tracking-tight">
            <span className="text-primary">k</span>
            <span className="text-gold">i</span>
            <span className="text-primary">ndo</span>
          </span>
          <p className="text-sm text-ink-muted mt-2">Activities for kids in Timișoara</p>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h1 className="font-display text-lg font-bold text-ink mb-1">Create account</h1>
          <p className="text-sm text-ink-muted mb-5">Join kidvo today</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">

            {/* Role selector */}
            <div>
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {(['parent', 'provider'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'py-2.5 rounded border font-display text-sm font-semibold transition-all',
                      role === r
                        ? 'bg-primary-lt border-primary text-primary'
                        : 'bg-bg border-border text-ink-mid hover:border-primary'
                    )}
                  >
                    {r === 'parent' ? '👨‍👧 Parent' : '🏫 Provider'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted mt-1.5">
                {role === 'parent'
                  ? 'Browse and book activities for your kids'
                  : 'List and manage your activities'}
              </p>
            </div>

            <div>
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">Full name</label>
              <input
                className={inputCls}
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

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
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
