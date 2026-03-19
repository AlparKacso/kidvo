import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id } = await req.json()
  if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 })

  await supabase
    .from('contact_reveals')
    .insert({ listing_id, user_id: user.id })

  return NextResponse.json({ ok: true })
}
