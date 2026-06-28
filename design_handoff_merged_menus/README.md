# Handoff: Merged menus — Provider **Classes** & Parent **Calendar**

## Overview

Two surface merges for the kidvo app, both aimed at killing the constant screen‑hopping in today's product:

1. **Providers — merge _Activities_ (the public listing) into _Classes_ (the roster board).**
   Today a provider edits the public listing on one screen (`/listings`) and works the class roster on another (`/listings/classes`). Editing a price means leaving the roster entirely. The merge keeps the roster board intact and **docks the listing details directly below it**, so the listing is always reachable without navigating away. Confirming a trial request happens right there — and because confirming a trial auto‑enrols the child into that listing's class, the roster and capacity update in place.

2. **Parents — merge _Kids & Activities_ into the _Calendar_.**
   Today the weekly calendar (`/kids/calendar`) is separate from Kids & Activities (`/kids`), which owns kid profiles, saved/wishlist items, and the "unassigned" bucket. The merge keeps the real week grid and folds kid management into a left rail (each kid card is filter + profile entry), and gives **saved/wishlist items a home** they never had on the calendar — a "Saved · not booked" tray under the grid.

Both designs were chosen from a prior options exploration (see `Merge Analysis.dc.html` in the project root for the alternatives that were considered and rejected). This package documents the **selected** designs only.

---

## About the design files

The files in this bundle are **design references created in HTML** — an interactive prototype showing the intended look and behaviour. **They are not production code to copy directly.**

The prototype was authored as a "Design Component" (a single self‑contained HTML file with an inline template + a `Component` logic class). That authoring format is specific to the design tool and **should not be reproduced** in the kidvo codebase. Your task is to **recreate these designs in kidvo's real environment**: Next.js 15 (App Router) + React + TypeScript + Tailwind 3 + Supabase + next‑intl, following the patterns already established in the repo.

The real files these designs modify already exist in the repo (`AlparKacso/kidvo`):

| Surface | Real client file | What it does today |
|---|---|---|
| Provider roster board | `src/app/listings/classes/ClassesManagerClient.tsx` | Kanban roster: waiting pool + class columns, group‑by, capacity bars, member statuses, the storefront `<select>` |
| Provider listings index | `src/app/listings/page.tsx` (+ `ListingCardMenu.tsx`, `[id]/edit/PauseToggle.tsx`) | Public listing cards: status, price, spots, edit/pause/share, trial‑requests tab |
| Parent calendar | `src/app/kids/calendar/FamilyCalendarClient.tsx` | Weekly per‑kid grid, enrolled/pending/waitlisted blocks, event popover |
| Parent kids & activities | `src/app/kids/MyKidsClient.tsx` | Kid profiles, bookings, saved/wishlist, unassigned bucket |

Recreate the merges **inside these existing files / routes** and reuse the repo's existing components, i18n strings, Supabase queries, and Tailwind tokens wherever they already exist. Do not introduce a parallel design system.

---

## Fidelity

**High‑fidelity.** Final colors, typography, spacing, copy, and interactions. Recreate the UI pixel‑accurately using kidvo's existing Tailwind tokens and component patterns. All hex values, sizes, and copy below are exact. Where this prototype hard‑coded a value that already exists as a Kidvo token, **prefer the token** (mapping table in _Design Tokens_).

> Note on copy: the prototype is written in **English** for review convenience. kidvo is **Romanian‑first** — every string below must be added to `messages/ro.json` (primary) and `messages/en.json` (parallel) via `next-intl`, not hard‑coded. Suggested RO translations are given for the new strings in _Interactions & Behavior_.

---

# Screen 1 — Provider · Classes (with docked listing)

### Purpose
A provider manages who is in each class group **and** the public listing each group is fronted under, on one screen, without navigating away.

### Layout
- App shell: fixed **228px** left sidebar + main column. Main column = **52px** topbar (breadcrumb `Listings / Classes`, locale toggle, notification bell) over a scrolling content area padded `24px 24px 40px`.
- Content is a **vertical flex, `gap:18px`**:
  1. **Page header row** — eyebrow `YOUR CLASSES` + `<h1>Classes` + sub‑stat line, with a `Start a group` pill button pushed right.
  2. **Toolbar row** — segmented `By age / By day / All` control (left) + helper text (right).
  3. **Board** — a horizontally‑scrolling flex row of columns, **full width**.
  4. **Docked listing panel** — full‑width card below the board.

### Components

