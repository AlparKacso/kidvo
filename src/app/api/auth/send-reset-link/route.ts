import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'
import type { Locale } from '@/lib/email-translations'

// POST /api/auth/send-reset-link
// Generates a password-recovery link via the admin SDK (so we control the email)
// and sends it as a kidvo-branded email via Resend.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()
  // Use NEXT_PUBLIC_APP_URL as canonical origin so the reset link always points
  // to the primary domain — avoids issues when the request arrives via www or
  // a Vercel preview deployment.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  const { data, error } = await adminDb.auth.admin.generateLink({
    type:    'recovery',
    email:   user.email,
    options: { redirectTo: `${origin}/auth/reset-password` },
  })

  if (error) {
    console.error('Generate reset link error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, locale')
    .eq('id', user.id)
    .single()

  // Prefer stored locale, fall back to cookie
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  const locale: Locale = ((profile as any)?.locale || cookieLocale || 'ro') === 'en' ? 'en' : 'ro'

  const result = await sendPasswordResetEmail({
    email:     user.email,
    name:      (profile as any)?.full_name ?? 'there',
    resetLink: data.properties.action_link,
    locale,
  })

  if (result.error) {
    console.error('[send-reset-link] Resend error:', result.error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
