import { test, expect } from '@playwright/test'
import { adminClient, cleanupUser, E2E_PASSWORD, dismissGates } from './fixtures'

/**
 * Signup form flow (parent + provider).
 *
 * Verifies the most critical new-user touchpoint end-to-end:
 *   1. A visitor can fill the signup form.
 *   2. Phone is mandatory (regression guard) — it is filled and persisted.
 *   3. After submission the "check your email" screen appears.
 *   4. A users row was created with the correct role + phone.
 *   5. For providers, a providers row is created with contact_phone set.
 *
 * We clean up the auth + profile rows in afterAll so we don't leave
 * orphaned test accounts. The confirmation email goes to a gmail +alias
 * that is never opened by the test.
 */

// A valid Romanian mobile that normalises to +40745369041.
const TEST_PHONE          = '0745 369 041'
const TEST_PHONE_CANONICAL = '+40745369041'

function uniqueGmail(tag: string): string {
  const t = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return `alpar.kacso+e2e-${tag}-${t}@gmail.com`
}

async function fillSignup(
  page: import('@playwright/test').Page,
  opts: { role: 'parent' | 'provider'; email: string; name: string },
) {
  await dismissGates(page, '/auth/signup')

  // Select role.
  const roleName = opts.role === 'parent' ? /parent|părinte/i : /provider|furnizor/i
  await page.getByRole('button', { name: roleName }).first().click()

  // Fill all fields — phone is required, so the form won't submit without it.
  await page.getByPlaceholder(/name|nume/i).fill(opts.name)
  await page.locator('input[type="tel"]').fill(TEST_PHONE)
  await page.getByPlaceholder('you@example.com').fill(opts.email)
  await page.locator('input[type="password"]').fill(E2E_PASSWORD)

  await page.locator('button[type="submit"]').click()

  // "Check your email" screen confirms signUp + create-profile both succeeded.
  await expect(
    page.getByText(/check your email|verifică-ți emailul/i)
  ).toBeVisible({ timeout: 15_000 })
}

test.describe('signup: parent happy path', () => {
  let email: string

  test.afterAll(async () => {
    if (email) await cleanupUser(email)
  })

  test('fill signup form (with phone) and see check-email screen', async ({ page }) => {
    email = uniqueGmail('parent')
    await fillSignup(page, { role: 'parent', email, name: 'E2E Signup Test' })

    const db = adminClient()
    const { data: rows, error } = await db
      .from('users')
      .select('id, role, full_name, phone')
      .eq('email', email)

    expect(error).toBeNull()
    expect(rows?.length).toBe(1)
    expect(rows?.[0]?.role).toBe('parent')
    expect(rows?.[0]?.full_name).toBe('E2E Signup Test')
    // Phone is now mandatory and stored in canonical form.
    expect(rows?.[0]?.phone).toBe(TEST_PHONE_CANONICAL)
  })
})

test.describe('signup: provider (supplier) happy path', () => {
  let email: string

  test.afterAll(async () => {
    if (email) await cleanupUser(email)
  })

  test('register as provider with phone → users + providers rows created', async ({ page }) => {
    email = uniqueGmail('provider')
    await fillSignup(page, { role: 'provider', email, name: 'E2E Provider Signup' })

    const db = adminClient()

    // users row with role = provider and the canonical phone.
    const { data: userRows, error: userErr } = await db
      .from('users')
      .select('id, role, full_name, phone')
      .eq('email', email)

    expect(userErr).toBeNull()
    expect(userRows?.length).toBe(1)
    expect(userRows?.[0]?.role).toBe('provider')
    expect(userRows?.[0]?.phone).toBe(TEST_PHONE_CANONICAL)

    // providers row created with contact_email + contact_phone populated.
    const userId = (userRows?.[0] as { id: string }).id
    const { data: provRows, error: provErr } = await db
      .from('providers')
      .select('user_id, contact_email, contact_phone')
      .eq('user_id', userId)

    expect(provErr).toBeNull()
    expect(provRows?.length).toBe(1)
    expect(provRows?.[0]?.contact_email).toBe(email)
    expect(provRows?.[0]?.contact_phone).toBe(TEST_PHONE_CANONICAL)
  })
})
