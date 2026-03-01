import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountDeletedConfirmation } from '@/lib/email'

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

  // Fetch name before deletion so we can personalise the goodbye email
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const adminDb = createAdminClient()
  const { error } = await adminDb.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send goodbye email after successful deletion (fire-and-forget)
  await sendAccountDeletedConfirmation({
    email: user.email!,
    name:  (profile as any)?.full_name ?? 'there',
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
