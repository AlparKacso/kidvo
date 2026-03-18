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

- [ ] **Listing cover photo upload + crop** — Emoji placeholders look unfinished. Real photos are the #1 visual differentiator in browse. `Effort: M`
- [ ] **Google Maps pin on listing** — Parents evaluate activities by proximity. A map link on listing detail adds trust and utility. `Effort: S`
- [ ] **Provider Activities / Bookings / Analytics redesign** — The provider dashboard is what the partner sees every day. Polished UI = higher confidence. `Effort: L`

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