**Board columns** (`flex`, `gap:14px`, each column `flex-shrink:0; width:258px`):

- **Waiting pool column** — width `248px`, `border:1.5px solid #e8e4f0`, `background:rgba(255,255,255,.6)`, `border-radius:18px`, padding `12px`. Header "Waiting pool" + gold count chip (`#fef9e6` bg / `#a07800` text). Grouped by age band (`3–5 / 6–8 / 9–11 / 12+`) when grouped by age, by preferred‑day string when grouped by day, flat when "All". Each pool card: white, `border:1px solid #e8e4f0`, `border-radius:12px`, padding `10px` — gold initial avatar (28×28, `#fef9e6`/`#a07800`), name + "{age}y · {days}" meta, and a full‑width **Offer a spot** button (`#f0e8ff` bg / `#7c3aed` text, `border-radius:8px`).

- **Class columns** — white card, `border-radius:18px`, padding `12px`, `box-shadow:0 2px 12px rgba(124,58,237,.06)`. **Selected** column: `border:1.5px solid #7c3aed` + `box-shadow:0 0 0 3px rgba(124,58,237,.10)`. Header (clickable, selects the column):
  - accent dot (10×10, per‑class color) + class name (700) + status tag.
  - **Tag** = `LISTED` (`#f0e8ff`/`#7c3aed`) or `MANUAL` (`#F0F0F2`/`#6B6B72`), `font-size:9px`, `letter-spacing:.06em`, `border-radius:4px`, padding `2px 6px`. **Tag reflects _effective_ listed state** — an unlisted (detached) class shows `MANUAL`.
  - occupancy label "{occ}/{cap} · enrolled" + a **capacity bar** (height `6px`, track `#ece8f5`): fill color **green `#1A7A4A`** when under cap, **red `#C0392B`** at exactly cap, **gold `#f5c542`** over cap; width = `min(100, occ/cap*100)%`.
  - **Roster member cards**: `border-radius:12px`, padding `10px`. Background/border by status — enrolled `#f0faf4`/`#bfe6cf`, offered `#fffdf5`/`#f0d98b`, requested `#eef6ff`/`#bcd9fb`. Purple initial avatar (28×28, `#f0e8ff`/`#7c3aed`), name (600) + age, optional source tag (`TRIAL` = `#DBEAFE`/`#2563EB`, `WALK-IN` = `#F0F0F2`/`#6B6B72`).
    - **offered** members show a pulsing gold dot + "Awaiting reply" (`#a07800`).
    - **requested** members show a blue dot + "Request pending" (`#2563EB`) and inline **Confirm** (`#1A7A4A` bg / white) / **Decline** (white / `#55527a`) buttons.
  - "+ N more enrolled" muted line.
  - Footer (border‑top `#e8e4f0`): for manual columns a "Turn into listing →" link, plus "+ Add student".

- **New group column** — `flex-shrink:0; width:190px`, `border:2px dashed #d5d0e0`, big `+` and "New group".

**Docked listing panel** (full‑width `<aside>`, `border:1.5px solid #e8e4f0`, **`border-top:3px solid #7c3aed`**, `border-radius:18px`, `box-shadow:0 2px 12px rgba(124,58,237,.06)`):

- **Panel header** bar — `background:#faf7ff`, padding `12px 18px`, border‑bottom `#f0eef6`: purple `▾` + "Listing details" (800) + "— {class name}" muted.

