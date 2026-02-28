'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id:        string
  full_name: string
  phone:     string | null
  city:      string
  role:      string
}

interface Provider {
  id:            string
  display_name:  string
  bio:           string | null
  contact_email: string
  contact_phone: string | null
}

interface Props {
  profile:  Profile | null
  provider: Provider | null
  email:    string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
        {label}{optional && <span className="text-ink-muted font-normal normal-case ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all"
const disabledCls = "w-full px-3 py-2 border border-border rounded bg-surface font-body text-sm text-ink-muted cursor-not-allowed"

export function SettingsClient({ profile, provider, email }: Props) {
  const isProvider = profile?.role === 'provider' || profile?.role === 'both'

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone,    setPhone]    = useState(profile?.phone     ?? '')

  // Provider fields
  const [displayName,  setDisplayName]  = useState(provider?.display_name  ?? '')
  const [bio,          setBio]          = useState(provider?.bio            ?? '')
  const [contactEmail, setContactEmail] = useState(provider?.contact_email ?? email)
  const [contactPhone, setContactPhone] = useState(provider?.contact_phone ?? '')

  const [profileState,  setProfileState]  = useState<SaveState>('idle')
  const [providerState, setProviderState] = useState<SaveState>('idle')
  const [profileError,  setProfileError]  = useState('')
  const [providerError, setProviderError] = useState('')

  // Password reset
  const [resetState,   setResetState]   = useState<'idle' | 'sending' | 'sent'>('idle')

  // Delete account
  const [deleteOpen,   setDeleteOpen]   = useState(false)
  const [deleteInput,  setDeleteInput]  = useState('')
  const [deleteState,  setDeleteState]  = useState<'idle' | 'deleting' | 'error'>('idle')
  const [deleteError,  setDeleteError]  = useState('')

  async function saveProfile() {
    if (!fullName.trim()) { setProfileError('Name is required.'); return }
    setProfileError('')
    setProfileState('saving')
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', profile!.id)

    if (error) { setProfileError(error.message); setProfileState('error') }
    else { setProfileState('saved'); setTimeout(() => setProfileState('idle'), 2500) }
  }

  async function saveProvider() {
    if (!displayName.trim()) { setProviderError('Display name is required.'); return }
    if (!contactEmail.trim()) { setProviderError('Contact email is required.'); return }
    setProviderError('')
    setProviderState('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProviderError('Not authenticated.'); setProviderState('error'); return }

    const { error } = await supabase
      .from('providers')
      .update({
        display_name:  displayName.trim(),
        bio:           bio.trim() || null,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || null,
      })
      .eq('user_id', user.id)

    if (error) { setProviderError(error.message); setProviderState('error') }
    else { setProviderState('saved'); setTimeout(() => setProviderState('idle'), 2500) }
  }

  async function sendResetLink() {
    setResetState('sending')
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    })
    setResetState('sent')
    setTimeout(() => setResetState('idle'), 5000)
  }

