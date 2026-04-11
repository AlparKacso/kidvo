import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    '[e2e] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — fill in .env.test.local before running Playwright.'
  )
}

export const E2E_PASSWORD = 'kidvo-e2e-test-pw-1234!'

/**
 * Admin Supabase client used by test fixtures to pre-seed users and
 * clean up afterwards. NEVER ship this to the browser.
 */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Generate a unique e2e email. Using the `kidvo-test.local` domain
 * makes it trivial to spot leftover rows in prod/staging.
 */
export function uniqueEmail(tag: string): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}-${tag}@kidvo-test.local`
}

interface CreatedUser {
  userId: string
  email:  string
}

/**
 * Create a confirmed parent user (auth + public.users row).
 */
export async function createParent(fullName: string): Promise<CreatedUser> {
  const db    = adminClient()
  const email = uniqueEmail('parent')

  const { data: auth, error: authErr } = await db.auth.admin.createUser({
    email,
    password:      E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'parent' },
  })
  if (authErr || !auth.user) throw authErr ?? new Error('createUser failed')

  const { error: insErr } = await db.from('users').upsert({
    id:        auth.user.id,
    email,
    full_name: fullName,
    role:      'parent',
    city:      'Timișoara',
  }, { onConflict: 'id' })
  if (insErr) throw insErr

  return { userId: auth.user.id, email }
}

/**
 * Create a confirmed provider user (auth + public.users row + providers row).
 */
export async function createProvider(fullName: string): Promise<CreatedUser & { providerId: string }> {
  const db    = adminClient()
  const email = uniqueEmail('provider')

  const { data: auth, error: authErr } = await db.auth.admin.createUser({
    email,
    password:      E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'provider' },
  })
  if (authErr || !auth.user) throw authErr ?? new Error('createUser failed')

  const { error: insErr } = await db.from('users').upsert({
    id:        auth.user.id,
    email,
    full_name: fullName,
    role:      'provider',
    city:      'Timișoara',
  }, { onConflict: 'id' })
  if (insErr) throw insErr

  const { data: providerRow, error: provErr } = await db.from('providers').upsert({
    user_id:       auth.user.id,
    display_name:  fullName,
    contact_email: email,
  }, { onConflict: 'user_id' })
    .select('id')
    .single()
  if (provErr || !providerRow) throw provErr ?? new Error('provider row insert failed')

  return { userId: auth.user.id, email, providerId: (providerRow as { id: string }).id }
}

/**
 * Delete the test user and all their data. Cascades via FK on most tables;
 * we manually delete listing rows (and their schedules) for providers,
 * since those are not automatically cleaned up when a user is deleted.
 */
export async function cleanupUser(email: string): Promise<void> {
  const db = adminClient()

  // Look up the user id from auth.
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 })
  const user = authList?.users.find(u => u.email === email)
  if (!user) return // nothing to clean up

  const userId = user.id

  // Delete provider-owned rows (listings + schedules cascade via FK).
  const { data: provider } = await db
    .from('providers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (provider) {
    const providerId = (provider as { id: string }).id
    // Delete listings explicitly (listing_schedules + listing_views + trial_requests cascade via FK).
    await db.from('listings').delete().eq('provider_id', providerId)
    await db.from('providers').delete().eq('id', providerId)
  }

  // Delete parent-owned rows not guaranteed to cascade.
  await db.from('trial_requests').delete().eq('user_id', userId)
  await db.from('children').delete().eq('user_id', userId)
  await db.from('saves').delete().eq('user_id', userId)
  await db.from('users').delete().eq('id', userId)

  // Finally delete the auth user.
  await db.auth.admin.deleteUser(userId)
}

/**
 * Find the first active listing — used by the parent flow to request a trial
 * without depending on a specific seeded listing.
 */
export async function findAnyActiveListing(): Promise<{ id: string; title: string }> {
  const db = adminClient()
  const { data, error } = await db
    .from('listings')
    .select('id, title')
    .eq('status', 'active')
    .limit(1)
    .single()
  if (error || !data) throw new Error('No active listings found — seed at least one before running e2e tests')
  return data as { id: string; title: string }
}
