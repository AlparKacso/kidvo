import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/kids — lightweight list of children for the SaveButton's kid picker
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ kids: [] })

  const { data } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at')

  return NextResponse.json({ kids: data ?? [] })
}
