# kidvo Design Language

> Reference for "make it aligned with kidvo's design language."
> All values are exact — pulled directly from `tailwind.config.ts`, `globals.css`, and the production codebase.

---

## 1. Brand Identity

**Name treatment** — `kid` in `#1c1c27` + `vo` in `#7c3aed`, never separated, never capitalised.

**Personality** — Clean, trustworthy, slightly playful. Purple-tinted neutrals everywhere (even "black" is `#1c1c27` — a very dark purple-grey). No hard greys, no pure blacks.

**Page feel** — Soft lavender background (`#ece8f5`), white cards that float above it, generous border radii, purple-tinted shadows. Feels airy and premium without being cold.

---

## 2. Colour Tokens

### Brand
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#7c3aed` | Purple — links, active states, icons, primary accents |
| `primary-deep` | `#6d28d9` | Hover on primary |
| `primary-lt` | `#f0e8ff` | Soft purple tint — icon backgrounds, pill hover |
| `primary-border` | `rgba(124,58,237,0.15)` | Subtle purple borders |

### Surfaces & Background
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#ece8f5` | Page background (lavender) |
| `surface` / white | `#ffffff` | Cards, sidebar, nav, footer |
| `border` | `#e8e4f0` | Default border |
| `border-mid` | `#d5d0e0` | Slightly stronger border |

### Text (ink scale — all slightly purple-tinted)
| Token | Hex | Usage |
|---|---|---|
| `ink` | `#1c1c27` | Headings, primary text, dark backgrounds |
| `ink-mid` | `#55527a` | Secondary text, nav items |
| `ink-muted` | `#9590b3` | Captions, labels, placeholders |

### Accent Colours
| Token | Hex | Usage |
|---|---|---|
| `gold` | `#f5c542` | Provider CTAs, warning states, featured badges |
| `gold-lt` | `#fef9e6` | Gold-tinted backgrounds |
| `gold-text` | `#a07800` | Gold-on-light text |
| `blue` | `#2aa7ff` | "Book trial" CTA, primary actions |
| `blue-deep` | `#0090e0` | Hover on blue |
| `blue-soft` | `#e0f2ff` | Blue-tinted backgrounds |

### Status
| Token | Hex |
|---|---|
| `success` | `#1A7A4A` / lt: `#D6F5E5` |
| `danger` | `#C0392B` / lt: `#FDECEA` |
| `info` | `#2563EB` / lt: `#DBEAFE` |
| `zinc` | `#6B6B72` / lt: `#F0F0F2` |

### Category Accent Colours (from DB `accent_color`)
| Slug | Hex |
|---|---|
| sport | `#523650` |
| dance | `#be123c` |
| music | `#0369a1` |
| coding | `#065f46` |
| arts | `#7c3aed` |
| language / languages | `#92400e` |
| chess | `#374151` |
| gym / gymnastics | `#b45309` |

### Category Emojis (canonical map)
```
sport → ⚽   dance → 💃   music → 🎵   coding → 💻
arts → 🎨   language/languages → 🌍   chess → ♟️
gym/gymnastics → 🤸   babysitting → 🍼   other → ✨
```

---

## 3. Typography

**Single font family: Onest** (weights 300–900). Both `font-display` and `font-body` resolve to Onest — use `font-display` everywhere in JSX.

### Custom type scale
| Class | Size | Line-height |
|---|---|---|
| `text-2xs` | 10px | 14px |
| `text-xs` | 11px | 16px |
| `text-sm` | 12px | 18px |
| `text-base` | 13.5px | 21px |
| `text-md` | 15px | 23px |
| `text-lg` | 17px | 25px |
| `text-xl` | 20px | 28px |
| `text-2xl` | 24px | 32px |
| `text-3xl` | 30px | 38px |

### Typographic roles
- **Hero headline** — `font-black`, `clamp(36px,6vw,64px)`, `letterSpacing: clamp(-1.5px,-0.04em,-2.5px)`
- **Section heading** — `font-bold`, `text-2xl md:text-3xl`
- **Card title** — `font-extrabold`, `16px`, `letterSpacing: -0.3px`
- **Body / description** — `text-base md:text-[17px]`, `text-ink-mid`, `leading-relaxed`
- **Eyebrow label** — `text-[10px]`, `font-bold`, `tracking-widest`, `uppercase`, `text-ink-muted`
  - Example: `TRENDING NEAR YOU`, `SIMPLE BY DESIGN`, `FOR PROVIDERS`
