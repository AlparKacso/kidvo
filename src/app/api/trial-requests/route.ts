import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewTrialRequestToProvider } from '@/lib/email'

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kindo.ro'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, preferred_day, message } = await req.json()
  if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 })

  const { data: request, error } = await supabase
    .from('trial_requests')
    .insert({ listing_id, user_id: user.id, preferred_day, message: message || null, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ data: listingRaw }, { data: parentRaw }] = await Promise.all([
    supabase.from('listings').select('title, provider:providers(contact_email, display_name)').eq('id', listing_id).single(),
    supabase.from('users').select('full_name, email').eq('id', user.id).single(),
  ])

  const listing = listingRaw as unknown as any | null
  const parent  = parentRaw  as unknown as { full_name: string; email: string } | null

  const provider = listing?.provider

  if (provider?.contact_email && parent && listing) {
    sendNewTrialRequestToProvider({
      providerEmail: provider.contact_email,
      parentName:    parent.full_name,
      parentEmail:   parent.email,
      listingTitle:  (listing as any).title,
      preferredDay:  preferred_day !== null ? DAYS[preferred_day] : null,
      message:       message || null,
    })
      .then(r  => console.log('[email] sent:', JSON.stringify(r)))
      .catch(e => console.error('[email] error:', e))
  } else {
    console.log('[email] skipped — provider:', provider, 'parent:', parent, 'listing:', listing)
  }

  return NextResponse.json({ request })
}
