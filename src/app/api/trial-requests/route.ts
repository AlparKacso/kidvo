import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewTrialRequestToProvider } from '@/lib/email'

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, preferred_day, message, child_id } = await req.json()
  if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 })

  const { data: request, error } = await supabase
    .from('trial_requests')
    .insert({ listing_id, user_id: user.id, preferred_day, message: message || null, status: 'pending', child_id: child_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ data: listingRaw }, { data: parentRaw }] = await Promise.all([
    supabase.from('listings').select('title, provider_id').eq('id', listing_id).single(),
    supabase.from('users').select('full_name, email').eq('id', user.id).single(),
  ])

  const listing = listingRaw as any
  const parent  = parentRaw  as { full_name: string; email: string } | null

  // Fetch provider separately for reliable contact_email (avoid join array/null issues)
  let providerEmail = ''
  let providerName  = ''
  if (listing?.provider_id) {
    const { data: prov, error: provErr } = await supabase
      .from('providers')
      .select('display_name, contact_email, user:users(email, full_name)')
      .eq('id', listing.provider_id)
      .single()
    if (provErr) console.error('[trial] provider fetch error:', provErr.message)
    const p = prov as any
    providerEmail = p?.contact_email || p?.user?.email || ''
    providerName  = p?.display_name  || p?.user?.full_name || providerEmail
  }

  if (providerEmail && parent && listing) {
    sendNewTrialRequestToProvider({
      providerEmail,
      parentName:   parent.full_name,
      parentEmail:  parent.email,
      listingTitle: listing.title,
      preferredDay: preferred_day !== null ? DAYS[preferred_day] : null,
      message:      message || null,
    })
      .then(r  => console.log('[trial email] sent:', JSON.stringify(r)))
      .catch(e => console.error('[trial email] error:', e))
  } else {
    console.error('[trial email] skipped — providerEmail:', providerEmail, 'parent:', parent?.email, 'listing:', listing?.title)
  }

  return NextResponse.json({ request })
}
