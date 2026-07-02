import { test, expect, type Page } from '@playwright/test'
import {
  adminClient,
  createProvider,
  createParent,
  createChild,
  createListing,
  createListedClass,
  createRosterMember,
  createWaitlistEntry,
  createOffer,
  createNotificationRow,
  cleanupUser,
  dismissGates,
  E2E_PASSWORD,
} from './fixtures'

/**
 * Enroll & Calendar feature — happy paths asserted against the database.
 * REQUIRES migration 20260608_enroll_calendar.sql to be applied first
 * (roster_members `requested` status, parent RLS, notifications table,
 * waitlist_position fn). Without it these tests fail at the DB layer.
 *
 *   1. Parent enrolls (request-to-confirm) → roster_members (kidvo, requested).
 *   2. Provider confirms the request → roster_members flips to enrolled.
 *   3. Parent family calendar renders enrolled + waitlisted blocks (read model + RLS).
 *   4. In-app offer accept (topbar bell) → offer accepted, roster + entry enrolled.
 */

async function login(page: Page, email: string, parent = true) {
  await dismissGates(page, '/auth/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.locator('input[type="password"]').fill(E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(parent ? /\/(dashboard|browse)/ : /\/(dashboard|listings)/, { timeout: 15_000 })
}

test.describe('enroll: parent requests to enroll', () => {
  let provEmail: string
  let parEmail:  string
  let listingId: string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E EN Provider')
    const listing = await createListing(prov.providerId) // open (not full)
    const parent = await createParent('E2E EN Parent')
    await createChild(parent.userId, { name: 'Enrollkid' })
    provEmail = prov.email
    parEmail  = parent.email
    listingId = listing.id
  })

  test.afterAll(async () => {
    if (parEmail)  await cleanupUser(parEmail)
    if (provEmail) await cleanupUser(provEmail)
  })

  test('parent enrolls a child via the listing CTA', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, parEmail)

    await page.goto(`/browse/${listingId}`)
    const enrollCta = page.getByRole('button', { name: 'Enroll', exact: true }).first()
    await expect(enrollCta).toBeVisible({ timeout: 10_000 })
    await enrollCta.click()

    // Modal opens; the single child is auto-selected, so just submit.
    await expect(page.getByText(/Enroll in/i)).toBeVisible()
    await page.getByRole('button', { name: 'Enrollkid', exact: true }).click()
    await page.getByRole('button', { name: 'Enroll', exact: true }).last().click()

    await expect(page.getByText(/Request sent!/i)).toBeVisible({ timeout: 15_000 })

    // DB: a requested kidvo roster member on the listing's class.
    const db = adminClient()
    const { data: cls } = await db.from('classes').select('id').eq('listing_id', listingId).single()
    const classId = (cls as { id: string }).id
    const { data: members } = await db
      .from('roster_members').select('source, status, child_name').eq('class_id', classId)
    expect(members?.length).toBe(1)
    expect((members?.[0] as { source: string }).source).toBe('kidvo')
    expect((members?.[0] as { status: string }).status).toBe('requested')
    expect((members?.[0] as { child_name: string }).child_name).toBe('Enrollkid')
  })
})

test.describe('enroll: provider confirms a request', () => {
  let provEmail: string
  let parEmail:  string
  let memberId:  string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E EN Provider 2')
    const listing = await createListing(prov.providerId)
    const cls = await createListedClass(prov.providerId, listing.id, { name: 'Confirm Class' })
    const parent = await createParent('E2E EN Parent 2')
    const child = await createChild(parent.userId, { name: 'Confirmme' })
    const m = await createRosterMember(cls.id, {
      source: 'kidvo', status: 'requested', childId: child.id, childName: 'Confirmme', contactEmail: parent.email,
    })
    provEmail = prov.email
    parEmail  = parent.email
    memberId  = m.id
  })

  test.afterAll(async () => {
    if (parEmail)  await cleanupUser(parEmail)
    if (provEmail) await cleanupUser(provEmail)
  })

  test('provider confirms the pending request from the manager', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, provEmail, false)

    await page.goto('/listings/classes')
    await expect(page.getByRole('heading', { name: /Groups & waitlist/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Confirmme', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Enrollment request/i)).toBeVisible()

    await page.getByRole('button', { name: 'Confirm', exact: true }).first().click()
    await expect(page.getByText(/Enrollment confirmed/i)).toBeVisible({ timeout: 15_000 })

    // DB: the member is now enrolled.
    const db = adminClient()
    await expect.poll(async () => {
      const { data } = await db.from('roster_members').select('status').eq('id', memberId).single()
      return (data as { status: string } | null)?.status
    }, { timeout: 10_000 }).toBe('enrolled')
  })
})

