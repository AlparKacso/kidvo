import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTrialCancelledByParent } from '@/lib/email'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the trial request to verify ownership
  const { data: trial, error: fetchErr } = await supabase
    .from('trial_requests')
    .select('id, user_id, status, listing_id, listings(title, provider_id, providers(contact_email, display_name))')
    .eq('id', id)
    .single()

  if (fetchErr || !trial) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((trial as any).user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if ((trial as any).status === 'cancelled') return NextResponse.json({ ok: true })

  const { error: updateErr } = await supabase
    .from('trial_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Notify provider (fire-and-forget)
  try {
    const listing = (trial as any).listings
    const provider = listing?.providers
    if (provider?.contact_email) {
      await sendTrialCancelledByParent({
        providerEmail: provider.contact_email,
        providerName:  provider.display_name ?? 'there',
        listingTitle:  listing.title,
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
