import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/classes/[id] — edit a class, or link it to a listing (quick-start).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS guarantees the provider can only update their own classes, but verify
  // ownership explicitly so we return a clean 404 instead of a silent no-op.
  const { data: clsRaw } = await supabase
    .from('classes')
    .select('id, provider_id, provider:providers(user_id)')
    .eq('id', id)
    .single()
  const cls = clsRaw as { id: string; provider_id: string; provider: { user_id: string } | null } | null
  if (!cls || cls.provider?.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'category_id', 'area_id', 'age_min', 'age_max', 'capacity', 'time_start', 'time_end', 'language', 'listing_id'] as const) {
    if (key in body) patch[key] = body[key]
  }
  if (Array.isArray(body.days)) {
    patch.days = body.days.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
  }
  // Publishing a class under a listing: it must be the provider's OWN listing.
  if (patch.listing_id) {
    const { data: lst } = await supabase
      .from('listings').select('id').eq('id', patch.listing_id as string).eq('provider_id', cls.provider_id).maybeSingle()
    if (!lst) return NextResponse.json({ error: 'Invalid listing' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const { data: updated, error } = await supabase
    .from('classes').update(patch).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ class: updated })
}
