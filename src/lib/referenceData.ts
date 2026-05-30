import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Categories and areas are public reference data that changes rarely (only via
// admin/migrations). Re-querying them on every page render added a DB round-trip
// per navigation. We cache them at the data layer instead.
//
// A plain anon supabase-js client (no request cookies) is used so the result is
// request-independent and safe to share across the unstable_cache memo. These
// tables carry no per-user RLS, so this is equivalent to the previous cookie
// client read.
function refClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

export const getCategories = unstable_cache(
  async () => {
    const { data } = await refClient()
      .from('categories')
      .select('*')
      .order('sort_order')
    return (data ?? []) as any[]
  },
  ['reference:categories'],
  { revalidate: 3600, tags: ['categories'] }
)

export const getAreas = unstable_cache(
  async () => {
    const { data } = await refClient()
      .from('areas')
      .select('*')
      .order('name')
    return (data ?? []) as any[]
  },
  ['reference:areas'],
  { revalidate: 3600, tags: ['areas'] }
)