- **LISTED state** body, padding `18px`:
  - **Relationship banner** (the explainer): `background:#f0e8ff`, `border-radius:10px`, padding `11px 13px`, an accent dot + two lines. Line 1 (ink): _"**{class name}** is one of the groups running under this listing — the listing is the public page families see on kidvo, this roster is who's actually in this group."_ Line 2 (`#55527a`): context‑dependent (see Interactions). **This wording is deliberate: a listing can have many class groups (cohorts); a class is _one group within_ a listing, not the whole activity.**
  - **3‑column grid** `208px / 1fr / 1.25fr`, `gap:24px`:
    - **Cover** — `height:128px`, `border-radius:12px`, `linear-gradient(135deg, rgba(accent,.18), rgba(accent,.45))` with the category emoji at 46px and a "📷 {n} photos" chip top‑left. Below it a status pill: active `#D6F5E5`/`#1A7A4A` "● Live · active", paused `#F0F0F2`/`#6B6B72`, pending `#fef9e6`/`#a07800`.
    - **Details** — eyebrow "DETAILS" + a 2‑col grid of label/value pairs: **Price** (`{price} {unit}`, value 800/14px), **Schedule**, **Ages**, **Area**, **Spots** ("{n}/{tot} open", recomputed after confirms). Labels are 10px uppercase `#9590b3`.
    - **Trial requests** — eyebrow "TRIAL REQUESTS" + "{n} new" gold chip. Each pending request: `border:1px solid #f5e6b8`, `background:#fffdf5`, `border-radius:12px`, padding `10px 11px` — child name + "{x}h ago", parent/preference meta, and **Confirm → enrol** (`#D6F5E5`/`#1A7A4A`) / **Decline** (white/`#C0392B`) buttons. Footnote: "Confirming adds the child straight to this class roster." Empty: "No pending requests right now."
  - **Actions row** (border‑top `#f0eef6`, padding‑top `16px`): **Edit listing** (`#7c3aed`/white), **Preview public page →** (white, `border:1.5px solid #d5d0e0`), and pushed right a quiet **Unlist this group** (text‑only `#9590b3`).
  - **Unlist confirm speed‑bump** (appears inline when "Unlist this group" clicked): `border:1px solid #f6d9d4`, `background:#fdf4f3`, `border-radius:12px`, padding `13px 15px`. Title "Unlist {class name} from its public listing?"; body "Enrolled kids stay in the roster — the group just stops showing publicly and won't take new trial requests until you re‑list it."; **Unlist group** (`#C0392B`/white) / **Keep listed** (white/`#55527a`).

- **MANUAL state** body (a class with no listing, or one that was unlisted), padding `18px`, 2‑col grid `208px / 1fr`, `gap:24px`:
  - Left: a `128px` hatched placeholder (`repeating-linear-gradient(45deg,#f3f1f9,#f3f1f9 10px,#ece8f5 10px,#ece8f5 20px)`) with the emoji.
  - Right:
    - Badge — natively‑manual: `#F0F0F2`/`#6B6B72` "Manual group · only you can see it"; previously‑listed (detached): `#DBEAFE`/`#2563EB` "Unlisted · only you can see it".
    - **If detached**, a blue re‑list banner (`border:1px solid #d6e4f5`, `background:#eef5fb`, `border-radius:12px`): "This group still has a listing — it's just unlisted. / Put it back exactly as it was, or point it at a different listing below." + **Re‑list this group →** (`#2563EB`/white).
    - Headline (600): natively‑manual "Show this group on a public listing"; detached "Point it at a different listing". Sub (`#9590b3`): "so families can find it and request a trial. Either attach it to a listing you already run, or publish it as a brand‑new one."
    - **Controls row**: a **Choose an existing listing ▾** dropdown trigger (`min-width:240px`, `border:1px solid #e8e4f0`, `border-radius:9px`, padding `10px 13px`) → opens a popover listing other live listings (accent dot + name + "{spots} open"), each pick fronts this group under that listing; with a footnote "Trial requests for that listing will land in this group's roster." Then "or", then **Publish as new listing →** (`#7c3aed`/white).

---

# Screen 2 — Parent · Calendar (with kid rail + saved tray)

### Purpose
A parent sees everyone's week at a glance, manages kids (filter + profile), and parks saved/wishlist activities that aren't booked yet — on one screen.

### Layout
- Same app shell (sidebar 228px + topbar). Parent sidebar nav: Discover (Home, Browse, Saved ×3) + Manage (Kids, Calendar ✓active, Trial requests, Settings). User chip "Andrei P. · Parent · 2 kids".
- Content header: `<h1>Calendar` + sub "Everyone's week at a glance — manage your kids and what they're signed up for, all in one place."
- Body grid: **`236px / minmax(0,1fr)`, `gap:18px`, `align-items:start`** — left rail + week‑grid card.

### Components

**Left rail** (`flex-column`, `gap:12px`):
- **Kid filter cards** — "All kids" (ink avatar with 👨‍👧‍👦) then one per kid. Each: `border-radius:12px`, padding `9px 10px`, `border:1px solid #e8e4f0` (active: `border:1px solid #1c1c27` + `background:rgba(28,28,39,.04)`). Round avatar (30×30) in the kid's color with initial; name (700) + "{age} years"; optional pending gold chip; activity count. **Add a kid** dashed card below.
- **Selected‑kid profile card** (only when a specific kid is selected) — `border:1px solid #e8e4f0`, `border-radius:14px`, padding `13px`: color avatar + name (800) + "{grade} · {area}" + **Edit** button; then chips — `{age} years` / area / grade (neutral `#ece8f5`/`#55527a`) and per‑interest category chips colored by category (Dance `#be123c`, Music `#0369a1`, Sport `#523650`, Chess `#374151`, Coding `#065f46`). This is the Kids‑&‑Activities profile, merged in.
- **Status legend card** — Enrolled (solid tint swatch), Pending trial (dashed swatch), Waitlisted (hatched swatch).

