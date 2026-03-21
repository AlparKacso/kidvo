/**
 * One-shot email test script — sends all 16 templates to a single address.
 *
 * Usage (from the worktree root):
 *   npx tsx scripts/test-emails.ts
 *
 * Requires RESEND_API_KEY to be set. The script auto-discovers .env.local by
 * walking up from its own location, so no manual env setup is needed if
 * .env.local exists anywhere above this directory.
 *
 * Notes:
 *  - Templates 3 & 4 (admin notifications) go to ADMIN_EMAIL, which defaults
 *    to alpar.kacso@gmail.com when the env var is not set.
 *  - Template 16 (provider feedback) is hardcoded to hello@kidvo.eu in the
 *    source — it will arrive there, not at TEST_ADDRESS.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Auto-load .env.local from nearest ancestor directory ─────────────────────
const scriptDir = dirname(fileURLToPath(import.meta.url))
let searchDir = scriptDir
while (searchDir !== dirname(searchDir)) {
  const candidate = resolve(searchDir, '.env.local')
  if (existsSync(candidate)) {
    readFileSync(candidate, 'utf8').split('\n').forEach(line => {
      if (!line.trim() || line.trim().startsWith('#')) return
      const eq = line.indexOf('=')
      if (eq === -1) return
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !(key in process.env)) process.env[key] = val
    })
    console.log(`Loaded env from: ${candidate}\n`)
    break
  }
  searchDir = dirname(searchDir)
}

// ── Import all template functions ─────────────────────────────────────────────
import {
  sendNewTrialRequestToProvider,
  sendTrialConfirmedToParent,
  sendNewListingToAdmin,
  sendNewReviewToAdmin,
  sendTrialDeclinedToParent,
  sendWelcomeToParent,
  sendWelcomeToProvider,
  sendListingApprovedToProvider,
  sendListingRejectedToProvider,
  sendReviewApprovedToParent,
  sendReviewRejectedToParent,
  sendReviewPublishedToProvider,
  sendAccountDeletedConfirmation,
  sendPasswordResetEmail,
  sendNewListingsDigest,
  sendProviderFeedback,
} from '../src/lib/email.js'

// ── Config ────────────────────────────────────────────────────────────────────
const TEST  = 'alpar.kacso@gmail.com'
const APP   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'

// Dummy IDs that look plausible in links
const LISTING_ID  = 'abc-football-timisoara'
const LISTING_ID2 = 'xyz-ballet-studio'
const REVIEW_ID   = 'rev_01j9abc123'

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

async function send(name: string, fn: () => Promise<unknown>) {
  process.stdout.write(`  ${String(passed + failed + 1).padStart(2, ' ')}. ${name} … `)
  try {
    await fn()
    console.log('✓')
    passed++
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`✗  ${msg}`)
    failed++
  }
  // Small pause to stay well inside Resend's rate limit (2 req/s on free tier)
  await new Promise(r => setTimeout(r, 600))
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
if (!process.env.RESEND_API_KEY) {
  console.error('Error: RESEND_API_KEY is not set. Add it to .env.local or export it in your shell.')
  process.exit(1)
}

console.log(`Sending all 16 email templates to ${TEST} …\n`)

// 1. Provider — new trial request
await send('sendNewTrialRequestToProvider', () =>
  sendNewTrialRequestToProvider({
    providerEmail: TEST,
    listingTitle:  'Junior Football Academy',
    parentName:    'Maria Popescu',
    parentEmail:   TEST,
    preferredDay:  'Saturday morning',
    message:       'My son is 7 and loves football. Is this suitable for beginners?',
  }),
)

// 2. Parent — trial confirmed
await send('sendTrialConfirmedToParent', () =>
  sendTrialConfirmedToParent({
    parentEmail:   TEST,
    parentName:    'Maria Popescu',
    listingTitle:  'Junior Football Academy',
    listingId:     LISTING_ID,
    providerName:  'FC Timișoara Kids',
    providerEmail: TEST,
    providerPhone: '+40 712 345 678',
  }),
)

// 3. Admin — new listing submitted  (goes to ADMIN_EMAIL → alpar.kacso@gmail.com)
await send('sendNewListingToAdmin  [→ ADMIN_EMAIL]', () =>
  sendNewListingToAdmin({
    listingId:     LISTING_ID,
    listingTitle:  'Junior Football Academy',
    providerName:  'FC Timișoara Kids',
    providerEmail: TEST,
  }),
)

// 4. Admin — new review pending  (goes to ADMIN_EMAIL → alpar.kacso@gmail.com)
await send('sendNewReviewToAdmin   [→ ADMIN_EMAIL]', () =>
  sendNewReviewToAdmin({
    reviewId:     REVIEW_ID,
    listingTitle: 'Junior Football Academy',
    rating:       4,
    comment:      'Great coaches, very patient with the kids. Highly recommend!',
    reviewerName: 'Maria Popescu',
  }),
)

// 5. Parent — trial declined
await send('sendTrialDeclinedToParent', () =>
  sendTrialDeclinedToParent({
    parentEmail:  TEST,
    parentName:   'Maria Popescu',
    listingTitle: 'Junior Football Academy',
  }),
)

// 6. Parent — welcome
await send('sendWelcomeToParent', () =>
  sendWelcomeToParent({
    email: TEST,
    name:  'Maria',
  }),
)

// 7. Provider — welcome
await send('sendWelcomeToProvider', () =>
  sendWelcomeToProvider({
    email: TEST,
    name:  'Andrei',
  }),
)

// 8. Provider — listing approved
await send('sendListingApprovedToProvider', () =>
  sendListingApprovedToProvider({
    email:        TEST,
    providerName: 'FC Timișoara Kids',
    listingTitle: 'Junior Football Academy',
    listingId:    LISTING_ID,
  }),
)

// 9. Provider — listing rejected
await send('sendListingRejectedToProvider', () =>
  sendListingRejectedToProvider({
    email:        TEST,
    providerName: 'FC Timișoara Kids',
    listingTitle: 'Junior Football Academy',
  }),
)

// 10. Parent — review approved
await send('sendReviewApprovedToParent', () =>
  sendReviewApprovedToParent({
    email:        TEST,
    parentName:   'Maria',
    listingTitle: 'Junior Football Academy',
    listingId:    LISTING_ID,
  }),
)

// 11. Parent — review rejected
await send('sendReviewRejectedToParent', () =>
  sendReviewRejectedToParent({
    email:        TEST,
    parentName:   'Maria',
    listingTitle: 'Junior Football Academy',
  }),
)

// 12. Provider — review published on their listing
await send('sendReviewPublishedToProvider', () =>
  sendReviewPublishedToProvider({
    email:        TEST,
    providerName: 'FC Timișoara Kids',
    listingTitle: 'Junior Football Academy',
    listingId:    LISTING_ID,
    rating:       4,
    comment:      'Great coaches, very patient with the kids. Highly recommend!',
  }),
)

// 13. User — account deleted
await send('sendAccountDeletedConfirmation', () =>
  sendAccountDeletedConfirmation({
    email: TEST,
    name:  'Maria',
  }),
)

// 14. User — password reset
await send('sendPasswordResetEmail', () =>
  sendPasswordResetEmail({
    email:     TEST,
    name:      'Maria',
    resetLink: `${APP}/auth/reset-password?token=test_tok_abc123`,
  }),
)

// 15. Parent — new listings digest
await send('sendNewListingsDigest', () =>
  sendNewListingsDigest({
    email:      TEST,
    parentName: 'Maria',
    listings: [
      {
        title:         'Ballet for Beginners',
        id:            LISTING_ID2,
        providerName:  'Studio Dans Timișoara',
        categoryName:  'Dance',
        isNewProvider: true,
      },
      {
        title:         'Junior Robotics Club',
        id:            'robotics-club-tm',
        providerName:  'TechKids Romania',
        categoryName:  'Technology',
        isNewProvider: false,
      },
      {
        title:         'Swimming Lessons (5–8 yrs)',
        id:            'swim-kids-tm',
        providerName:  'Aqua Sport Club',
        categoryName:  'Sports',
        isNewProvider: false,
      },
    ],
  }),
)

// 16. Provider feedback  (hardcoded to hello@kidvo.eu — see note at top)
await send('sendProviderFeedback    [→ hello@kidvo.eu]', () =>
  sendProviderFeedback(
    'FC Timișoara Kids',
    TEST,
    'The dashboard is great but it would be really useful to filter trial requests by date.\nAlso, can we get a mobile app? 😊',
  ),
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`Sent: ${passed}   Failed: ${failed}`)
if (failed > 0) {
  console.log('\nCheck the errors above — usually a bad API key or Resend rate limit.')
  process.exit(1)
}
} // end main

main().catch(err => { console.error(err); process.exit(1) })
