import { NextResponse } from 'next/server'
import { sendWelcomeToParent, sendWelcomeToProvider } from '@/lib/email'
import type { Locale } from '@/lib/email-translations'

// POST /api/auth/welcome — send role-specific welcome email after signup
export async function POST(request: Request) {
  const { email, name, role, locale: rawLocale } = await request.json()

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const locale: Locale = rawLocale === 'en' ? 'en' : 'ro'

  try {
    if (role === 'provider') {
      await sendWelcomeToProvider({ email, name, locale })
    } else {
      await sendWelcomeToParent({ email, name, locale })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
