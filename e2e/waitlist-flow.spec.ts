import { test, expect } from '@playwright/test'
import {
  adminClient,
  createProvider,
  createParent,
  createListing,
  createListedClass,
  createManualClass,
  createWaitlistEntry,
  cleanupUser,
  dismissGates,
  E2E_PASSWORD,
} from './fixtures'

/**
 * Waitlist feature — happy paths that don't depend on the transactional email
 * side-effects (those use the service-role client and are exercised separately).
 * Every assertion is made against the database.
 *
 *   1. Parent joins the waitlist on a full listing → waitlist_entries row.
 *   2. Provider offers a seeded waiting family a spot → offers + roster_members
 *      (offered) rows, and the entry flips to 'offered'.
 *   3. Provider creates a manual class + adds an offline student → classes
 *      (no listing) + roster_members (offline, enrolled).
 *   4. Quick-start: a manual class's prefilled wizard publishes a pending
 *      listing and links the class to it.
 */

test.describe('waitlist: parent signup', () => {
  let provEmail: string
  let parEmail:  string
  let listingId: string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E WL Provider')
    const listing = await createListing(prov.providerId, { full: true })
    const parent = await createParent('E2E WL Parent')
    provEmail = prov.email
    parEmail  = parent.email
    listingId = listing.id
  })

  test.afterAll(async () => {
    if (parEmail)  await cleanupUser(parEmail)
    if (provEmail) await cleanupUser(provEmail)
  })

  test('parent joins the waitlist on a full listing', async ({ page }) => {
    test.setTimeout(90_000)
    await dismissGates(page, '/auth/login')

    // Log in as the parent.
    await page.getByPlaceholder('you@example.com').fill(parEmail)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(dashboard|browse)/, { timeout: 15_000 })

    // Open the full listing — the waitlist CTA replaces the trial button.
    await page.goto(`/browse/${listingId}`)
    const joinCta = page.getByRole('button', { name: /Join the waitlist/i }).first()
    await expect(joinCta).toBeVisible({ timeout: 10_000 })
    await joinCta.click()

    // Modal opens.
    await expect(page.getByText(/Save your little one a spot/i)).toBeVisible()
    await page.getByPlaceholder(/e\.g\. Maria/i).fill('E2E WL Kid')
    await page.getByPlaceholder('—').fill('7')
    await page.getByRole('button', { name: 'Mon', exact: true }).click()

    // Submit (the footer button is the last "Join the waitlist").
    await page.getByRole('button', { name: /Join the waitlist/i }).last().click()

    // Success state.
    await expect(page.getByText(/You're on the list!|You’re on the list!/i)).toBeVisible({ timeout: 15_000 })

    // DB assertion.
    const db = adminClient()
    const { data: entries } = await db
      .from('waitlist_entries')
      .select('child_name, child_age, status')
      .eq('listing_id', listingId)
    expect(entries?.length).toBe(1)
    expect((entries?.[0] as { child_name: string }).child_name).toBe('E2E WL Kid')
    expect((entries?.[0] as { status: string }).status).toBe('waiting')
  })
})