- **Badge / tag text** — `font-display text-[11px] font-semibold`
- **Caption / meta** — `text-[13px] text-ink-muted`
- **Logo** — `font-black`, `22px`, `letterSpacing: -1px`; `kid` = `#1c1c27`, `vo` = `#7c3aed`

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 6px | Tiny UI elements |
| `rounded` (DEFAULT) | 10px | Inputs, small buttons |
| `rounded-md` | 14px | Medium cards, dropdowns |
| `rounded-[16px]` | 16px | **Hero CTAs** (exact prototype spec) |
| `rounded-lg` | 18px | Section containers |
| `rounded-[22px]` | 22px | **Activity cards** (act-card-lg) |
| `rounded-2xl` | 24px | Dark provider section |
| `rounded-xl` | ~12px Tailwind default | Inline stat/info boxes |
| `rounded-full` | 9999px | Pills, category tags, avatar |

**Rule**: err on the side of more rounded. Nothing sharp except the smallest utility elements.

---

## 5. Shadows

```
shadow-card       0 2px 12px rgba(124,58,237,0.06)   — resting card
shadow-card-hover 0 8px 28px rgba(124,58,237,0.13)   — hovered card
shadow-focus      0 0 0 3px rgba(124,58,237,0.08)     — focused input
```
All shadows are purple-tinted — never grey.

---

## 6. Spacing & Layout

- **Max content width**: `1200px`
- **Page horizontal padding**: `px-5` (20px) mobile → `md:px-8` (32px) desktop
- **Sidebar**: 248px, white, desktop only (`md+`)
- **Topbar**: 54px tall, white, sticky
- **Content padding in AppShell**: `px-4 pt-5 pb-24 md:px-[28px] md:pt-[26px] md:pb-14`
- **Section vertical spacing**: `pb-14 md:pb-18` between sections

---

## 7. Component Patterns

### Activity Card (`act-card-lg`)
```
Container: bg-white rounded-[22px] border-[1.5px] border-border shadow-card
           overflow-hidden card-hover (hover:shadow-card-hover hover:-translate-y-0.5)

Header:    h-[120px] gradient from hexToRgba(accent,0.15) → hexToRgba(accent,0.40)
           Large emoji at fontSize:52px, lineHeight:1

Body:      p-4
  Tags:    rounded-full font-display text-[11px] font-semibold padding:3px 9px
    - Age range:   bg=hexToRgba(accent,0.12), color=accent
    - Day schedule: bg=#f1f0f5, color=#55527a
    - Open spots:  bg=#e8fde9, color=#15803d
    - Few spots:   bg=#fef9e6, color=#b45309 ("X spots left")
    - Featured:    bg=#fef9e6, color=#b45309
  Title:   font-extrabold 16px letterSpacing:-0.3px text-ink
  Meta:    text-[13px] text-ink-muted (provider · ★ rating)

Footer:    border-t border-border px-4 py-3 flex items-center gap-2
  Price:   font-extrabold 16px text-ink + "/mo" text-[11px] text-ink-muted
  CTA:     bg-blue text-white rounded-[8px] text-[12px] font-semibold padding:6px 12px
           "Book trial →"
  Full:    bg=#f1f0f5 color=#55527a rounded-full "Fully booked"
```

### Category Pills
```
Container: flex gap-2 flex-wrap

Each pill: rounded-full border-[1.5px] font-display text-[13px] font-semibold
           padding: 7px 16px

Inactive:  bg-white border-border text-ink-mid
           hover: border-primary/40 text-primary bg-primary-lt/50

Active "All": background:#1c1c27 color:#fff borderColor:#1c1c27
Active category: background:hexToRgba(accent,0.12) color:accent borderColor:hexToRgba(accent,0.35)

Emoji: <span style={{ fontSize:'14px', lineHeight:1 }}> before label text
```

### Buttons

| Style | Classes / Inline | Usage |
|---|---|---|
| **Primary (hero CTA)** | `bg-ink text-white font-bold rounded-[16px]` + `fontSize:16px padding:14px 28px` | "Browse activities" |
| **Secondary (hero CTA)** | `border-[1.5px] border-border bg-white text-ink font-bold rounded-[16px]` + same sizing | "I'm a provider" |
| **Yellow (provider)** | `bg-gold text-ink font-bold rounded-full` `px-6 py-3` | "List your activity" |
| **Ghost (provider)** | `border border-white/15 text-white/60 rounded-full` `px-6 py-3` | "See how it works" |
| **Book trial** | `bg-blue text-white rounded-[8px] text-[12px] font-semibold` `padding:6px 12px` | Card footer CTA |
| **Nav get-started** | `bg-ink text-white rounded-full text-sm font-semibold px-4 py-2` | Top-right nav |

