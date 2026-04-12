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
    const { data: listingRaw } = await supabase
      .from('listings').select('title, provider_id').eq('id', (trial as any).listing_id).single()
    if (listingRaw) {
      const { data: provRaw } = await supabase
        .from('providers')
        .select('display_name, contact_email, user:users(email, full_name, locale)')
        .eq('id', (listingRaw as any).provider_id)
        .single()
      const p = provRaw as any
      const providerEmail = p?.contact_email || p?.user?.email || ''
      if (providerEmail) {
        await sendTrialCancelledByParent({
          providerEmail,
          providerName:  p?.display_name || p?.user?.full_name || 'there',
          listingTitle:  (listingRaw as any).title,
          locale:        p?.user?.locale === 'en' ? 'en' : 'ro',
        }).catch(() => {})
      }
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
