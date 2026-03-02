import { NextResponse }         from 'next/server'
import { createClient }         from '@/lib/supabase/server'
import { sendProviderFeedback } from '@/lib/email'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const { data: profileRaw } = await supabase
    .from('users').select('full_name').eq('id', user.id).single()
  const name = (profileRaw as any)?.full_name ?? 'Unknown provider'

  await sendProviderFeedback(name, user.email ?? '', message.trim())
  return NextResponse.json({ ok: true })
}
