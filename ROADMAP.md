# Kidvo Pre-Launch Roadmap

> Supabase RLS security ✅ fixed. Now working through phases below.

---

## ✅ Security (Done)
- [x] RLS enabled on all public tables (`listings`, `trial_requests`, `users`, `children`, `areas`, `child_interests`, `categories`, `saves`, `listing_schedules`, `listing_views`, `tips`, `providers`)
- [x] `listing_views` INSERT policy tightened (`WITH CHECK user_id = auth.uid() OR user_id IS NULL`)
- [ ] Leaked password protection → enable manually in Supabase dashboard (Auth → Security)

---

## Phase 1 — Provider-First (Before First Partner Outreach)
*The first partner is a provider. Their listing creation & management experience must be polished.*

- [x] **Listing cover photo upload + crop** — Interactive crop modal (canvas-based, no deps), locked to card aspect ratio with live preview. `Effort: M`
- [x] **Google Maps pin on listing** — Field in listing form + "View on Google Maps →" link on detail page. `Effort: S`
- [ ] **Provider Activities / Bookings / Analytics redesign** — The provider dashboard is what the partner sees every day. Polished UI = higher confidence. `Effort: L`
  - [ ] **"Show contact details" CTA on listing detail page** — Hide provider phone/email behind a reveal button. Tracks intent between browsing and committing to a trial. `Effort: S`
  - [ ] **"Contact reveals" as analytics funnel step** — Surface the count in provider analytics between *Total Views* (card → detail page clicks) and *Trial Requests*, making the full conversion funnel: Views → Contact Reveals → Trial Requests. `Effort: S`
- [ ] **"Trial available" toggle audit** — Clarify what the toggle does vs our core promise "book a free trial". Consider surfacing as "*free trial if available" on cards/CTAs rather than a hidden toggle. `Effort: S`

---

## Phase 2 — Parent Experience Polish
*Once a provider is live, parents need a compelling, bug-free experience to convert.*

- [ ] **Fix internal nav links & CTAs** — Broken links kill trust on first visit. Quick win. `Effort: S`
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

## Landing Page
- [x] **Replace landing page cards with real listing photos** — Now that listings have cover images, the landing page showcase cards should pull from live data instead of static placeholders. `Effort: S`
- [x] **"I'm a provider" button → scroll to For Providers section** — Currently navigates away or does nothing useful. Should anchor-scroll to the provider value prop section on the same page. `Effort: XS`
