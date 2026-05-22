import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// POST → upload a cropped event cover image, return its public URL.
// Admin-only. Uses the service role so it bypasses the per-provider
// storage RLS on `listing-images` (admin isn't the owning provider).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const path = `event-covers/${crypto.randomUUID()}.jpg`
  const { error: upErr } = await adminDb.storage
    .from('listing-images')
    .upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (upErr) {
    console.error('[event-cover] upload error:', upErr.message)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminDb.storage.from('listing-images').getPublicUrl(path)
  return NextResponse.json({ ok: true, url: publicUrl })
}
