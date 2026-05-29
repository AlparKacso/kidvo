import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendContactRevealToProvider } from '@/lib/email'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id } = await req.json()
  if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 })

  await supabase
    .from('contact_reveals')
    .insert({ listing_id, user_id: user.id })

  notifyProvider(listing_id, user.id).catch(e => console.error('[contact-reveal email] error:', e))

  return NextResponse.json({ ok: true })
}

async function notifyProvider(listingId: string, userId: string) {
  const adminDb = createAdminClient()

  const [{ data: listingRaw }, { data: parentRaw }] = await Promise.all([
    adminDb.from('listings').select('title, provider_id').eq('id', listingId).single(),
    adminDb.from('users').select('full_name, email, phone').eq('id', userId).single(),
  ])

  const listing = listingRaw as { title: string; provider_id: string | null } | null
  const parent  = parentRaw  as { full_name: string; email: string; phone: string | null } | null
  if (!listing?.provider_id || !parent) return

  const { data: prov } = await adminDb
    .from('providers')
    .select('display_name, contact_email, user:users(email, full_name, locale)')
    .eq('id', listing.provider_id)
    .single()

  const p = prov as any
  const providerEmail = p?.contact_email || p?.user?.email || ''
  if (!providerEmail) return

  // At signup the name can fall back to the email local-part (e.g. "andrei.popescu").
  // Treat that as "no real name" so we say "A parent" rather than show junk.
  const localPart = (parent.email || '').split('@')[0]
  const rawName   = (parent.full_name || '').trim()
  const realName  = rawName && rawName !== localPart && !rawName.includes('@') ? rawName : null

  await sendContactRevealToProvider({
    providerEmail,
    providerName: p?.display_name || p?.user?.full_name || providerEmail,
    listingTitle: listing.title,
    parentName:   realName,
    parentEmail:  parent.email,
    parentPhone:  parent.phone,
    locale:       p?.user?.locale === 'en' ? 'en' : 'ro',
  })
}