**Week‑grid card** (`border:1px solid #e8e4f0`, `border-radius:14px`, white, `overflow:hidden`):
- **Range header** — "{d Mon} – {d Mon yyyy}" (700) + `‹ Today ›` nav.
- **Day headers** — grid `46px repeat(7, 1fr)`; each cell border‑bottom + border‑left `#e8e4f0`, weekend cells `#f4f1fa`. DOW (10px uppercase) over date number (800). Today (when weekOffset 0): purple text.
- **Grid body** — same column template; first column is the **time gutter** (`46px`, hours `9:00`–`18:00`, each row **`44px`** tall). Each day column: `position:relative`, height = `(19−9)*44 = 440px`, weekend tinted `rgba(236,232,245,.5)`, hour lines drawn with a `repeating-linear-gradient`.
- **Event blocks** — absolutely positioned: `top = (start−9)*44`, `height = (end−start)*44 − 4`, `left/right:2px`, `border-radius:7px`, `border-left:3px solid {kidColor}`, padding `4px 6px`. Style by status:
  - **enrolled** — `background` = kid color mixed to ~14% tint; title in a darkened (~78%) kid color.
  - **pending** — white bg + `1.5px dashed {kidColor}` border; "⏳ Pending" note.
  - **waitlisted** — diagonal hatch of the kid color at ~12% over white; "📋 #{position}" note.
  - In **All kids** view, enrolled blocks also show a small "● {kid name}" tag in the kid's color.
  - Title 10.5px/700 ellipsised, time label "{h:mm}–{h:mm}" 9.5px `#55527a`. Click → popover.
- **Event popover** (`position:fixed`, `width:250px`, anchored near the click, `border-radius:12px`, `box-shadow:0 12px 32px rgba(0,0,0,.18)`, padding `13px`): status badge (enrolled `#D6F5E5`/`#1A7A4A`, pending `#DBEAFE`/`#2563EB`, waitlisted `#F0F0F2`/`#6B6B72`), title (800), "{provider} · {kid}", "{days} · {time}", then actions — enrolled: **Add to calendar** (`#7c3aed`/white) + **Contact provider** (ghost); pending: **Withdraw request** (danger ghost); waitlisted: **Leave waitlist** (danger ghost). A full‑screen transparent scrim closes it.
- **Saved tray** (border‑top `#e8e4f0`, `background:#fffdf5`, padding `12px 16px`) — the wishlist home, merged in: eyebrow "💛 SAVED · NOT BOOKED YET" + right‑aligned hint "drag onto a day to request a trial →". Chips: white, `border:1px solid #f5e6b8`, `border-radius:11px`, padding `8px 11px`, `cursor:grab` — tinted emoji tile (26×26), title (700) + meta ("{kid} · {category} · {price}" in All view), and a **Request trial →** button (`#2aa7ff`/white) or muted "On waitlist". Filtered to the selected kid.

---

## Interactions & Behavior

### Provider
- **Select a class** → click any column header. Sets `selectedClassId`; the docked panel re‑renders for that class. Resets `pickerOpen` and `detachConfirm`.
- **Confirm a trial request** (in panel _or_ on a "requested" roster card) → marks it confirmed, the child becomes an enrolled roster member, the column's occupancy +1 and the capacity bar/Spots value recompute. Toast: "{child} confirmed — enrolled in {class}". **This mirrors the real `autoEnrolConfirmedTrial` behaviour — implement against the same Supabase mutation.**
- **Decline** → removes the request/roster card. Toast.
- **Offer a spot** (pool card) → toast "Spot offered to {name}" (in production: creates an offered enrolment).
- **Unlist this group** → opens inline confirm (no immediate action). **Unlist group** sets the class's `listing_id = null` (detached): tag flips LISTED→MANUAL, panel switches to manual state with the blue re‑list banner. **Keep listed** dismisses.
- **Re‑list this group →** → restores the previous `listing_id` (one click, no confirm — restoring is safe). Toast "{class} is live again".
- **Choose an existing listing ▾** → popover of other live listings; picking one sets `listing_id` to that listing. Toast "{class} now shows on "{listing}"".
- **Publish as new listing →** → enters the listing‑creation wizard (real route `src/app/listings/classes/[id]/quick-start`).