test.describe('waitlist: provider offers a spot', () => {
  let provEmail:  string
  let parEmail:   string
  let providerId: string
  let listingId:  string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E WL Provider 2')
    const listing = await createListing(prov.providerId, { full: true })
    // Decoupled model: listings no longer auto-sync a class, so seed the listed
    // class the provider offers the waiting family into (name matches the listing,
    // capacity 10 → the offer modal's class button reads "E2E Listing … 0/10").
    await createListedClass(prov.providerId, listing.id, { name: listing.title, capacity: 10 })
    const parent = await createParent('E2E WL Parent 2')
    await createWaitlistEntry(listing.id, parent.userId, { childName: 'Offerme', childAge: 8, contactEmail: parent.email })
    provEmail  = prov.email
    parEmail   = parent.email
    providerId = prov.providerId
    listingId  = listing.id
  })

  test.afterAll(async () => {
    if (parEmail)  await cleanupUser(parEmail)
    if (provEmail) await cleanupUser(provEmail)
  })

  test('provider offers the waiting family a spot', async ({ page }) => {
    test.setTimeout(90_000)
    await dismissGates(page, '/auth/login')

    // Log in as the provider.
    await page.getByPlaceholder('you@example.com').fill(provEmail)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(dashboard|listings)/, { timeout: 15_000 })

    // Open the manager — the seeded listed class is there, and the seeded
    // family appears in the waiting pool.
    await page.goto('/listings/classes')
    await expect(page.getByRole('heading', { name: /Classes & waitlist/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Offerme', { exact: true })).toBeVisible({ timeout: 10_000 })

    // Offer a spot → pick the (only) class.
    await page.getByRole('button', { name: /Offer a spot/i }).first().click()
    await expect(page.getByText(/Offer Offerme a spot/i)).toBeVisible()
    // The class option button shows the occupancy "0/10".
    await page.getByRole('button', { name: /E2E Listing.*0\/10/i }).click()

    // Toast confirms; the family leaves the pool.
    await expect(page.getByText(/Awaiting reply/i)).toBeVisible({ timeout: 15_000 })

    // DB assertions.
    const db = adminClient()
    const { data: classes } = await db.from('classes').select('id').eq('listing_id', listingId)
    const classId = (classes?.[0] as { id: string }).id
    const { data: members } = await db
      .from('roster_members').select('source, status, child_name').eq('class_id', classId)
    expect(members?.length).toBe(1)
    expect((members?.[0] as { source: string }).source).toBe('kidvo')
    expect((members?.[0] as { status: string }).status).toBe('offered')

    const { data: offers } = await db.from('offers').select('phase').eq('class_id', classId)
    expect(offers?.length).toBe(1)
    expect((offers?.[0] as { phase: string }).phase).toBe('pending')

    const { data: entry } = await db
      .from('waitlist_entries').select('status').eq('listing_id', listingId).single()
    expect((entry as { status: string }).status).toBe('offered')
  })
})

test.describe('waitlist: manager — new group + offline student', () => {
  let provEmail:  string
  let providerId: string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E WL Provider 3')
    provEmail  = prov.email
    providerId = prov.providerId
  })

  test.afterAll(async () => {
    if (provEmail) await cleanupUser(provEmail)
  })

  test('provider creates a manual class and adds an offline student', async ({ page }) => {
    test.setTimeout(90_000)
    await dismissGates(page, '/auth/login')

    await page.getByPlaceholder('you@example.com').fill(provEmail)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(dashboard|listings)/, { timeout: 15_000 })

    await page.goto('/listings/classes')
    await expect(page.getByRole('heading', { name: /Classes & waitlist/i })).toBeVisible({ timeout: 10_000 })

    // --- Start a new group (only the name is required) ---
    const groupName = `E2E Group ${Date.now()}`
    await page.getByRole('button', { name: /Start a new group/i }).first().click()
    await expect(page.getByText(/Start a new group/i).first()).toBeVisible()
    await page.getByPlaceholder(/Beginners/i).fill(groupName)
    await page.getByRole('button', { name: /Create group/i }).click()

    // The new manual class column appears.
    await expect(page.getByText(groupName).first()).toBeVisible({ timeout: 15_000 })

    // DB: a manual class (no listing) now exists.
    const db = adminClient()
    const { data: cls } = await db
      .from('classes').select('id, listing_id').eq('provider_id', providerId).eq('name', groupName).single()
    expect(cls).toBeTruthy()
    expect((cls as { listing_id: string | null }).listing_id).toBeNull()
    const classId = (cls as { id: string }).id

    // --- Add an offline student (only the child name is required) ---
    const childName = `E2E Walkin ${Date.now()}`
    await page.getByRole('button', { name: /Add a student manually/i }).first().click()
    await expect(page.getByText(/Add a student/i).first()).toBeVisible()
    await page.getByPlaceholder(/e\.g\. Maria/i).fill(childName)
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    await expect(page.getByText(childName).first()).toBeVisible({ timeout: 15_000 })

    // DB: an offline, enrolled roster member.
    const { data: members } = await db
      .from('roster_members').select('source, status, child_name').eq('class_id', classId)
    expect(members?.length).toBe(1)
    expect((members?.[0] as { source: string }).source).toBe('offline')
    expect((members?.[0] as { status: string }).status).toBe('enrolled')
    expect((members?.[0] as { child_name: string }).child_name).toBe(childName)
  })
})

