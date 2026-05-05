import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/kids — lightweight list of children + whether the parent has a phone on file.
// Used by the trial booking modal to know whether to show the optional phone field.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ kids: [], hasPhone: false })

  const [{ data: kids }, { data: profile }] = await Promise.all([
    supabase.from('children').select('id, name').eq('user_id', user.id).order('created_at'),
    supabase.from('users').select('phone').eq('id', user.id).single(),
  ])

  const hasPhone = !!(profile as { phone: string | null } | null)?.phone?.trim()
  return NextResponse.json({ kids: kids ?? [], hasPhone })
}
