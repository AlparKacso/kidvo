import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewListingToAdmin } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { listingId, listingTitle } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileRaw } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const profile = profileRaw as unknown as { full_name: string } | null

    await sendNewListingToAdmin({
      listingId,
      listingTitle,
      providerName:  profile?.full_name ?? 'Unknown',
      providerEmail: user.email ?? '',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
