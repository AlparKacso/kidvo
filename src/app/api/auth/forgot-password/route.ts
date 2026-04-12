import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Use NEXT_PUBLIC_APP_URL as canonical origin so the reset link always points
  // to the primary domain — avoids issues when the request arrives via www or
  // a Vercel preview deployment.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const adminDb = createAdminClient()

  try {
    const { data, error } = await adminDb.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/auth/reset-password` },
    })

    if (error) {
      console.error('[forgot-password] generateLink failed:', error.message)
      // Return 500 so the client can display an error
      return NextResponse.json({ error: 'Could not generate reset link' }, { status: 500 })
    }

    if (data?.properties?.action_link) {
      // Fetch name for personalisation (best effort)
      const { data: profile } = await adminDb
        .from('users').select('full_name').eq('email', email).single()

      const result = await sendPasswordResetEmail({
        email,
        name: (profile as any)?.full_name ?? 'there',
        resetLink: data.properties.action_link,
      })

      if (result.error) {
        console.error('[forgot-password] Resend error:', result.error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
      }
    }
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
