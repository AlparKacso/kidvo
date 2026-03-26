import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Derive origin from the actual request — works on prod, staging and localhost
  const origin = new URL(req.url).origin
  const adminDb = createAdminClient()

  try {
    const { data, error } = await adminDb.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/auth/reset-password` },
    })
    if (!error && data?.properties?.action_link) {
      // Fetch name for personalisation (best effort)
      const { data: profile } = await adminDb
        .from('users').select('full_name').eq('email', email).single()
      await sendPasswordResetEmail({
        email,
        name: (profile as any)?.full_name ?? 'there',
        resetLink: data.properties.action_link,
      }).catch(() => {})
    }
  } catch {}

  // Always return ok — don't reveal whether email exists
  return NextResponse.json({ ok: true })
}
