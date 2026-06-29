import { test, expect } from '@playwright/test'
import {
  adminClient, E2E_PASSWORD,
  createProvider, createListing, createListedClass, createRosterMember,
  cleanupUser, dismissGates,
} from './fixtures'

// Group (class) management from the Groups board: rename + delete, and the
// provider-ownership guard. Exercises the real PATCH/DELETE /api/classes/[id]
// endpoints the board's three-dot menu calls.

async function loginProvider(page: import('@playwright/test').Page, email: string) {
  await dismissGates(page, '/auth/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.locator('input[type="password"]').fill(E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(dashboard|listings)/, { timeout: 15_000 })
}

test.describe('Group management', () => {

  test('rename a group (PATCH /api/classes/[id])', async ({ page }) => {
    const prov = await createProvider('E2E Group Rename')
    try {
      const db = adminClient()
      const listing = await createListing(prov.providerId)
      const cls = await createListedClass(prov.providerId, listing.id, { name: 'Old name' })

      await loginProvider(page, prov.email)
      const res = await page.request.patch(`/api/classes/${cls.id}`, { data: { name: 'Beginners · Mon' } })
      expect(res.ok()).toBeTruthy()

      const { data } = await db.from('classes').select('name').eq('id', cls.id).single()
      expect((data as { name: string }).name).toBe('Beginners · Mon')
    } finally {
      await cleanupUser(prov.email)
    }
  })

  test('delete a group (DELETE /api/classes/[id]) — roster cascades, the activity stays', async ({ page }) => {
    const prov = await createProvider('E2E Group Delete')
    try {
      const db = adminClient()
      const listing = await createListing(prov.providerId)
      const cls = await createListedClass(prov.providerId, listing.id)
      await createRosterMember(cls.id, { status: 'enrolled', childName: 'Emma' })
      await createRosterMember(cls.id, { status: 'enrolled', childName: 'Sara' })

      await loginProvider(page, prov.email)
      const res = await page.request.delete(`/api/classes/${cls.id}`)
      expect(res.ok()).toBeTruthy()

      // Class gone + roster cascaded.
      const { data: clsRow } = await db.from('classes').select('id').eq('id', cls.id).maybeSingle()
      expect(clsRow).toBeNull()
      const { count } = await db.from('roster_members').select('*', { count: 'exact', head: true }).eq('class_id', cls.id)
      expect(count ?? 0).toBe(0)
      // The public Activity (listing) is NOT deleted — only this group.
      const { data: l } = await db.from('listings').select('id').eq('id', listing.id).maybeSingle()
      expect(l).toBeTruthy()
    } finally {
      await cleanupUser(prov.email)
    }
  })

  test('cannot delete another provider\'s group (404)', async ({ page }) => {
    const owner = await createProvider('E2E Group Owner')
    const other = await createProvider('E2E Group Other')
    try {
      const db = adminClient()
      const listing = await createListing(owner.providerId)
      const cls = await createListedClass(owner.providerId, listing.id)

      await loginProvider(page, other.email)  // signed in as a DIFFERENT provider
      const res = await page.request.delete(`/api/classes/${cls.id}`)
      expect(res.status()).toBe(404)

      const { data } = await db.from('classes').select('id').eq('id', cls.id).maybeSingle()
      expect(data).toBeTruthy()  // still there
    } finally {
      await cleanupUser(owner.email)
      await cleanupUser(other.email)
    }
  })
})
