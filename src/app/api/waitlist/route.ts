import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistConfirmationToParent, sendNewWaitlistEntryToProvider } from '@/lib/email'
import { waitlistPosition } from '@/lib/classes'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { listing_id, child_id, child_name, child_age, preferred_days, note } = body
  if (!listing_id || !child_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Ensure the user has a profile row (auto-create if missing, mirroring /api/trial-requests).
  const { data: existingProfile } = await adminDb
    .from('users').select('id, full_name, email, phone, locale').eq('id', user.id).single()
  let profile = existingProfile as { id: string; full_name: string | null; email: string | null; phone: string | null; locale: string | null } | null
  if (!profile) {
    const email    = user.email ?? ''
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]
    await adminDb.from('users').insert({ id: user.id, email, full_name: fullName, role: 'parent', city: 'Timișoara' })
    profile = { id: user.id, full_name: fullName, email, phone: null, locale: 'ro' }
  }

  const days: number[] = Array.isArray(preferred_days)
    ? preferred_days.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
    : []

  // Insert the entry (RLS: parent can insert their own).
  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      listing_id,
      user_id:        user.id,
      child_id:       child_id ?? null,
      child_name,
      child_age:      typeof child_age === 'number' ? child_age : null,
      preferred_days: days,
      note:           note || null,
      contact_name:   profile?.full_name ?? null,
      contact_phone:  profile?.phone ?? null,
      contact_email:  profile?.email ?? null,
      status:         'waiting',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entryId  = (entry as { id: string }).id
  const position = await waitlistPosition(adminDb, listing_id, entryId)

  // Resolve provider + listing for the emails.
  const { data: listingRaw } = await adminDb
    .from('listings').select('title, provider_id').eq('id', listing_id).single()
  const listing = listingRaw as { title: string; provider_id: string } | null

  let providerEmail = ''
  let providerLocale: 'en' | 'ro' = 'ro'
  if (listing?.provider_id) {
    const { data: prov } = await adminDb
      .from('providers')
      .select('contact_email, user:users(email, locale)')
      .eq('id', listing.provider_id)
      .single()
    const p = prov as any
    providerEmail  = p?.contact_email || p?.user?.email || ''
    providerLocale = p?.user?.locale === 'en' ? 'en' : 'ro'
  }

  const parentLocale = profile?.locale === 'en' ? 'en' : 'ro'
  const preferredDaysStr = days.length > 0 ? days.map(d => DAYS[d]).join(', ') : null

  // AWAIT both emails (concurrently) before responding. Fire-and-forget sends
  // are cut off when the Vercel function freezes after `return` — the second
  // (provider) send was the one getting dropped, so providers never heard about
  // a new waitlist signup. Awaiting guarantees both reach Resend.
  const sends: Promise<unknown>[] = []
  if (listing && profile?.email) {
    sends.push(sendWaitlistConfirmationToParent({
      parentEmail:  profile.email,
      parentName:   profile.full_name ?? '',
      childName:    child_name,
      listingTitle: listing.title,
      position,
      locale:       parentLocale,
    }))
  }
  if (listing && providerEmail) {
    sends.push(sendNewWaitlistEntryToProvider({
      providerEmail,
      listingTitle:  listing.title,
      childName:     child_name,
      childAge:      typeof child_age === 'number' ? child_age : null,
      parentName:    profile?.full_name ?? '',
      parentPhone:   profile?.phone ?? null,
      preferredDays: preferredDaysStr,
      note:          note || null,
      locale:        providerLocale,
    }))
  }
  for (const r of await Promise.allSettled(sends)) {
    if (r.status === 'rejected') console.error('[waitlist email]', r.reason)
  }

  return NextResponse.json({ position })
}
