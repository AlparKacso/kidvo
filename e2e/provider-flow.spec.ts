import { test, expect } from '@playwright/test'
import {
  adminClient,
  createProvider,
  cleanupUser,
  E2E_PASSWORD,
} from './fixtures'

/**
 * Provider listing-creation flow.
 *
 * Verifies the provider onboarding happy-path:
 *   1. A confirmed provider logs in and opens /listings/new.
 *   2. They walk through all 5 wizard steps.
 *   3. They exercise the multi-day picker (regression guard for B3c).
 *   4. They select "Per session" pricing (regression guard for B3a/B3d).
 *   5. The wizard successfully inserts a listing + schedules.
 *
 * The test then verifies in the database that:
 *   - pricing_type = 'session'  (would break if the edit page wipes it)
 *   - spots_available = 10      (would break if field resets to default)
 *   - listing_schedules has exactly the 2 rows we inserted.
 */
test.describe('provider: login → list activity → submit', () => {
  let email:      string
  let providerId: string

  test.beforeAll(async () => {
    const p = await createProvider('E2E Provider')
    email      = p.email
    providerId = p.providerId
  })

  test.afterAll(async () => {
    if (email) await cleanupUser(email)
  })

  test('publish a new listing via the wizard', { timeout: 120_000 }, async ({ page }) => {
    // Dismiss the cookie banner so it doesn't overlay the wizard buttons.
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.setItem('kidvo_cookie_consent', 'accepted'))

    // 1. Log in.
    await page.goto('/auth/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(dashboard|listings)/, { timeout: 15_000 })

    // 2. Open the wizard.
    await page.goto('/listings/new')
    await expect(page.getByRole('heading', { name: /List an activity|Listează o activitate/i }))
      .toBeVisible({ timeout: 10_000 })

    // --- Step 0: agree to terms ---
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // --- Step 1: basic info ---
    const title = `E2E Test Activity ${Date.now()}`
    await page.getByPlaceholder(/Academia de Fotbal/i).fill(title)

    // Click the first category pill.
    // Categories live in a responsive grid; they're <button> elements with
    // a coloured dot + category name.
    const categoryBtns = page.locator('button').filter({ hasText: /.+/ })
      .locator('xpath=//button[.//span[contains(@class,"rounded-full")]]')
    // Safer: match by role within the Category block — just take the first
    // button after the "Category" label.
    await page.locator('label').filter({ hasText: /^Category$|^Categorie$/ }).first().waitFor()

    const firstCategory = page.locator('div.grid > button').first()
    await firstCategory.click()

    await page.getByPlaceholder(/e\.g\. 5/).fill('5')
    await page.getByPlaceholder(/e\.g\. 14/).fill('10')

    // Neighborhood select — pick the first real option (index 1, index 0 is placeholder).
    const areaSelect = page.locator('select').first()
    const areaOptions = await areaSelect.locator('option').all()
    // option[0] is "Select area..." placeholder, option[1] is the first real area
    const firstAreaValue = await areaOptions[1].getAttribute('value')
    await areaSelect.selectOption(firstAreaValue!)

    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // --- Step 2: multi-day picker ---
    await expect(page.getByText(/Weekly schedule|Programul săptăm/i)).toBeVisible()

    // Click Mon + Wed day pills.
    await page.getByRole('button', { name: /^Mon$|^Lun$/ }).click()
    await page.getByRole('button', { name: /^Wed$|^Mie$/ }).click()

    // The two time selects (tempStart + tempEnd) are the only selects on step 2.
    const timeSelects = page.locator('select')
    await timeSelects.nth(0).selectOption('16:00')
    await timeSelects.nth(1).selectOption('17:30')

    await page.getByRole('button', { name: /Add for selected days|Adaugă pentru zilele selectate/i }).click()

    // Assert both day chips appeared in the "added rows" list (Mon + Wed badges).
    await expect(page.locator('span', { hasText: /^Mon$|^Lun$/ })).toHaveCount(1)
    await expect(page.locator('span', { hasText: /^Wed$|^Mie$/ })).toHaveCount(1)

    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // --- Step 3: details + per-session pricing ---
    await expect(page.getByText(/Pricing type|Tip de preț/i)).toBeVisible()

    // Click the "Per session" pill.
    await page.getByRole('button', { name: /Per session|Per ședință/i }).click()

    // After switching pricing_type to session, the price label should reflect it.
    await expect(page.getByText(/Session price|Preț ședință/i)).toBeVisible()

    await page.getByPlaceholder(/e\.g\. 120/).fill('80')
    await page.getByPlaceholder(/e\.g\. 20/).fill('10')
    await page.getByPlaceholder(/e\.g\. 8/).fill('10')

    await page.locator('textarea').first().fill(
      'E2E generated activity. This text is only used by the automated Playwright suite and will be deleted after the test run.'
    )

    await page.getByRole('button', { name: /^Next|^Înainte/i }).click()

    // --- Step 4: review + publish ---
    await expect(page.getByText(/Review your listing|Verifică/i)).toBeVisible()
    await page.getByRole('button', { name: /^Publish|^Publică/i }).click()

    // Wizard redirects to /listings?submitted=1 on success.
    await page.waitForURL(/\/listings\?submitted=1/, { timeout: 20_000 })

    // --- DB assertions (regression guard for B3a + B3d) ---
    const db = adminClient()
    const { data: listing, error } = await db
      .from('listings')
      .select('id, title, pricing_type, price_monthly, spots_available, spots_total')
      .eq('provider_id', providerId)
      .eq('title', title)
      .single()

    expect(error).toBeNull()
    expect(listing).toBeTruthy()
    expect(listing?.pricing_type).toBe('session')
    expect(listing?.price_monthly).toBe(80)
    expect(listing?.spots_total).toBe(10)
    expect(listing?.spots_available).toBe(10)

    // Schedules: 2 rows, one for Mon (0) and one for Wed (2).
    const { data: schedules } = await db
      .from('listing_schedules')
      .select('day_of_week, time_start, time_end')
      .eq('listing_id', (listing as { id: string }).id)
      .order('day_of_week')

    expect(schedules?.length).toBe(2)
    expect(schedules?.map(s => (s as { day_of_week: number }).day_of_week).sort())
      .toEqual([0, 2])
  })
})
