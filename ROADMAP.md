# Kidvo Pre-Launch Roadmap

> Last updated: 2026-03-21

---

## ✅ Security
- [x] RLS enabled on all public tables
- [x] `listing_views` INSERT policy tightened
- [x] `contact_reveals` table with RLS policies
- [x] RLS UPDATE policies for `trial_requests` + `saves` (child_id / kid_id reassignment)
- [ ] Leaked password protection → enable manually in Supabase dashboard (Auth → Security)

---

## Phase 1 — Provider-First
*The first partner is a provider. Their listing creation & management experience must be polished.*

- [x] Listing cover photo upload + crop `M`
- [x] Google Maps pin on listing `S`
- [x] "Show contact details" CTA — login-gated reveal, fires `contact_reveals` event
- [x] Contact reveals funnel in provider analytics (Views → Reveals → Trial Requests)
- [x] **Trial sessions — Option C** — Default ON; provider can disable with a contextual reason (Cohort-based / At capacity / Arrange directly). Reason shown to parents instead of generic message. Copy audited across all surfaces. `S`
- [ ] Provider Activities page redesign `M`
- [ ] Provider Bookings page redesign `M`
- [ ] Provider Analytics page redesign `M`

---

## Phase 2 — Parent Experience
*Once a provider is live, parents need a compelling, bug-free experience to convert.*

- [x] Fix internal nav links & anchor scroll offsets (mobile)
- [x] `trial_available` respected across ActivityCard, detail page, Saved, Kids & Activities
- [x] My Bookings — grouped by kid
- [x] **Kids & Activities** — merged Saved + Bookings per child; no-kids flat view; unassigned bucket; kid selector on trial booking; inline reassignment with error surfacing `M`
- [x] **Featured listings — hybrid ranking** — Auto-qualify by quality floor (photo + description + ≥1 review), sort by review count; capped at 8; manual `featured` flag still works `S`
- [x] **Dashboard recommendations** — Scored by kid interests (+3), age range (+2), same area (+1); excludes already-saved/booked `S`
- [x] **Dashboard: Recommended per kid** — Random kid picked on each render, random pick from top-5 scored pool; card shows "FOR [KID]" label
- [x] Dashboard: fix Activity Mix + Activity Interest widgets `M`
- [x] Dashboard: onboarding card (Kids added / Trials booked / First review) `S`

---

## Phase 3 — Trust & Quality
*Needed before any marketing push.*

- [x] Edit review flow (text → moderation, rating → instant update) `M` ⚠️ *implemented, needs end-to-end testing*
- [x] OG image — implemented ⚠️ *needs testing (share preview in social / messaging apps)*
- [ ] SEO optimization (metadata, structured data, sitemap) `M`

---

## General
- [x] Sidebar feedback nudge — replaced "Book free trial" card; parent/provider variants; opens FeedbackForm modal
- [x] Email templates — design language audit `M` ⚠️ *implemented, blocked on valid Resend API key to test*
- [x] Admin page redesign `M`
- [ ] **i18n — Romanian (RO default) + English (EN)** — cookie-based locale via `next-intl`, no URL prefix, language toggle in Topbar `L`

---

## Landing Page
- [x] Showcase pulls live listing photos from DB
- [x] "I'm a provider" + "See how it works" → anchor scroll (with `scroll-mt-20` offset fix for mobile)
- [x] Trial copy updated to match Option C ("Request a trial session", "Most providers offer a free first session")
