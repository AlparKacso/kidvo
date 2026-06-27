import { test, expect } from '@playwright/test'
import {
  adminClient, E2E_PASSWORD,
  createProvider, createParent, createListing, createListedClass,
  createRosterMember, createWaitlistEntry, cleanupUser, dismissGates,
} from './fixtures'

/**
 * CHARACTERIZATION TESTS — Activity (listing) ↔ Group (class) model.
 *
 * These document the CURRENT behaviour, including the known model bugs, so we
 * can dig into it objectively. They are GREEN on today's code because they
 * assert what the system does now. Once we implement the agreed model —
 * "an Activity's spots + schedule are DERIVED from its Groups" — the assertions
 * marked `BUG:` below must be flipped to assert the corrected behaviour.
 *
 * Decided model (target):
 *   - Activity = the public listing (storefront families see).
 *   - Group    = a cohort inside an Activity (the roster); many per Activity.
 *   - spots_available = Σ(group.capacity) − Σ(occupancy) across the Activity's groups.
 *   - public schedule = union of the groups' meeting times.
 *   - a waitlister may only be offered a Group under the SAME Activity.
 */

const occupied = (members: { status: string }[]) =>
  members.filter(m => m.status === 'offered' || m.status === 'enrolled').length

test.describe('Activity ↔ Group model (characterization)', () => {

  // ── 1. Spots are tracked twice and never reconciled ──────────────────────
  test('BUG: enrolling a child in a group does not change the activity\'s public spots', async () => {
    const prov = await createProvider('E2E Model Spots')
    try {
      const db = adminClient()
      // Activity seeded with spots_total/available = 10.
      const listing = await createListing(prov.providerId)
      const cls = await createListedClass(prov.providerId, listing.id, { capacity: 10 })

      // Enrol 3 children into the group.
      for (let i = 0; i < 3; i++) {
        await createRosterMember(cls.id, { status: 'enrolled', childName: `Kid ${i}` })
      }

      // Re-read the Activity's public availability + the group's real occupancy.
      const { data: l } = await db.from('listings').select('spots_total, spots_available').eq('id', listing.id).single()
      const { data: members } = await db.from('roster_members').select('status').eq('class_id', cls.id)
      const occ = occupied((members ?? []) as { status: string }[])

      expect(occ).toBe(3)
      // BUG: the public number is still the seeded 10 — enrolment never touched it.
      expect((l as { spots_available: number }).spots_available).toBe(10)
      // The HONEST (derived) number would be capacity − occupancy = 7.
      const derived = 10 - occ
      expect(derived).toBe(7)
      // BUG: stored ≠ derived → the storefront overstates availability by `occ`.
      expect((l as { spots_available: number }).spots_available).not.toBe(derived)
    } finally {
      await cleanupUser(prov.email)
    }
  })

  // ── 2. Schedule is tracked twice and can diverge ─────────────────────────
  test('BUG: the activity\'s public schedule is independent of its group\'s meeting time', async () => {
    const prov = await createProvider('E2E Model Schedule')
    try {
      const db = adminClient()
      // createListing seeds one listing_schedule on Tuesday (day_of_week = 1).
      const listing = await createListing(prov.providerId)
      // The group actually meets on Thursday (day 3).
      const cls = await createListedClass(prov.providerId, listing.id, { days: [3] })

      const { data: scheds } = await db.from('listing_schedules').select('day_of_week').eq('listing_id', listing.id)
      const { data: c } = await db.from('classes').select('days').eq('id', cls.id).single()

      const publicDays = new Set(((scheds ?? []) as { day_of_week: number }[]).map(s => s.day_of_week))
      const groupDays  = new Set((c as { days: number[] }).days)

      expect([...publicDays]).toEqual([1])  // listing says Tuesday
      expect([...groupDays]).toEqual([3])   // the only group meets Thursday
      // BUG: the public schedule matches NONE of the activity's groups, and
      // nothing reconciles them. Target: public schedule = union of group days.
      expect([...publicDays]).not.toEqual([...groupDays])
    } finally {
      await cleanupUser(prov.email)
    }
  })

  // ── 3. Waitlist is per-Activity, but an offer can cross Activities ────────
  test('BUG: a waitlister for one activity can be offered a group under a different activity', async ({ page }) => {
    const prov   = await createProvider('E2E Model Offer')
    const parent = await createParent('E2E Model Parent')
    try {
      const db = adminClient()
      // Two distinct Activities owned by the same provider.
      const listingA = await createListing(prov.providerId) // the activity the family wants
      const listingB = await createListing(prov.providerId) // an unrelated activity
      const classB   = await createListedClass(prov.providerId, listingB.id, { capacity: 5 })
      // The parent is waiting on Activity A.
      const waitlistA = await createWaitlistEntry(listingA.id, parent.userId, { contactEmail: parent.email })

      // Sign in as the provider and offer the A-waitlister a spot in B's group.
      await dismissGates(page, '/auth/login')
      await page.getByPlaceholder('you@example.com').fill(prov.email)
      await page.locator('input[type="password"]').fill(E2E_PASSWORD)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/(dashboard|listings)/, { timeout: 15_000 })

      const res = await page.request.post('/api/offers', {
        data: { waitlist_entry_id: waitlistA.id, class_id: classB.id },
      })

      // BUG: the offer succeeds even though classB belongs to Activity B, not A.
      expect(res.ok()).toBeTruthy()

      // The cross-activity roster member now exists: its class fronts listing B
      // while the originating waitlist entry was for listing A.
      const { data: m } = await db
        .from('roster_members')
        .select('class_id, waitlist_entry_id, classes(listing_id)')
        .eq('waitlist_entry_id', waitlistA.id)
        .single()
      const member = m as { class_id: string; waitlist_entry_id: string; classes: { listing_id: string } | null } | null
      expect(member).toBeTruthy()
      expect(member!.class_id).toBe(classB.id)
      // BUG: class's listing (B) ≠ the waitlist entry's listing (A).
      expect(member!.classes?.listing_id).toBe(listingB.id)
      expect(member!.classes?.listing_id).not.toBe(listingA.id)
    } finally {
      await cleanupUser(parent.email)
      await cleanupUser(prov.email)
    }
  })
})
