import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/calendar — parent-side actions on their own family-calendar entries.
// Body: { source: 'roster' | 'waitlist', id, action: 'withdraw' | 'leave' }
//   roster + withdraw → cancel a pending enroll request
//   waitlist + leave  → leave the waitlist
// Ownership is verified server-side (the entry must belong to the caller's
// children / account), then mutated with the service-role client — parents have
// no write RLS on roster_members or waitlist_entries.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { source, id, action } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const adminDb = createAdminClient()

  if (source === 'roster' && action === 'withdraw') {
    const { data: mRaw } = await adminDb
      .from('roster_members').select('id, status, child_id').eq('id', id).single()
    const member = mRaw as { id: string; status: string; child_id: string | null } | null
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (member.status !== 'requested') return NextResponse.json({ error: 'not_pending' }, { status: 409 })

    // Verify the child belongs to the caller.
    if (!member.child_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: childRaw } = await adminDb
      .from('children').select('user_id').eq('id', member.child_id).single()
    if ((childRaw as { user_id: string } | null)?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await adminDb.from('roster_members').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (source === 'waitlist' && action === 'leave') {
    const { data: eRaw } = await adminDb
      .from('waitlist_entries').select('id, user_id').eq('id', id).single()
    const entry = eRaw as { id: string; user_id: string } | null
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await adminDb.from('waitlist_entries').update({ status: 'removed' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'bad_action' }, { status: 400 })
}