test.describe('waitlist: quick-start — turn a manual class into a listing', () => {
  let provEmail:  string
  let providerId: string
  let classId:    string
  let className:  string

  test.beforeAll(async () => {
    const prov = await createProvider('E2E WL Provider 4')
    // Give the provider a phone so the wizard doesn't require one at publish.
    await adminClient().from('providers').update({ contact_phone: '+40712345678' }).eq('id', prov.providerId)
    const cls = await createManualClass(prov.providerId)
    provEmail  = prov.email
    providerId = prov.providerId
    classId    = cls.id
    className  = cls.name
  })

  test.afterAll(async () => {
    if (provEmail) await cleanupUser(provEmail)
  })

  test('prefilled wizard publishes a pending listing linked to the class', async ({ page }) => {
    test.setTimeout(120_000)
    await dismissGates(page, '/auth/login')

    await page.getByPlaceholder('you@example.com').fill(provEmail)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(dashboard|listings)/, { timeout: 15_000 })

    // Open the quick-start wizard for the manual class.
    await page.goto(`/listings/classes/${classId}/quick-start`)
    await expect(page.getByText(/Pre-filled from your class/i)).toBeVisible({ timeout: 10_000 })

    // Step 0 — agree to terms.
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // Steps 1 (Basic info) + 2 (Schedule) are prefilled from the class.
    await expect(page.getByText(/Basic info|Informații/i).first()).toBeVisible()
    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()
    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // Step 3 — Details: add the listing-only fields (price + description).
    await page.getByPlaceholder('e.g. 120').fill('150')
    await page.locator('textarea').first().fill(
      'E2E quick-start description. Generated by Playwright; deleted after the run.',
    )
    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // Step 4 — Publish → redirects back to the manager. Wait for the manager
    // itself (not the quick-start sub-path, which would match too early and
    // race the post-insert class link).
    await page.getByRole('button', { name: /^Publish|^Publică/i }).click()
    await page.waitForURL('**/listings/classes', { timeout: 25_000 })
    await expect(page.getByRole('heading', { name: /Classes & waitlist/i })).toBeVisible({ timeout: 10_000 })

    // DB: a new pending listing exists and the class now points at it.
    const db = adminClient()
    const { data: listing } = await db
      .from('listings')
      .select('id, status, title')
      .eq('provider_id', providerId)
      .eq('title', className)
      .single()
    expect(listing).toBeTruthy()
    expect((listing as { status: string }).status).toBe('pending')

    const { data: cls } = await db.from('classes').select('listing_id').eq('id', classId).single()
    expect((cls as { listing_id: string | null }).listing_id).toBe((listing as { id: string }).id)
  })
})

/**
 * Phase 2 (storefront): one listing fronts MANY published classes, and they show
 * on the public listing page. Exercises the dropped 1-class-per-listing unique
 * index + the public-read RLS on published classes.
 */
test.describe('classes: a listing fronts multiple published classes', () => {
  let provEmail = ''
  let listingId = ''
  let nameA = ''
  let nameB = ''

  test.beforeAll(async () => {
    const prov = await createProvider('E2E Storefront Provider')
    const listing = await createListing(prov.providerId) // open
    const stamp = Date.now()
    nameA = `E2E Beginners ${stamp}`
    nameB = `E2E Advanced ${stamp}`
    // Two classes under ONE listing — only possible after the decouple migration
    // dropped the 1-class-per-listing unique index.
    await createListedClass(prov.providerId, listing.id, { name: nameA, days: [1] })
    await createListedClass(prov.providerId, listing.id, { name: nameB, days: [3] })
    provEmail = prov.email
    listingId = listing.id
  })

  test.afterAll(async () => {
    if (provEmail) await cleanupUser(provEmail)
  })

  test('both published classes show on the public listing page', async ({ page }) => {
    test.setTimeout(60_000)
    await dismissGates(page, `/browse/${listingId}`)
    // The "Classes" section lists every class the listing fronts (public RLS).
    await expect(page.getByText(nameA, { exact: false })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(nameB, { exact: false })).toBeVisible({ timeout: 15_000 })
  })
})