  async function deleteAccount() {
    if (deleteInput !== 'DELETE') return
    setDeleteState('deleting')
    setDeleteError('')
    const res = await fetch('/api/auth/delete-account', { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setDeleteError(body.error ?? 'Something went wrong. Please try again.')
      setDeleteState('error')
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        disabled={state === 'saving'}
        className="px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors"
      >
        {state === 'saving' ? 'Saving...' : state === 'saved' ? '✓ Saved' : 'Save changes'}
      </button>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">Settings</h1>
        <p className="text-sm text-ink-muted">Manage your account and profile</p>
      </div>

      <div className="flex flex-col gap-5 max-w-[600px]">

        {/* Account */}
        <Section title="Account">
          <div className="flex flex-col gap-4">
            <Field label="Email">
              <input type="email" value={email} disabled className={disabledCls} />
              <p className="text-[11px] text-ink-muted mt-1">Email cannot be changed.</p>
            </Field>
            <Field label="Full name">
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your full name" className={inputCls}
              />
            </Field>
            <Field label="Phone" optional>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+40 7xx xxx xxx" className={inputCls}
              />
            </Field>

            {profileError && (
              <div className="px-3 py-2 bg-danger-lt border border-danger/20 rounded text-sm text-danger">{profileError}</div>
            )}

            <div className="flex items-center justify-between pt-1">
              {profileState === 'saved' && (
                <span className="text-sm text-success font-display font-semibold">Changes saved.</span>
              )}
              <div className="ml-auto">
                <SaveButton state={profileState} onClick={saveProfile} />
              </div>
            </div>
          </div>
        </Section>

        {/* Provider profile */}
        {isProvider && provider && (
          <Section title="Provider profile">
            <div className="flex flex-col gap-4">
              <Field label="Display name">
                <input
                  type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your school or club name" className={inputCls}
                />
              </Field>
              <Field label="Bio" optional>
                <textarea
                  rows={4} value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="Tell parents about your program, experience, and approach..."
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <Field label="Contact email">
                <input
                  type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  placeholder="contact@yourschool.ro" className={inputCls}
                />
                <p className="text-[11px] text-ink-muted mt-1">Shown to parents after a confirmed trial request.</p>
              </Field>
              <Field label="Contact phone" optional>
                <input
                  type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  placeholder="+40 7xx xxx xxx" className={inputCls}
                />
              </Field>

              {providerError && (
                <div className="px-3 py-2 bg-danger-lt border border-danger/20 rounded text-sm text-danger">{providerError}</div>
              )}

              <div className="flex items-center justify-between pt-1">
                {providerState === 'saved' && (
                  <span className="text-sm text-success font-display font-semibold">Changes saved.</span>
                )}
                <div className="ml-auto">
                  <SaveButton state={providerState} onClick={saveProvider} />
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Plan */}
        <Section title="Plan">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-sm font-semibold text-ink capitalize">{profile?.role === 'provider' ? 'Provider' : 'Parent'} · Free plan</div>
              <div className="text-xs text-ink-muted mt-0.5">You're on the free plan. Premium features coming soon.</div>
            </div>
            <span className="px-2.5 py-1 rounded-full font-display text-[10px] font-semibold bg-surface text-ink-muted border border-border">Free</span>
          </div>
        </Section>

        {/* Sign out — mobile only (desktop has it in sidebar) */}
        <Section title="Session">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-sm font-semibold text-ink">Sign out</div>
              <div className="text-xs text-ink-muted mt-0.5">Sign out of your kidvo account on this device.</div>
            </div>
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                await createClient().auth.signOut()
                window.location.href = '/auth/login'
              }}
              className="px-3 py-1.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:border-danger/50 hover:text-danger hover:bg-danger-lt transition-all"
            >
              Sign out
            </button>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-sm font-semibold text-ink">Password</div>
              <div className="text-xs text-ink-muted mt-0.5">
                {resetState === 'sent'
                  ? 'Link sent! Check your inbox.'
                  : 'Send a reset link to your email address.'}
              </div>
            </div>
            <button
              onClick={sendResetLink}
              disabled={resetState === 'sending' || resetState === 'sent'}
              className="px-3 py-1.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:border-primary hover:text-primary hover:bg-primary-lt disabled:opacity-50 transition-all"
            >
              {resetState === 'sending' ? 'Sending…' : resetState === 'sent' ? '✓ Sent' : 'Send reset link'}
            </button>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          {!deleteOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-sm font-semibold text-ink">Delete account</div>
                <div className="text-xs text-ink-muted mt-0.5">Permanently delete your account and all data.</div>
              </div>
              <button
                onClick={() => setDeleteOpen(true)}
                className="px-3 py-1.5 rounded font-display text-sm font-semibold border border-danger/40 text-danger hover:bg-danger-lt transition-all"
              >
                Delete account
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-danger-lt border border-danger/20 rounded-lg">
                <p className="text-sm text-danger font-display font-semibold mb-0.5">This is permanent and cannot be undone.</p>
                <p className="text-xs text-danger/80">Your account, listings, reviews, trial requests and saves will all be deleted.</p>
              </div>
              <div>
                <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                  Type <span className="text-danger">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-danger transition-all"
                />
              </div>
              {deleteError && (
                <div className="px-3 py-2 bg-danger-lt border border-danger/20 rounded text-sm text-danger">{deleteError}</div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setDeleteOpen(false); setDeleteInput(''); setDeleteError('') }}
                  className="px-4 py-2 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleteInput !== 'DELETE' || deleteState === 'deleting'}
                  className="px-4 py-2 rounded font-display text-sm font-semibold bg-danger text-white disabled:opacity-40 hover:opacity-90 transition-all"
                >
                  {deleteState === 'deleting' ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
