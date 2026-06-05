import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/classes/[id]/students — add an offline (walk-in/returning) student to a roster.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clsRaw } = await supabase
    .from('classes')
    .select('id, provider:providers(user_id)')
    .eq('id', id)
    .single()
  const cls = clsRaw as { id: string; provider: { user_id: string } | null } | null
  if (!cls || cls.provider?.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const childName = (body.child_name ?? '').trim()
  if (!childName) return NextResponse.json({ error: 'Missing child name' }, { status: 400 })

  const { data: member, error } = await supabase
    .from('roster_members')
    .insert({
      class_id:      id,
      source:        'offline',
      status:        'enrolled',
      child_name:    childName,
      child_age:     typeof body.child_age === 'number' ? body.child_age : null,
      contact_name:  body.contact_name  || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      note:          body.note || null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member })
}
