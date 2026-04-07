import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeToParent, sendWelcomeToProvider } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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

      // Send welcome email for new accounts (created within the last 60 minutes)
      try {
        const adminDb = createAdminClient()
        const { data: profile } = await adminDb
          .from('users')
          .select('full_name, role, created_at')
          .eq('id', userId)
          .single()

        if (profile) {
          const ageMs = Date.now() - new Date((profile as any).created_at).getTime()
          const isNewAccount = ageMs < 60 * 60 * 1000 // under 60 minutes old

          if (isNewAccount) {
            const { email } = sessionData.user
            const name = (profile as any).full_name
            const role = (profile as any).role
            if (email && name) {
              if (role === 'provider') {
                sendWelcomeToProvider({ email, name }).catch(err =>
                  console.error('[callback] welcome provider email error:', err)
                )
              } else {
                sendWelcomeToParent({ email, name }).catch(err =>
                  console.error('[callback] welcome parent email error:', err)
                )
              }
            }
          }
        }
      } catch (err) {
        console.error('[callback] welcome email lookup error:', err)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
}
