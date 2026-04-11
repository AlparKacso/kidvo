import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.test.local (gitignored, holds SUPABASE_SERVICE_ROLE_KEY + base URL).
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') })

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir:        './e2e',
  fullyParallel:  false, // shared Supabase state — keep serial
  forbidOnly:     !!process.env.CI,
  retries:        process.env.CI ? 1 : 0,
  workers:        1,
  reporter:       [['list'], ['html', { open: 'never' }]],
  timeout:        60_000,
  expect:         { timeout: 10_000 },
  use: {
    baseURL:     BASE_URL,
    trace:       'retain-on-failure',
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],
})
