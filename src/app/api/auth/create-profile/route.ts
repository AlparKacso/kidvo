import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'

export async function POST(req: Request) {
  const { userId, email, fullName, phone, role, locale } = await req.json()

  if (!userId || !email || !fullName || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Phone is mandatory for new registrations (both parents and providers) so
  // we can streamline communication. Existing phone-less users are unaffected
  // — this is only enforced here, at signup, not as a DB constraint.
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'A valid phone number is required.' }, { status: 400 })
  }

  // Validate optional locale (default handled by DB column default 'ro')
  const validLocale = locale === 'en' ? 'en' : 'ro'

  const admin = createAdminClient()

  // Verify user exists in auth
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId)
  if (authErr || !authUser.user) {
    return NextResponse.json({ error: 'User not found in auth' }, { status: 404 })
  }

  // Insert users row (upsert to avoid duplicate on retry)
  const { error: userError } = await admin.from('users').upsert({
    id:        userId,
    email,
    full_name: fullName,
    phone:     normalizedPhone,
    role,
    city:      'Timișoara',
    locale:    validLocale,
  }, { onConflict: 'id' })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  // If provider, create providers row too
  if (role === 'provider') {
    await admin.from('providers').upsert({
      user_id:       userId,
      display_name:  fullName,
      contact_email: email,
      contact_phone: normalizedPhone,
    }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ ok: true })
}
