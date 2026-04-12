import { test, expect } from '@playwright/test'
import {
  adminClient,
  createParent,
  createProvider,
  createListing,
  cleanupUser,
  E2E_PASSWORD,
} from './fixtures'

/**
 * Parent trial-request flow.
 *
 * Verifies the most business-critical parent journey end-to-end:
 *   1. A confirmed parent can log in.
 *   2. They can reach a real listing detail page.
 *   3. They can open the "Book a trial" modal, pick a day, and submit.
 *   4. A row actually lands in `trial_requests` with their user id.
 *
 * IMPORTANT — self-contained data: this test seeds its OWN provider +
 * listing under the @kidvo-test.local domain so it never touches a real
 * provider's listing. The trial-request email side-effect therefore goes
 * to a fake @kidvo-test.local address (which Resend can't deliver), not
 * to a real human. Both users + the listing are deleted in afterAll.
 */
test.describe('parent: login → browse → request trial', () => {
  let parentEmail:   string
  let parentUserId:  string
  let providerEmail: string
  let listingId:     string

  test.beforeAll(async () => {
    const parent   = await createParent('E2E Parent')
    const provider = await createProvider('E2E Provider Host')
    const listing  = await createListing(provider.providerId)

    parentEmail   = parent.email
    parentUserId  = parent.userId
    providerEmail = provider.email
    listingId     = listing.id
  })

  test.afterAll(async () => {
    // Clean up the parent first (their trial_requests row), then the provider
    // (which cascades the seeded listing + its schedules).
    if (parentEmail)   await cleanupUser(parentEmail)
    if (providerEmail) await cleanupUser(providerEmail)
  })

  test('request a trial from a listing', async ({ page }) => {
    // Dismiss the cookie banner so it can't overlay buttons.
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.setItem('kidvo_cookie_consent', 'accepted'))

    // 1. Log in via the real login form.
    await page.goto('/auth/login')
    await page.getByPlaceholder('you@example.com').fill(parentEmail)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()

    // Wait until Supabase auth hits the dashboard redirect.
    await page.waitForURL(/\/(dashboard|browse)/, { timeout: 15_000 })

    // 2. Go straight to the listing detail page with ?book=1 so the trial
    //    modal auto-opens (removes flakiness from finding the right card).
    await page.goto(`/browse/${listingId}?book=1`)

    // 3. Wait for the "Preferred day" label to appear (modal is open).
    const dayLabel = page.getByText(/Preferred day|Ziua preferat/i).first()
    await expect(dayLabel).toBeVisible({ timeout: 10_000 })

    // 4. Click the seeded Tuesday pill.
    const tuePill = page.getByRole('button', { name: /^Tuesday|^Marți/i }).first()
    await tuePill.waitFor({ state: 'visible', timeout: 5_000 })
    await tuePill.click()

    // 5. Fill in a message so we can identify this row later.
    const msg = `E2E test ${Date.now()}`
    await page.locator('textarea').fill(msg)

    // 6. Submit.
    await page.getByRole('button', { name: /Send request|Trimite/i }).click()

    // 7. Success state: emoji + "Request sent!" panel.
    await expect(page.getByText(/Request sent|Cerere trimis/i)).toBeVisible({ timeout: 15_000 })

    // 8. Server-side proof: a trial_requests row was inserted for this user.
    const db = adminClient()
    const { data: rows, error } = await db
      .from('trial_requests')
      .select('id, listing_id, user_id, message')
      .eq('user_id', parentUserId)
      .eq('listing_id', listingId)

    expect(error).toBeNull()
    expect(rows?.length ?? 0).toBeGreaterThan(0)
    expect(rows?.[0]?.message).toBe(msg)
  })
})
