import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewTrialRequestToProvider } from '@/lib/email'

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, preferred_day, message, child_id, phone } = await req.json()
  if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 })

  // Ensure the user has a profile row — auto-create if missing (e.g. if create-profile failed at signup)
  const adminDb = createAdminClient()
  const { data: existingProfile } = await adminDb.from('users').select('id, phone').eq('id', user.id).single()
  if (!existingProfile) {
    const email    = user.email ?? ''
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]
    await adminDb.from('users').insert({ id: user.id, email, full_name: fullName, role: 'parent', city: 'Timișoara' })
    console.warn('[trial] auto-created missing user profile for', email)
  }

  // If the parent supplied a phone in the booking modal AND has none on file, save it back to the profile.
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : ''
  const phoneRegex   = /^[+\d\s\-()]{7,20}$/
  if (trimmedPhone && phoneRegex.test(trimmedPhone) && !(existingProfile as any)?.phone) {
    const { error: phoneErr } = await adminDb
      .from('users')
      .update({ phone: trimmedPhone })
      .eq('id', user.id)
    if (phoneErr) console.error('[trial] phone save error:', phoneErr.message)
  }

  const { data: request, error } = await supabase
    .from('trial_requests')
    .insert({ listing_id, user_id: user.id, preferred_day, message: message || null, status: 'pending', child_id: child_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ data: listingRaw }, { data: parentRaw }] = await Promise.all([
    adminDb.from('listings').select('title, provider_id').eq('id', listing_id).single(),
    adminDb.from('users').select('full_name, email, phone').eq('id', user.id).single(),
  ])

  const listing = listingRaw as any
  const parent  = parentRaw  as { full_name: string; email: string; phone: string | null } | null

  let providerEmail  = ''
  let providerName   = ''
  let providerLocale = 'ro'
  if (listing?.provider_id) {
    const { data: prov, error: provErr } = await adminDb
      .from('providers')
      .select('display_name, contact_email, user:users(email, full_name, locale)')
      .eq('id', listing.provider_id)
      .single()
    if (provErr) console.error('[trial] provider fetch error:', provErr.message)
    const p = prov as any
    providerEmail  = p?.contact_email || p?.user?.email || ''
    providerName   = p?.display_name  || p?.user?.full_name || providerEmail
    providerLocale = p?.user?.locale || 'ro'
  }

  if (providerEmail && parent && listing) {
    try {
      const r = await sendNewTrialRequestToProvider({
        providerEmail,
        parentName:   parent.full_name,
        parentEmail:  parent.email,
        parentPhone:  parent.phone,
        listingTitle: listing.title,
        preferredDay: preferred_day !== null ? DAYS[preferred_day] : null,
        message:      message || null,
        locale:       providerLocale === 'en' ? 'en' : 'ro',
      })
      console.log('[trial email] sent:', JSON.stringify(r))
    } catch (e) {
      console.error('[trial email] error:', e)
    }
  } else {
    console.error('[trial email] skipped — providerEmail:', providerEmail, 'parent:', parent?.email, 'listing:', listing?.title)
  }

  return NextResponse.json({ request })
}