**Key model rule (get this right):** a listing (activity) can have **many** classes/cohorts pointed at it via `class.listing_id`; a class is **one group within** a listing. Re‑pointing a _live_ class always goes through unlist → re‑assign (deliberate speed‑bump); natively‑manual groups assign directly. Copy must never imply class == listing.

Suggested RO strings for the new provider copy:
- "Unlist this group" → "Scoate grupa din anunț"
- "Re‑list this group →" → "Pune grupa înapoi în anunț →"
- "Choose an existing listing ▾" → "Alege un anunț existent ▾"
- "Publish as new listing →" → "Publică drept anunț nou →"
- Banner L1 → "{class} este una dintre grupele din acest anunț — anunțul e pagina publică pe care o văd familiile pe kidvo, iar lista de aici sunt copiii din această grupă."

### Parent
- **Select a kid** → filters the grid + saved tray to that kid and reveals the profile card. "All kids" shows everyone (color‑coded, with name tags on enrolled blocks).
- **Prev/Next/Today week** → shifts `weekOffset`; the range label + day numbers recompute. (Events here are recurring weekly, so they persist across weeks in the prototype — wire to real dated occurrences.)
- **Open event** → popover with status‑specific actions (above).
- **Request trial** (saved chip) → toast "Trial requested for {title}" (in production: creates a trial request, the item leaves Saved and appears as a pending block).
- **Drag a saved chip onto a day** → the intended gesture for "wishlist → trial request" (prototype shows the affordance/hint; implement as a real drag‑drop that opens the day/time picker then files the request).

### Animations
- Gold "new"/"awaiting" dots pulse: `pulseGold` 2s infinite (scale 1→.82, opacity 1→.65) — matches the existing Kidvo keyframe.
- Card hover: lift `-translate-y-0.5` + shadow `--shadow-card` → `--shadow-card-hover`.
- Buttons: `hover:opacity-80` (filled) or shift to a deeper color; outlined → `border-primary` + `bg-primary-lt/50`.
- Everything else `transition-colors` / `transition-all 150ms ease`. No scroll reveals.

### Toasts
Centered bottom pill, `#1c1c27`/white, `border-radius:9999px`, auto‑dismiss ~2.6s. Use the repo's existing toast/notification mechanism if one exists.

---

## State Management

### Provider (`ClassesManagerClient`)
- `groupBy: 'age' | 'day' | 'none'` — pool grouping.
- `selectedClassId` — drives the docked panel.
- `pickerOpen` — the "choose existing listing" popover (reset on class switch).
- `detachConfirm: classId | null` — which class is showing the unlist speed‑bump.
- Server‑backed (Supabase): `class.listing_id` (front/unlist/re‑point), trial‑request → enrolment confirm/decline (`autoEnrolConfirmedTrial`), occupancy derived from enrolments. The prototype's local `confirmed` / `rosterReq` / `detached` maps stand in for these mutations.

### Parent (`FamilyCalendarClient` + folded‑in `MyKids`)
- `selectedKid: 'all' | kidId` — filters grid, profile card, saved tray.
- `weekOffset` — week navigation.
- `openEventId` (+ click position) — popover.
- Data: kids, weekly enrolments/occurrences with status (enrolled/pending/waitlisted + waitlist position), saved/wishlist items (per kid, with `open` vs `on waitlist`). Fetch from the existing calendar + kids/saved queries.

---

## Design Tokens

Prefer the Kidvo `var(--*)` tokens (in `tailwind.config.ts` / `colors_and_type.css`); the prototype hard‑coded equivalents for portability. Mapping:

**Brand & neutrals**
- `#7c3aed` → `--primary` (primary‑deep for hover) · `#f0e8ff` → `--primary-lt` · `#1c1c27` → `--ink` · `#55527a` → `--ink-mid` · `#9590b3` → `--ink-muted` · `#e8e4f0` → `--border` · `#ece8f5` → `--bg` · `#fff` → `--surface`
- `#2aa7ff` → `--blue` (booking CTAs) · `#2563EB` ≈ pending/info blue · `#f5c542`/`#F0A500` → `--gold`/`--gold-deep` · `#a07800` ≈ `--gold-text`
- Success `#1A7A4A` / `#D6F5E5` → `--success`/`--success-lt` · Danger `#C0392B` / `#fdf4f3` → `--danger`/`--danger-lt`

