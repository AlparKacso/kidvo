# Kidvo Persona Testing Pack

Five research-grounded personas for manual UX test passes against staging (staging.kidvo.eu) or local dev. Each persona file is a **scored pass/fail sheet**: run the persona's scenario end-to-end *as that person* (their patience, their vocabulary, their device habits), then score each checklist item.

These complement the automated e2e specs in this directory — the specs verify the app *works*; these sheets verify a specific human *understands* it.

## The personas

| File | Persona | Role | What they stress-test |
|---|---|---|---|
| [karen-corporate-parent.md](karen-corporate-parent.md) | Cristina "Corporate Karen" Munteanu, 39 | Parent | Trust signals, provider response speed, contact-reveal gate, reviews |
| [eniko-logistics-juggler.md](eniko-logistics-juggler.md) | Enikő Kovács, 34 | Parent | Multi-kid calendar, overlap warnings, waitlist offers, language gap |
| [rares-artsy-maestro.md](rares-artsy-maestro.md) | Rareș, 54 | Provider | Least-tech-savvy listing flow, auto-Group invisibility, phone-first |
| [livia-rigorous-director.md](livia-rigorous-director.md) | Livia Popescu, 47 | Provider | One Activity → many Groups, cohort discipline, waitlist→offer chain |
| [alex-side-hustle-coach.md](alex-side-hustle-coach.md) | Alex Șerban, 28 | Provider | Self-serve speed, analytics funnel, cold-start retention, churn |

## Scoring

Each checklist item gets one of:

| Score | Meaning |
|---|---|
| **2 — Pass** | The persona completes/understands it without hesitation, in character |
| **1 — Partial** | They get there, but with visible confusion, backtracking, or luck |
| **0 — Fail** | They give up, do the wrong thing, or form a wrong mental model |
| **n/a** | Not reachable in this run (note why) |

Persona score = points ÷ (2 × scored items), as a percentage.

- **≥ 85%** — persona is served; ship-safe for this segment
- **60–84%** — usable but eroding trust; schedule fixes
- **< 60%** — this persona churns; treat as release blocker for their segment

**Scoring discipline:** score what the persona would *actually* experience, not what a developer who knows the model would. If you had to use insider knowledge to proceed, that item is at best a 1.

## How to run a pass

1. Fresh account (or the persona's standing test account) on **staging** — never prod. Heed the Supabase email rate limit: re-runs should reuse accounts rather than re-signing up.
2. Use the persona's stated device posture (Karen & Enikő: phone-width viewport; Rareș: phone only).
3. Work through the sheet's scenario script in order. Fill the Score and Notes columns as you go — don't reconstruct from memory afterwards.
4. Copy the **Run log** row template (bottom of each sheet) into the sheet with date, build/commit, and total score, so scores are comparable across releases.
5. File each 0-score item as an issue; link it in Notes.

## Known-risk annotations

Items marked ⚠️ were identified as likely failures in the 2026-07 Groups-UX review (flat kanban with Listed/Manual badges, listing-detail duplication in the docked panel, trial-confirm placement trap). Re-score them after the Groups redesign lands — they are the regression canaries for that work.
