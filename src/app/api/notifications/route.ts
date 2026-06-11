import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface NotifRow {
  id: string
  type: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

// GET /api/notifications — the caller's recent notifications + unread count.
// spot_offer rows are enriched with the offer's live phase (offers are
// provider-RLS, so the lookup goes through the service-role client).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('notifications')
    .select('id, type, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  const rows = (data ?? []) as NotifRow[]

  const tokens = rows
    .filter(r => r.type === 'spot_offer' && typeof r.payload?.token === 'string')
    .map(r => r.payload.token as string)

  const phaseByToken = new Map<string, string>()
  if (tokens.length > 0) {
    const adminDb = createAdminClient()
    const { data: offersRaw } = await adminDb.from('offers').select('token, phase').in('token', tokens)
    for (const o of (offersRaw ?? []) as { token: string; phase: string }[]) phaseByToken.set(o.token, o.phase)
  }

  const notifications = rows.map(r => ({
    id:        r.id,
    type:      r.type,
    payload:   r.payload,
    read:      r.read_at != null,
    createdAt: r.created_at,
    phase:     r.type === 'spot_offer' ? (phaseByToken.get(r.payload.token as string) ?? null) : null,
  }))
  const unread = rows.filter(r => r.read_at == null).length

  return NextResponse.json({ notifications, unread })
}

// POST /api/notifications — { action: 'read_all' } marks the caller's unread
// notifications read (RLS: notifications_update_own).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json().catch(() => ({}))
  if (action !== 'read_all') return NextResponse.json({ error: 'bad_action' }, { status: 400 })

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
