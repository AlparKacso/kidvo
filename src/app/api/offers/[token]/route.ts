import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEnrollmentToParent, sendEnrollmentToProvider } from '@/lib/email'

// Public, no-auth tokenized offer response. Validated solely by the unguessable
// token, so it always runs through the service-role (admin) client.

interface OfferRow {
  id: string
  phase: string
  roster_member_id: string | null
  waitlist_entry_id: string
  class_id: string
  entry: {
    child_name: string
    contact_name: string | null
    contact_email: string | null
    user_id: string
    listing: { title: string } | null
  } | null
  class: {
    name: string
    provider: {
      display_name: string
      contact_email: string | null
      contact_phone: string | null
      user: { email: string | null; locale: string | null } | null
    } | null
  } | null
}

const SELECT = `
  id, phase, roster_member_id, waitlist_entry_id, class_id,
  entry:waitlist_entries(child_name, contact_name, contact_email, user_id, listing:listings(title)),
  class:classes(name, provider:providers(display_name, contact_email, contact_phone, user:users(email, locale)))
`

async function loadOffer(adminDb: ReturnType<typeof createAdminClient>, token: string) {
  const { data } = await adminDb.from('offers').select(SELECT).eq('token', token).single()
  return data as unknown as OfferRow | null
}

function summary(offer: OfferRow) {
  return {
    childName:    offer.entry?.child_name ?? '',
    listingTitle: offer.entry?.listing?.title ?? offer.class?.name ?? '',
    providerName: offer.class?.provider?.display_name ?? '',
  }
}

// GET — landing page reads the offer to render the child/listing + current phase.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const adminDb = createAdminClient()
  const offer = await loadOffer(adminDb, token)
  if (!offer) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ phase: offer.phase, ...summary(offer) })
}

// POST — { action: 'accept' | 'decline' }
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { action } = await req.json().catch(() => ({}))
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'bad_action' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const offer = await loadOffer(adminDb, token)
  if (!offer) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Idempotent: a second click just reports the settled state.
  if (offer.phase !== 'pending') {
    return NextResponse.json({ phase: offer.phase, ...summary(offer), already: true })
  }

  const now = new Date().toISOString()
  const prov   = offer.class?.provider
  const entry  = offer.entry
  const locale = (k: string | null | undefined) => (k === 'en' ? 'en' : 'ro') as 'en' | 'ro'

  if (action === 'accept') {
    if (offer.roster_member_id) {
      await adminDb.from('roster_members').update({ status: 'enrolled', updated_at: now }).eq('id', offer.roster_member_id)
    }
    await adminDb.from('waitlist_entries').update({ status: 'enrolled' }).eq('id', offer.waitlist_entry_id)
    await adminDb.from('offers').update({ phase: 'accepted', responded_at: now }).eq('id', offer.id)

    const { data: parentRaw } = await adminDb.from('users').select('locale').eq('id', entry?.user_id ?? '').single()
    const parentLocale = locale((parentRaw as { locale: string | null } | null)?.locale)
    const providerEmail = prov?.contact_email || prov?.user?.email || ''

    // AWAIT both (concurrently) — fire-and-forget sends get cut off when the
    // Vercel function freezes after `return`, dropping the second (provider) one.
    const sends: Promise<unknown>[] = []
    if (entry?.contact_email) {
      sends.push(sendEnrollmentToParent({
        parentEmail:   entry.contact_email,
        parentName:    entry.contact_name ?? '',
        childName:     entry.child_name,
        listingTitle:  entry.listing?.title ?? offer.class?.name ?? '',
        providerName:  prov?.display_name ?? '',
        providerEmail,
        providerPhone: prov?.contact_phone ?? null,
        locale:        parentLocale,
      }))
    }
    if (providerEmail) {
      sends.push(sendEnrollmentToProvider({
        providerEmail,
        parentName:   entry?.contact_name ?? '',
        childName:    entry?.child_name ?? '',
        listingTitle: entry?.listing?.title ?? offer.class?.name ?? '',
        locale:       locale(prov?.user?.locale),
      }))
    }
    for (const r of await Promise.allSettled(sends)) {
      if (r.status === 'rejected') console.error('[enroll email]', r.reason)
    }

    return NextResponse.json({ phase: 'accepted', ...summary(offer) })
  }

  // decline → free the spot, return the family to the pool
  if (offer.roster_member_id) {
    await adminDb.from('roster_members').delete().eq('id', offer.roster_member_id)
  }
  await adminDb.from('waitlist_entries').update({ status: 'waiting' }).eq('id', offer.waitlist_entry_id)
  await adminDb.from('offers').update({ phase: 'declined', responded_at: now }).eq('id', offer.id)

  return NextResponse.json({ phase: 'declined', ...summary(offer) })
}