test.describe('calendar: parent family calendar', () => {
  let provEmail: string
  let parEmail:  string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E CAL Provider')
    const enrolledListing = await createListing(prov.providerId)
    const cls = await createListedClass(prov.providerId, enrolledListing.id, { name: 'Calendar Enrolled Class' })
    const fullListing = await createListing(prov.providerId, { full: true })
    const parent = await createParent('E2E CAL Parent')
    const child = await createChild(parent.userId, { name: 'Calkid' })
    await createRosterMember(cls.id, { source: 'kidvo', status: 'enrolled', childId: child.id, childName: 'Calkid' })
    await createWaitlistEntry(fullListing.id, parent.userId, { childId: child.id, childName: 'Calkid', status: 'waiting' })
    provEmail = prov.email
    parEmail  = parent.email
  })

  test.afterAll(async () => {
    if (parEmail)  await cleanupUser(parEmail)
    if (provEmail) await cleanupUser(provEmail)
  })

  test('calendar shows enrolled and waitlisted blocks', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, parEmail)

    await page.goto('/kids/calendar')
    await expect(page.getByRole('heading', { name: /^Calendar$/i })).toBeVisible({ timeout: 10_000 })

    // Enrolled class block renders (read model + parent RLS on roster_members/classes).
    await expect(page.getByText('Calendar Enrolled Class').first()).toBeVisible({ timeout: 10_000 })
    // The waitlisted listing renders as a slot-holding block.
    await expect(page.getByText(/E2E Listing/).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('calendar: in-app offer accept', () => {
  let provEmail:   string
  let parEmail:    string
  let entryId:     string
  let memberId:    string
  let offerToken:  string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E IAO Provider')
    const listing = await createListing(prov.providerId, { full: true })
    const cls = await createListedClass(prov.providerId, listing.id, { name: 'Offer Class' })
    const parent = await createParent('E2E IAO Parent')
    const child = await createChild(parent.userId, { name: 'Acceptme' })
    const entry = await createWaitlistEntry(listing.id, parent.userId, {
      childId: child.id, childName: 'Acceptme', contactEmail: parent.email, status: 'offered',
    })
    const member = await createRosterMember(cls.id, {
      source: 'kidvo', status: 'offered', childId: child.id, childName: 'Acceptme',
      contactEmail: parent.email, waitlistEntryId: entry.id,
    })
    const offer = await createOffer(entry.id, cls.id, member.id, { phase: 'pending' })
    await createNotificationRow(parent.userId, 'spot_offer', {
      token: offer.token, childName: 'Acceptme', listingTitle: listing.title, providerName: 'E2E IAO Provider',
    })
    provEmail  = prov.email
    parEmail   = parent.email
    entryId    = entry.id
    memberId   = member.id
    offerToken = offer.token
  })

  test.afterAll(async () => {
    if (parEmail)  await cleanupUser(parEmail)
    if (provEmail) await cleanupUser(provEmail)
  })

  test('parent accepts the spot from the topbar bell', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, parEmail)
    await page.goto('/browse')

    // The bell renders because the parent has a notification; open it.
    await page.getByRole('button', { name: 'Notifications' }).click()
    const accept = page.getByRole('button', { name: 'Accept the spot' })
    await expect(accept).toBeVisible({ timeout: 10_000 })
    await accept.click()

    // DB: the shared records flip in place — offer accepted, roster + entry enrolled.
    const db = adminClient()
    await expect.poll(async () => {
      const { data } = await db.from('offers').select('phase').eq('token', offerToken).single()
      return (data as { phase: string } | null)?.phase
    }, { timeout: 10_000 }).toBe('accepted')

    const { data: member } = await db.from('roster_members').select('status').eq('id', memberId).single()
    expect((member as { status: string }).status).toBe('enrolled')
    const { data: entry } = await db.from('waitlist_entries').select('status').eq('id', entryId).single()
    expect((entry as { status: string }).status).toBe('enrolled')
  })
})
