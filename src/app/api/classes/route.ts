import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/classes — create a manual class (no listing required).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: providerRaw } = await supabase
    .from('providers').select('id').eq('user_id', user.id).single()
  const provider = providerRaw as { id: string } | null
  if (!provider) return NextResponse.json({ error: 'Not a provider' }, { status: 403 })

  const body = await req.json()
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const days: number[] = Array.isArray(body.days)
    ? body.days.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
    : []

  const { data: cls, error } = await supabase
    .from('classes')
    .insert({
      provider_id: provider.id,
      listing_id:  null,
      name,
      category_id: body.category_id ?? null,
      area_id:     body.area_id ?? null,
      age_min:     typeof body.age_min === 'number' ? body.age_min : null,
      age_max:     typeof body.age_max === 'number' ? body.age_max : null,
      capacity:    typeof body.capacity === 'number' ? body.capacity : null,
      days,
      time_start:  body.time_start || null,
      time_end:    body.time_end || null,
      language:    body.language || null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ class: cls })
}
