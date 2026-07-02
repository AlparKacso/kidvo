import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrialConfirmedToParent, sendTrialDeclinedToParent } from '@/lib/email'

// Shared trial-request mutations, used by both the provider Listings page
// (server actions on the Trial requests tab) and the provider Classes board
// (Confirm → enrol on the docked listing panel). Keeping these in one place
// guarantees the two surfaces behave identically — confirming from either spot
// enrols the child and emails the parent the same way.

/**
 * A confirmed trial request is treated as intent to attend, so the child
 * auto-enters a roster (source 'trial'). Idempotent — guarded by the unique
 * trial_request_id index and a pre-check. Runs with the admin client because it
 * reads the parent's child record (cross-user under RLS).
 *
 * @param opts.classId When provided (the Classes board confirms a trial against
 *   a *specific* class/cohort), the child enrols into that exact class. When
 *   omitted (the legacy Listings flow), the child enrols into the listing's
 *   first class, creating one from the listing's schedule if none exists yet.
 */
export async function autoEnrolConfirmedTrial(trialId: string, opts?: { classId?: string }) {
  const adminDb = createAdminClient()
  const { data: trialRaw } = await adminDb
    .from('trial_requests').select('id, listing_id, child_id, user_id, status').eq('id', trialId).single()
  const trial = trialRaw as { id: string; listing_id: string; child_id: string | null; user_id: string; status: string } | null
  if (!trial || trial.status !== 'confirmed') return

  // Already on a roster? (unique index also enforces this at the DB level.)
  const { data: existing } = await adminDb
    .from('roster_members').select('id').eq('trial_request_id', trialId).maybeSingle()
  if (existing) return

  const { data: listingRaw } = await adminDb
    .from('listings')
    .select('id, provider_id, title, category_id, area_id, age_min, age_max, spots_total, language')
    .eq('id', trial.listing_id).single()
  const listing = listingRaw as {
    id: string; provider_id: string; title: string; category_id: string | null; area_id: string | null
    age_min: number | null; age_max: number | null; spots_total: number | null; language: string | null
  } | null
  if (!listing) return

  // Resolve the target class. Prefer the caller-supplied class (must front this
  // listing and belong to its provider); else the listing's first class; else
  // create one from the listing's schedule.
  let classId: string | null = null
  if (opts?.classId) {
    const { data: clsRaw } = await adminDb
      .from('classes').select('id').eq('id', opts.classId).eq('provider_id', listing.provider_id).maybeSingle()
    classId = (clsRaw as { id: string } | null)?.id ?? null
  }
  if (!classId) {
    // A listing can front MANY classes now — take the earliest rather than
    // assuming exactly one (maybeSingle would throw on >1).
    const { data: clsRows } = await adminDb
      .from('classes').select('id').eq('listing_id', listing.id).order('created_at', { ascending: true }).limit(1)
    classId = ((clsRows ?? []) as { id: string }[])[0]?.id ?? null
  }
  if (!classId) {
    const { data: schedRaw } = await adminDb
      .from('listing_schedules').select('day_of_week, time_start, time_end').eq('listing_id', listing.id)
    const sched = ((schedRaw ?? []) as { day_of_week: number; time_start: string; time_end: string }[])
      .sort((a, b) => a.day_of_week - b.day_of_week)
    const { data: created } = await adminDb.from('classes').insert({
      provider_id: listing.provider_id,
      listing_id:  listing.id,
      name:        listing.title,
      category_id: listing.category_id,
      area_id:     listing.area_id,
      age_min:     listing.age_min,
      age_max:     listing.age_max,
      capacity:    listing.spots_total,
      days:        [...new Set(sched.map(s => s.day_of_week))],
      time_start:  sched[0]?.time_start ?? null,
      time_end:    sched[0]?.time_end ?? null,
      language:    listing.language,
    }).select('id').single()
    classId = (created as { id: string } | null)?.id ?? null
  }
  if (!classId) return

  // Resolve child name + age (fall back to the parent's name when no child set).
  let childName = '', childAge: number | null = null
  if (trial.child_id) {
    const { data: kidRaw } = await adminDb.from('children').select('name, birth_year').eq('id', trial.child_id).single()
    const kid = kidRaw as { name: string; birth_year: number } | null
    if (kid) { childName = kid.name; childAge = Math.max(0, new Date().getFullYear() - kid.birth_year) }
  }
  if (!childName) {
    const { data: parentRaw } = await adminDb.from('users').select('full_name').eq('id', trial.user_id).single()
    childName = (parentRaw as { full_name: string | null } | null)?.full_name ?? 'Trial guest'
  }

  await adminDb.from('roster_members').insert({
    class_id:         classId,
    source:           'trial',
    status:           'enrolled',
    trial_request_id: trial.id,
    child_id:         trial.child_id,
    child_name:       childName,
    child_age:        childAge,
  })
}

/**
 * Send the parent-facing email for a confirmed/declined trial, and record the
 * delivery outcome on trial_requests.email_status ('sent' | 'failed'). Used for
 * the initial send and for manual resends.
 */
export async function sendTrialStatusEmail(trialId: string) {
  const adminDb = createAdminClient()

  const { data: trialRaw } = await adminDb
    .from('trial_requests')
    .select('user_id, listing_id, status')
    .eq('id', trialId).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trial = trialRaw as any
  if (!trial || (trial.status !== 'confirmed' && trial.status !== 'declined')) return

  const [{ data: listingRaw }, { data: parentRaw }] = await Promise.all([
    adminDb.from('listings').select('id, title, provider_id').eq('id', trial.listing_id).single(),
    adminDb.from('users').select('full_name, email, locale').eq('id', trial.user_id).single(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = listingRaw as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parent  = parentRaw  as any
  if (!listing || !parent?.email) {
    await adminDb.from('trial_requests').update({
      email_status: 'failed',
      email_error:  'missing listing or parent email',
    }).eq('id', trialId)
    return
  }

  const parentLocale = parent.locale === 'en' ? 'en' as const : 'ro' as const

  try {
    if (trial.status === 'confirmed') {
      const { data: provRaw } = await adminDb
        .from('providers')
        .select('display_name, contact_email, contact_phone, user:users(email, full_name)')
        .eq('id', listing.provider_id).single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = provRaw as any
      await sendTrialConfirmedToParent({
        parentEmail:   parent.email,
        parentName:    parent.full_name ?? 'there',
        listingTitle:  listing.title,
        listingId:     listing.id,
        providerName:  p?.display_name  || p?.user?.full_name || '',
        providerEmail: p?.contact_email || p?.user?.email     || '',
        providerPhone: p?.contact_phone ?? null,
        locale:        parentLocale,
      })
    } else {
      await sendTrialDeclinedToParent({
        parentEmail:  parent.email,
        parentName:   parent.full_name ?? 'there',
        listingTitle: listing.title,
        locale:       parentLocale,
      })
    }
    await adminDb.from('trial_requests').update({ email_status: 'sent', email_error: null }).eq('id', trialId)
  } catch (err) {
    console.error('[trial email] send failed:', err)
    await adminDb.from('trial_requests').update({
      email_status: 'failed',
      email_error:  err instanceof Error ? err.message : String(err),
    }).eq('id', trialId)
  }
}
