import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'

// POST /api/auth/send-reset-link
// Generates a password-recovery link via the admin SDK (so we control the email)
// and sends it as a kidvo-branded email via Resend.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'

  const { data, error } = await adminDb.auth.admin.generateLink({
    type:    'recovery',
    email:   user.email,
    options: { redirectTo: `${appUrl}/auth/reset-password` },
  })

  if (error) {
    console.error('Generate reset link error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  await sendPasswordResetEmail({
    email:     user.email,
    name:      (profile as any)?.full_name ?? 'there',
    resetLink: data.properties.action_link,
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
