import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/update-locale
// Persists the user's locale preference to the DB so recipient-facing emails
// (sent by other users or cron) use the correct language.
export async function POST(req: Request) {
  const { locale } = await req.json().catch(() => ({}))
  if (locale !== 'ro' && locale !== 'en') {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('users')
    .update({ locale })
    .eq('id', user.id)

  if (error) {
    console.error('[update-locale] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