**Rule**: Hero/section CTAs use `rounded-[16px]` (not `rounded-full`). Pill-shaped buttons (nav, provider) use `rounded-full`. Card micro-CTAs use `rounded-[8px]`.

### Eyebrow + Section Header Pattern
```tsx
<div className="font-display text-[10px] font-bold tracking-widest uppercase text-ink-muted">
  Section name
</div>
```
Often paired with a right-aligned link: `font-display text-sm font-semibold text-primary hover:underline`.

### Hero Stats Row
```tsx
<div className="border-t border-border mt-12 pt-10 flex flex-wrap justify-center gap-x-8 gap-y-5">
  {/* value: font-black 32px letterSpacing:-1px, in a characteristic colour */}
  {/* label: font-medium 13px color:#9590b3 */}
</div>
```
Stat colours: purple `#c38cfa` / blue `#2aa7ff` / green `#22c55e` / ink `#1c1c27`.

### Dark Section (Provider)
```
Background:  #1c1c27 (ink)
Radius:      rounded-2xl
Padding:     p-6 md:p-12
Orbs:        absolute radial-gradient purple (#7c3aed) top-right + blue (#2aa7ff) bottom-left
             opacity-20 and opacity-15, pointer-events-none

Eyebrow:     rgba(255,255,255,0.35)
Heading:     text-white
Body:        rgba(255,255,255,0.52)
Benefits:    rgba(255,255,255,0.68) with gold checkmarks (#f5c542 on rgba(245,197,66,0.18) bg)
Stat boxes:  bg rgba(255,255,255,0.06) border rgba(255,255,255,0.07)
```

### How-It-Works Card
```
bg-white rounded-xl p-5 md:p-6 border border-border shadow-card
Icon container: w-10 h-10 rounded-xl bg-primary-lt text-primary
Step number watermark: font-bold 34px rgba(124,58,237,0.07)
```

### Input Fields (standard)
```
bg-white border border-border rounded focus:border-primary focus:shadow-focus
font-display text-base text-ink px-3 py-2
placeholder: text-ink-muted
```

---

## 8. Navigation

### Landing page nav
```
bg-white border-b border-border
Logo left + Sign in (text-sm font-semibold text-ink-mid) + Get started (bg-ink rounded-full)
```

### AppShell (authenticated)
- **Desktop**: white sidebar 248px + topbar 54px (sticky, white, border-b)
- **Mobile**: topbar + bottom nav (fixed bottom-0, white, border-t, z-40)
- **Bottom nav items**: `flex-col items-center gap-1 py-2`, icon 18px + label 10px font-semibold
- Active colour: `text-primary`; inactive: `text-ink-muted`

---

## 9. Responsive Conventions

| Breakpoint | Tailwind | What changes |
|---|---|---|
| Mobile | default (< 640px) | Single column, `px-5`, compact padding, `flex-col` CTAs |
| sm | 640px+ | 2-col grids, `flex-row` CTAs |
| md | 768px+ | Sidebar appears, desktop padding `px-8`, 2-col sections |
| lg | 1024px+ | 4-col card grids |

**Card grids**: always `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
**Never**: `grid-cols-2` at mobile (cards too narrow for footer content).

---

## 10. Motion & Interaction

- **Card hover**: `hover:-translate-y-0.5 transition-all` + `shadow-card` → `shadow-card-hover`
- **Buttons**: `transition-opacity hover:opacity-80` (primary) or `transition-colors` (outlined)
- **Duration**: all transitions default (150ms) unless specified
- **No heavy animations** — micro-interactions only. `pulse-gold` for notification dots.

---

## 11. Utilities (globals.css)

```css
.nav-label      /* sidebar section headers: 9px bold tracking-nav uppercase text-sidebar-muted */
.section-label  /* browse section dividers: 9.5px with ::after line */
.card-hover     /* consistent card lift: shadow + translate */
.focus-ring     /* input focus: border-primary + shadow-focus */
.pulse-gold     /* notification dot pulse animation */
```

---

## 12. Key Anti-patterns

❌ Hard grey shadows — always use purple-tinted shadows
❌ Pure `#000000` or `#ffffff` for text — use `ink` scale
❌ `grid-cols-2` on mobile for activity cards — use `grid-cols-1`
❌ `rounded` on hero CTAs — use `rounded-[16px]`
❌ `flex-wrap` for stacked mobile CTAs — use `flex-col sm:flex-row`
❌ `overflow-hidden` on page-level wrappers — breaks scroll
❌ Non-Onest fonts — everything uses Onest
❌ Arbitrary greys — reach for `ink`, `ink-mid`, `ink-muted`, `border`
