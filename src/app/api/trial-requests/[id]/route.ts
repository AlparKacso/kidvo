import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTrialCancelledByParent } from '@/lib/email'
import { autoEnrolConfirmedTrial, sendTrialStatusEmail } from '@/lib/trials'

// PATCH — provider confirms or declines a pending trial request, from the
// Classes board's docked listing panel. Body: { action: 'confirm' | 'decline',
//   class_id?: string }. Confirming enrols the child into the given class
// (the selected cohort) and emails the parent — the same path as the Listings
// Trial-requests tab, so both surfaces stay in lockstep.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, class_id } = await req.json()
  if (action !== 'confirm' && action !== 'decline') {
    return NextResponse.json({ error: 'bad_action' }, { status: 400 })
  }

  // The trial must target a listing this provider owns. Verify via the
  // listing→provider→user_id chain (RLS lets a provider read their listings).
  const { data: trialRaw } = await supabase
    .from('trial_requests')
    .select('id, status, listing:listings(provider:providers(user_id))')
    .eq('id', id)
    .single()
  const trial = trialRaw as {
    id: string; status: string
    listing: { provider: { user_id: string } | null } | null
  } | null
  if (!trial || trial.listing?.provider?.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (trial.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending' }, { status: 409 })
  }

  const status = action === 'confirm' ? 'confirmed' : 'declined'
  const { error } = await supabase
    .from('trial_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendTrialStatusEmail(id)
  if (action === 'confirm') {
    await autoEnrolConfirmedTrial(id, { classId: typeof class_id === 'string' ? class_id : undefined })
  }

  return NextResponse.json({ ok: true })
}

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
    .select('id, user_id, status, listing_id')
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
    const [{ data: listingRaw }, { data: parentRaw }] = await Promise.all([
      supabase.from('listings').select('title, provider_id').eq('id', (trial as any).listing_id).single(),
      supabase.from('users').select('full_name, email, phone').eq('id', user.id).single(),
    ])
    if (listingRaw) {
      const { data: provRaw } = await supabase
        .from('providers')
        .select('display_name, contact_email, user:users(email, full_name, locale)')
        .eq('id', (listingRaw as any).provider_id)
        .single()
      const p   = provRaw   as any
      const par = parentRaw as { full_name: string | null; email: string | null; phone: string | null } | null
      const providerEmail = p?.contact_email || p?.user?.email || ''
      if (providerEmail) {
        await sendTrialCancelledByParent({
          providerEmail,
          providerName:  p?.display_name || p?.user?.full_name || 'there',
          listingTitle:  (listingRaw as any).title,
          parentName:    par?.full_name ?? null,
          parentEmail:   par?.email     ?? null,
          parentPhone:   par?.phone     ?? null,
          locale:        p?.user?.locale === 'en' ? 'en' : 'ro',
        }).catch(() => {})
      }
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
