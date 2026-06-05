import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSpotOfferToParent } from '@/lib/email'
import { computeOccupancy } from '@/lib/classes'

// POST /api/offers — provider offers a waitlisted child a spot in a class.
// Body: { waitlist_entry_id, class_id, over_capacity? }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { waitlist_entry_id, class_id, over_capacity } = await req.json()
  if (!waitlist_entry_id || !class_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify the class belongs to the current provider.
  const { data: clsRaw } = await supabase
    .from('classes')
    .select('id, name, capacity, listing_id, provider:providers(user_id, display_name)')
    .eq('id', class_id)
    .single()
  const cls = clsRaw as {
    id: string; name: string; capacity: number | null; listing_id: string | null
    provider: { user_id: string; display_name: string } | null
  } | null
  if (!cls || cls.provider?.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify the waitlist entry is for one of this provider's listings (RLS already
  // scopes the read; this also fetches the snapshot we copy onto the roster).
  const { data: entryRaw } = await supabase
    .from('waitlist_entries')
    .select('id, listing_id, child_id, child_name, child_age, contact_name, contact_phone, contact_email, status, user_id, listing:listings(title)')
    .eq('id', waitlist_entry_id)
    .single()
  const entry = entryRaw as {
    id: string; listing_id: string; child_id: string | null; child_name: string; child_age: number | null
    contact_name: string | null; contact_phone: string | null; contact_email: string | null
    status: string; user_id: string; listing: { title: string } | null
  } | null
  if (!entry) return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })

  // Capacity check — enforced unless the provider confirmed over-capacity.
  if (!over_capacity && cls.capacity != null) {
    const { data: membersRaw } = await supabase
      .from('roster_members').select('status').eq('class_id', class_id)
    const occ = computeOccupancy((membersRaw ?? []) as { status: string }[])
    if (occ >= cls.capacity) {
      return NextResponse.json({ error: 'full', capacity: cls.capacity, occupancy: occ }, { status: 409 })
    }
  }

  // Create the offered roster member + the offer token.
  const { data: memberRaw, error: memberErr } = await supabase
    .from('roster_members')
    .insert({
      class_id,
      source:            'kidvo',
      status:            'offered',
      waitlist_entry_id: entry.id,
      child_id:          entry.child_id,
      child_name:        entry.child_name,
      child_age:         entry.child_age,
      contact_name:      entry.contact_name,
      contact_phone:     entry.contact_phone,
      contact_email:     entry.contact_email,
    })
    .select('id')
    .single()
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
  const memberId = (memberRaw as { id: string }).id

  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
  const { error: offerErr } = await supabase
    .from('offers')
    .insert({ waitlist_entry_id: entry.id, roster_member_id: memberId, class_id, token, phase: 'pending' })
  if (offerErr) return NextResponse.json({ error: offerErr.message }, { status: 500 })

  await supabase.from('waitlist_entries').update({ status: 'offered' }).eq('id', entry.id)

  // Email the parent with the tokenized Accept / Can't-make-it links.
  const adminDb = createAdminClient()
  const { data: parentRaw } = await adminDb
    .from('users').select('locale').eq('id', entry.user_id).single()
  const parentLocale = (parentRaw as { locale: string | null } | null)?.locale === 'en' ? 'en' : 'ro'

  if (entry.contact_email) {
    // Await — the offer email carries the parent's Accept link, so it must not
    // be dropped by the function freezing after `return` (fire-and-forget risk).
    await sendSpotOfferToParent({
      parentEmail:  entry.contact_email,
      parentName:   entry.contact_name ?? '',
      childName:    entry.child_name,
      providerName: cls.provider?.display_name ?? '',
      listingTitle: entry.listing?.title ?? cls.name,
      token,
      locale:       parentLocale,
    }).catch(e => console.error('[offer email]', e))
  }

  return NextResponse.json({ ok: true })
}
