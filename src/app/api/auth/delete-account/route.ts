import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/auth/delete-account
// Permanently deletes the authenticated user's account.
// Uses the service-role admin client to bypass RLS and delete the auth user.
// Supabase cascades remove the users row and all dependent rows
// (providers, trial_requests, saves, reviews).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()
  const { error } = await adminDb.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
