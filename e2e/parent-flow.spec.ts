import { test, expect } from '@playwright/test'
import {
  adminClient,
  createParent,
  cleanupUser,
  findAnyActiveListing,
  E2E_PASSWORD,
} from './fixtures'

/**
 * Parent trial-request flow.
 *
 * Verifies the most business-critical parent journey end-to-end:
 *   1. A confirmed parent can log in.
 *   2. They can reach a real listing from /browse.
 *   3. They can open the "Book a trial" modal, pick a day, and submit.
 *   4. A row actually lands in `trial_requests` with their user id.
 *
 * Preconditions:
 *   - The target Supabase project has at least one active listing (with schedules).
 *   - SUPABASE_SERVICE_ROLE_KEY is set in .env.test.local (Playwright config
 *     loads that file automatically).
 */
test.describe('parent: login → browse → request trial', () => {
  let email:  string
  let userId: string

  test.beforeAll(async () => {
    const parent = await createParent('E2E Parent')
    email  = parent.email
    userId = parent.userId
  })

  test.afterAll(async () => {
    if (email) await cleanupUser(email)
  })

  test('request a trial from a listing', async ({ page }) => {
    // Need a real listing to target (schedules must exist so the day-picker
    // has something to click).
    const listing = await findAnyActiveListing()

    // 1. Log in via the real login form.
    await page.goto('/auth/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()

    // Wait until Supabase auth hits the dashboard redirect.
    await page.waitForURL(/\/(dashboard|browse)/, { timeout: 15_000 })

    // 2. Go straight to the listing detail page with ?book=1 so the trial
    //    modal auto-opens (removes flakiness from finding the right card).
    await page.goto(`/browse/${listing.id}?book=1`)

    // 3. Wait for the "Preferred day" label to appear (modal is open).
    const dayLabel = page.getByText(/Preferred day|Ziua preferat/i).first()
    await expect(dayLabel).toBeVisible({ timeout: 10_000 })

    // 4. Click the first available day pill.
    const dayPills = page.locator('button', {
      hasText: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Lun|Mar|Mie|Joi|Vin|Sâm|Dum)/,
    })
    const firstDayPill = dayPills.first()
    await firstDayPill.waitFor({ state: 'visible', timeout: 5_000 })
    await firstDayPill.click()

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
      .eq('user_id', userId)
      .eq('listing_id', listing.id)

    expect(error).toBeNull()
    expect(rows?.length ?? 0).toBeGreaterThan(0)
    expect(rows?.[0]?.message).toBe(msg)
  })
})
