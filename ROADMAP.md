# Kidvo Pre-Launch Roadmap

> Last updated: 2026-03-19

---

## ✅ Security (Done)
- [x] RLS enabled on all public tables (`listings`, `trial_requests`, `users`, `children`, `areas`, `child_interests`, `categories`, `saves`, `listing_schedules`, `listing_views`, `tips`, `providers`)
- [x] `listing_views` INSERT policy tightened (`WITH CHECK user_id = auth.uid() OR user_id IS NULL`)
- [x] `contact_reveals` table created with RLS policies
- [ ] Leaked password protection → enable manually in Supabase dashboard (Auth → Security)

---

## Phase 1 — Provider-First (Before First Partner Outreach)
*The first partner is a provider. Their listing creation & management experience must be polished.*

- [x] **Listing cover photo upload + crop** — Interactive crop modal (canvas-based, no deps), locked to card aspect ratio with live preview. `Effort: M`
- [x] **Google Maps pin on listing** — Field in listing form + "View on Google Maps →" link on detail page. `Effort: S`
- [x] **"Show contact details" CTA on listing detail page** — Hides phone/email behind a reveal button. Requires login. Fires `contact_reveals` event on open.
- [x] **"Contact reveals" as analytics funnel step** — Views → Contact Reveals → Trial Requests funnel live in provider analytics.
- [ ] **Provider Activities page redesign** — `/listings` list view: match new design language, better status indicators, quick-actions per listing. `Effort: M`
- [ ] **Provider Bookings page redesign** — `/listings/bookings`: cleaner layout, parent info at a glance, confirm/decline flow polished. `Effort: M`
- [ ] **Provider Analytics page redesign** — `/listings/analytics`: visual funnel, better stat hierarchy. `Effort: M`
- [ ] **"Trial available" toggle audit** — Clarify what the toggle does vs our core promise "book a free trial". ⚠️ *Product decision needed: remove entirely (all listings always offer a trial) or keep as explicit opt-in?* `Effort: S`

---

## Phase 2 — Parent Experience Polish
*Once a provider is live, parents need a compelling, bug-free experience to convert.*

- [x] **Fix internal nav links & CTAs** — "For providers" nav → `#for-providers`, "See how it works" → `#how-it-works`, `trial_available` respected across cards and detail page.
- [ ] **Dashboard: fix Activity Mix + Activity Interest** — Widgets show empty/wrong data. Better to fix or hide than mislead. `Effort: M`
- [ ] **Dashboard: Recommended cards per kid (tab selector)** — Personalization is the core UX promise. One card per kid makes it real. `Effort: M`
- [ ] **Dashboard: "Kids added / Trials booked / First review" onboarding card** — Nudges parents toward completing profile & booking. `Effort: S`
- [ ] **My Bookings — grouped by kid** — Families with 2+ kids need this. Low data complexity, high UX clarity. `Effort: S`

---

## Phase 3 — Trust & Quality
*Needed before any marketing push or word-of-mouth referrals.*

- [ ] **Edit review** (text → moderation flow, rating → instant update) — Reviews drive conversion. Fixing typos or updating scores = more honest reviews. `Effort: M`
- [ ] **SEO optimization** — Organic search is the long-term acquisition channel. Metadata, structured data, sitemap. `Effort: M`

---

## General
- [ ] **Email templates — design language audit** — All transactional emails (trial request, welcome, digest) should use the new design language and logo, not the old gray/orange style. `Effort: M`
- [ ] **Admin page redesign** — The admin panel still uses a basic layout. Should match the new design language (sidebar, typography, card components) so internal tooling feels consistent. `Effort: M`

---

## Landing Page
- [x] **Replace landing page cards with real listing photos** — Landing page showcase pulls live listings with cover images from DB.
- [x] **"I'm a provider" button → scroll to For Providers section** — Anchor-scrolls to provider value prop section on the same page.
