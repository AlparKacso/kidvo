import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/kids — lightweight list of children + whether the parent has a phone on file.
// Used by the trial booking modal (phone field) and the waitlist modal (kid age + auto-filled contact).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ kids: [], hasPhone: false, contact: null })

  const [{ data: kids }, { data: profile }] = await Promise.all([
    supabase.from('children').select('id, name, birth_year').eq('user_id', user.id).order('created_at'),
    supabase.from('users').select('full_name, phone, email').eq('id', user.id).single(),
  ])

  const p = profile as { full_name: string | null; phone: string | null; email: string | null } | null
  const hasPhone = !!p?.phone?.trim()
  return NextResponse.json({
    kids:     kids ?? [],
    hasPhone,
    contact: { name: p?.full_name ?? '', phone: p?.phone ?? '', email: p?.email ?? user.email ?? '' },
  })
}