**Category accents** (cover gradients, dots, kid colors): Dance/rose `#be123c`, Music/blue `#0369a1`, Sport/plum `#523650`, Chess/slate `#374151`, Coding/emerald `#065f46` → `--cat-*`.

**Typography** — **Onest** only (300–900). Used: `<h1>` 22–24px/800 tracking `-0.5px`; card titles 13–16px/700–800; body 12–13.5px; eyebrows 10–11px/700 uppercase tracking `.1–.12em`; meta 10.5–11px `#9590b3`.

**Radii** — `6 / 8 / 10 / 12 / 14 / 18 / 9999`. Columns & docked panel `18px`; cards `12–14px`; buttons/fields `7–9px`; pills `9999`.

**Shadows** — card `0 2px 12px rgba(124,58,237,.06)` (`--shadow-card`), hover `0 8px 28px rgba(124,58,237,.13)` (`--shadow-card-hover`), focus `0 0 0 3px rgba(124,58,237,.08)` (`--shadow-focus`), selected column `0 0 0 3px rgba(124,58,237,.10)`, popover `0 12px 32px rgba(0,0,0,.18)`.

**Spacing** — content padding `24px`; board/section gaps `14–18px`; card padding `10–18px`; grid row height `44px`; sidebar `228px`; topbar `52px`.

---

## Assets

- **Logo**: wordmark "kid" (ink) + "vo" (`--primary`, or gold on dark). Files in the design system: `assets/kidvo-logo.png`, `kidvo-logo-bg.png`, `kidvo-logo-white.png`. Use the repo's existing `KidvoLogo` component.
- **Icons**: sidebar/topbar use bespoke 1.5px‑stroke inline SVGs (`currentColor`, round caps) — reuse the repo's existing `Icon*` components. The prototype draws equivalents (home, chart, grid, users, inbox, gear, search, heart, calendar, bell). If you need one not in the kit, substitute Lucide at 1.5px and flag it.
- **Category iconography**: emoji (⚽💃🎵💻♟️🤸🎨🌍 …) — native rendering, per the design system. Used in cover placeholders (46px) and saved‑tray tiles.
- No raster imagery in these screens; cover "photos" are accent gradients + emoji placeholders. Real cover photos (4:3 webp) replace them where a listing has them.

---

## Files

- **`Final Designs.dc.html`** — the interactive prototype for **both** screens (toggle top‑right: "🏫 Providers · Classes" / "📅 Parents · Calendar"). This is the source of truth for look & behaviour. Open in a browser to interact. _Authoring format is design‑tool specific — reference it, don't port it._
- **`screenshots/`** — static reference captures:
  - `01-provider-classes.png` — Classes board: waiting pool + class columns, capacity bars, member statuses.
  - `02-provider-listing-panel.png` — docked **Listing details** panel (LISTED state): relationship banner, details grid, trial requests with **Confirm → enrol**, and the **Unlist this group** action.
  - `03-provider-manual-assign.png` — MANUAL state: "Show this group on a public listing" with the **Choose an existing listing ▾** picker open + **Publish as new listing →**.
  - `04-parent-calendar.png` — Calendar, **All kids** view: kid rail, status legend, week grid.
  - `05-parent-saved-tray.png` — afternoon event blocks (enrolled / pending‑dashed / waitlisted) + the **Saved · not booked** tray with **Request trial →**.
  - `06-parent-kid-profile.png` — single kid selected: the merged‑in **profile card** (avatar, grade/area, interest chips).
- **`Merge Analysis.dc.html`** _(project root, not in this bundle)_ — the prior options exploration (3 provider options, 2 parent options) with the rationale for why these designs were chosen. Useful background.

### Repo files to implement against
- `src/app/listings/classes/ClassesManagerClient.tsx` — Screen 1 lives here; add the docked listing panel + unlist/re‑list/assign flows; remove the per‑column storefront `<select>`.
- `src/app/listings/page.tsx`, `ListingCardMenu.tsx`, `[id]/edit/*` — listing fields/actions surfaced in the panel.
- `src/app/kids/calendar/FamilyCalendarClient.tsx` — Screen 2 lives here; add the kid rail (profile card), saved tray, and drag‑to‑request.
- `src/app/kids/MyKidsClient.tsx` — source of the kid‑profile + saved/wishlist data folded into the calendar.
- `messages/ro.json` + `messages/en.json` — add all new copy strings (RO primary).
