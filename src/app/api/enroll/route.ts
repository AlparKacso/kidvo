import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureClassForListing } from '@/lib/classes'
import { sendEnrollRequestToParent, sendNewEnrollRequestToProvider } from '@/lib/email'

// POST /api/enroll — parent requests to enroll a child in a listing's class.
// Request-to-confirm: creates a `requested` roster member; the provider confirms
// in the manager. Body: { listing_id, child_id?, child_name, child_age?, note? }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, child_id, child_name, child_age, note } = await req.json()
  if (!listing_id || !child_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Ensure the user has a profile row (auto-create if missing, mirroring /api/waitlist).
  const { data: existingProfile } = await adminDb
    .from('users').select('id, full_name, email, phone, locale').eq('id', user.id).single()
  let profile = existingProfile as { id: string; full_name: string | null; email: string | null; phone: string | null; locale: string | null } | null
  if (!profile) {
    const email    = user.email ?? ''
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]
    await adminDb.from('users').insert({ id: user.id, email, full_name: fullName, role: 'parent', city: 'Timișoara' })
    profile = { id: user.id, full_name: fullName, email, phone: null, locale: 'ro' }
  }

  // Resolve (or lazily create) the class backing this listing's roster.
  const classId = await ensureClassForListing(adminDb, listing_id)
  if (!classId) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Don't double-book: one active relationship per child per class.
  if (child_id) {
    const { data: dup } = await adminDb
      .from('roster_members').select('id')
      .eq('class_id', classId).eq('child_id', child_id)
      .in('status', ['requested', 'offered', 'enrolled'])
      .maybeSingle()
    if (dup) return NextResponse.json({ error: 'already' }, { status: 409 })
  }

  // Capacity gate — requested/offered/enrolled all count so we never over-request.
  const { data: clsRaw } = await adminDb.from('classes').select('capacity').eq('id', classId).single()
  const capacity = (clsRaw as { capacity: number | null } | null)?.capacity ?? null
  if (capacity != null) {
    const { data: membersRaw } = await adminDb.from('roster_members').select('status').eq('class_id', classId)
    const occ = ((membersRaw ?? []) as { status: string }[])
      .filter(m => m.status === 'offered' || m.status === 'enrolled' || m.status === 'requested').length
    if (occ >= capacity) return NextResponse.json({ error: 'full' }, { status: 409 })
  }

  const { error: insErr } = await adminDb
    .from('roster_members')
    .insert({
      class_id:      classId,
      source:        'kidvo',
      status:        'requested',
      child_id:      child_id ?? null,
      child_name,
      child_age:     typeof child_age === 'number' ? child_age : null,
      contact_name:  profile?.full_name ?? null,
      contact_phone: profile?.phone ?? null,
      contact_email: profile?.email ?? null,
      note:          note || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Resolve provider + listing for the notification emails.
  const { data: listingRaw } = await adminDb
    .from('listings').select('title, provider_id').eq('id', listing_id).single()
  const listing = listingRaw as { title: string; provider_id: string } | null

  let providerEmail = ''
  let providerName  = ''
  let providerLocale: 'en' | 'ro' = 'ro'
  if (listing?.provider_id) {
    const { data: prov } = await adminDb
      .from('providers')
      .select('display_name, contact_email, user:users(email, locale)')
      .eq('id', listing.provider_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = prov as any
    providerName   = p?.display_name ?? ''
    providerEmail  = p?.contact_email || p?.user?.email || ''
    providerLocale = p?.user?.locale === 'en' ? 'en' : 'ro'
  }

  const parentLocale = profile?.locale === 'en' ? 'en' : 'ro'

  // AWAIT both sends (concurrently) — fire-and-forget gets dropped when the
  // Vercel function freezes after `return` (same fix as /api/waitlist).
  const sends: Promise<unknown>[] = []
  if (listing && profile?.email) {
    sends.push(sendEnrollRequestToParent({
      parentEmail:  profile.email,
      parentName:   profile.full_name ?? '',
      childName:    child_name,
      listingTitle: listing.title,
      providerName,
      locale:       parentLocale,
    }))
  }
  if (listing && providerEmail) {
    sends.push(sendNewEnrollRequestToProvider({
      providerEmail,
      parentName:   profile?.full_name ?? '',
      childName:    child_name,
      childAge:     typeof child_age === 'number' ? child_age : null,
      listingTitle: listing.title,
      locale:       providerLocale,
    }))
  }
  for (const r of await Promise.allSettled(sends)) {
    if (r.status === 'rejected') console.error('[enroll email]', r.reason)
  }

  return NextResponse.json({ ok: true })
}
