import { test, expect } from '@playwright/test'
import { adminClient, cleanupUser, E2E_PASSWORD } from './fixtures'

/**
 * Signup form flow.
 *
 * Verifies the most critical new-user touchpoint end-to-end:
 *   1. A visitor can fill the signup form (parent role).
 *   2. After submission the "check your email" screen appears.
 *   3. A users row was created in the database with the correct role.
 *
 * We clean up the auth + profile rows in afterAll so we don't leave
 * orphaned test accounts. The confirmation email goes to a fake
 * @kidvo-test.local address that Resend can't deliver, so no real
 * inbox is affected.
 */
test.describe('signup: parent happy path', () => {
  let email: string

  test.afterAll(async () => {
    if (email) await cleanupUser(email)
  })

  test('fill signup form and see check-email screen', async ({ page }) => {
    // Dismiss the cookie banner so it can't overlay buttons.
    await page.goto('/auth/signup')
    await page.evaluate(() => localStorage.setItem('kidvo_cookie_consent', 'accepted'))
    await page.goto('/auth/signup')

    // Generate a unique test email.
    email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}-signup@kidvo-test.local`

    // 1. Select "Parent" role (should be default, but click to be explicit).
    const parentBtn = page.getByRole('button', { name: /parent|părinte/i }).first()
    await parentBtn.click()

    // 2. Fill the form fields.
    await page.getByPlaceholder(/name|nume/i).fill('E2E Signup Test')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.locator('input[type="password"]').fill(E2E_PASSWORD)

    // 3. Submit.
    await page.locator('button[type="submit"]').click()

    // 4. Verify the "check your email" screen appears.
    await expect(
      page.getByText(/check your email|verifică-ți emailul/i)
    ).toBeVisible({ timeout: 15_000 })

    // 5. Verify a users row was created with role = 'parent'.
    const db = adminClient()
    const { data: rows, error } = await db
      .from('users')
      .select('id, role, full_name')
      .eq('email', email)

    expect(error).toBeNull()
    expect(rows?.length).toBe(1)
    expect(rows?.[0]?.role).toBe('parent')
    expect(rows?.[0]?.full_name).toBe('E2E Signup Test')
  })
})
