import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeToParent, sendWelcomeToProvider } from '@/lib/email'
import type { Locale } from '@/lib/email-translations'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // `next` is set by deep links (e.g. signup with ?next=/browse/<id>). When absent,
  // we pick a role-appropriate landing below after the profile is loaded.
  const explicitNext = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData?.user) {
      const userId = sessionData.user.id

      // Read locale from cookie (set by LocaleToggle / next-intl)
      const localeCookie = cookieStore.get('NEXT_LOCALE')?.value
      const locale: Locale = localeCookie === 'en' ? 'en' : 'ro'

      // Hoisted so the role-based redirect below can read the role.
      let profile: { full_name?: string; role?: string; created_at?: string } | null = null

      try {
        const adminDb = createAdminClient()

        // Ensure the profile row exists — auto-create if create-profile failed at signup
        const { data: existing } = await adminDb
          .from('users')
          .select('full_name, role, created_at')
          .eq('id', userId)
          .single()
        profile = existing as typeof profile

        if (!profile) {
          const email    = sessionData.user.email ?? ''
          const meta     = sessionData.user.user_metadata ?? {}
          const fullName = (meta.full_name as string | undefined) ?? email.split('@')[0]
          const role     = (meta.role as string | undefined) ?? 'parent'
          const { data: created } = await adminDb
            .from('users')
            .insert({ id: userId, email, full_name: fullName, role, city: 'Timișoara', locale })
            .select('full_name, role, created_at')
            .single()
          profile = created as typeof profile
          console.warn('[callback] auto-created missing profile for', email)

          // If provider, create matching providers row so dashboard/listings work
          if (role === 'provider') {
            const { error: providerErr } = await adminDb.from('providers').upsert({
              user_id:       userId,
              display_name:  fullName,
              contact_email: email,
            }, { onConflict: 'user_id' })
            if (providerErr) {
              console.error('[callback] auto-create providers row failed:', providerErr)
            } else {
              console.warn('[callback] auto-created missing providers row for', email)
            }
          }
        }

        // Send welcome email for new accounts (created within the last 60 minutes)
        if (profile) {
          const ageMs = Date.now() - new Date((profile as any).created_at).getTime()
          const isNewAccount = ageMs < 60 * 60 * 1000

          if (isNewAccount) {
            const { email } = sessionData.user
            const name = (profile as any).full_name
            const role = (profile as any).role
            if (email && name) {
              if (role === 'provider') {
                sendWelcomeToProvider({ email, name, locale }).catch(err =>
                  console.error('[callback] welcome provider email error:', err)
                )
              } else {
                sendWelcomeToParent({ email, name, locale }).catch(err =>
                  console.error('[callback] welcome parent email error:', err)
                )
              }
            }
          }
        }
      } catch (err) {
        console.error('[callback] welcome email lookup error:', err)
      }

      // Default landing by role: parents → /browse, providers → /dashboard.
      // An explicit ?next= (e.g. deep links from "Book trial" buttons) wins.
      const role = (profile as { role?: string } | null)?.role
      const defaultLanding = role === 'provider' || role === 'both' ? '/dashboard' : '/browse'
      return NextResponse.redirect(`${origin}${explicitNext ?? defaultLanding}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
}
