import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistDeclineToParent } from '@/lib/email'

// DELETE /api/waitlist/[id] — provider removes a waiting family from the pool.
// Implemented as a status change (RLS grants providers UPDATE, not DELETE).
// ?decline=1 emails the family a polite "couldn't accommodate" note.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS scopes this read to entries on the provider's own listings.
  const { data: entryRaw } = await supabase
    .from('waitlist_entries')
    .select('id, user_id, contact_name, contact_email, listing:listings(title, provider:providers(display_name))')
    .eq('id', id)
    .single()
  const entry = entryRaw as {
    id: string; user_id: string; contact_name: string | null; contact_email: string | null
    listing: { title: string; provider: { display_name: string } | null } | null
  } | null
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sendDecline = new URL(req.url).searchParams.get('decline') === '1'
  if (sendDecline && entry.contact_email) {
    const adminDb = createAdminClient()
    const { data: uRaw } = await adminDb.from('users').select('locale').eq('id', entry.user_id).single()
    const locale = (uRaw as { locale: string | null } | null)?.locale === 'en' ? 'en' : 'ro'
    await sendWaitlistDeclineToParent({
      parentEmail:  entry.contact_email,
      parentName:   entry.contact_name ?? '',
      providerName: entry.listing?.provider?.display_name ?? '',
      listingTitle: entry.listing?.title ?? '',
      locale,
    }).catch(e => console.error('[waitlist decline email]', e))
  }

  return NextResponse.json({ ok: true })
}
