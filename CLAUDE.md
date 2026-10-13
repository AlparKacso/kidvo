# CLAUDE.md: context for AI assistants working on this repo

Read this first. It holds the concept, the decisions so far and what is left to do, so any session (Claude Code, Cowork or another tool) can continue without the original conversation.

## Concept

kidvo.eu: **"Use AI wisely. Keep thinking for yourself."** A free, open-source collection of short browser games that help **children aged 7–13** learn to use AI responsibly without losing their critical thinking. Owner and maintainer: Alpár (personal GitHub). Anyone may propose a game by pull request; only games that fit the mission are merged. The charter and merge rules live in `CONTRIBUTING.md`.

## Decisions

- **Desktop metaphor** ("kidvo OS"): games are windows and icons; overlays draw on top. Original retro look (periwinkle dotted desktop, 2px ink borders, hard shadows, yellow accent, system monospace). One look, no dark mode.
- **Top bar** shows the one-line mission and the language switch (EN / HU / RO). No separate landing page: the desktop is the landing page.
- **Practice AI, never a live LLM.** `shell/ask-ai.js` is the shared, clearly labelled pretend-AI panel. Games write every answer, some deliberately wrong. Live LLMs are out of scope (cost, backend, children's data, moderation, provider terms for minors). A possible later type: "grown-up co-pilot" games that hand a parent a good question to paste into their own AI tool.
- **Age bands:** Explorers (7–9) and Investigators (10–13). Manifest `bands`.
- **Skills:** manifest `skills`, from `SKILLS` in `scripts/lib.mjs` (draft list, aligned in spirit with the EC/OECD AI Literacy Framework, 2026).
- **Languages:** English required, Hungarian and Romanian at launch. Texts in `apps/<id>/lang/<code>.js` via `kidvoStrings(code, {...})`; `kidvo.t(key, vars)` with `Intl.PluralRules` plural forms (`_one/_few/_other`); fallback to English. Desktop texts in `shell/i18n.js`. CI checks that every declared language has the same keys as English. Language stewards (native speakers) review via `.github/CODEOWNERS`. HU and RO steward: Alpár.
- **Parents' guide per game:** `apps/<id>/parents/<code>.html`, one printable A4 page per language, opened from the game's info window or the "For grown-ups" window. CI requires it for games with `bands`.
- **Authorship:** no human/AI/hybrid labels (removed 2026-10-13). Manifest `author` is `{ name, url? }`. Seed games are by "Alpár".
- **Removed 2026-10-13:** Logic-speak, Builders Map (with contributor locations and PR counts), the generative poem before that.
- **Mobile first-class** (2026-10-13): "compact" screens (max-width 700px, or max-height 500px, or a touch screen up to 1100px wide; one query `COMPACT` in shell.js mirrored in shell.css) open every window as a full sheet, and overlays (Vo) hide while a sheet is open so they never cover game buttons. Touch screens get bigger targets via `@media (pointer: coarse)`. Each game has phone and short-landscape layouts; Robot Maze puts ORACLE in a slide-up drawer on phones and uses a three-column layout in landscape. `tests/smoke.mjs` fails if a game is wider than a 360px phone or a 740x360 landscape screen.
- **Progress** (badges, best level, band, current level) is stored per browser via `kidvo.store` (localStorage, 32 KB per game). No accounts, no leaderboards, nothing leaves the device. Robot Maze has a two-tap "start over" for shared family devices.
- **Contact and privacy** (2026-10-13): hello@kidvo.eu (`contactEmail` in `shell/config.js`) is shown in the "For grown-ups" window and in the footer of every parents' guide. The same window has a three-line privacy note: no cookies, accounts or tracking; progress only in this browser; GitHub Pages keeps standard server logs.
- **Stack:** static HTML/CSS/JS on GitHub Pages; cost is the domain only. No third-party requests at all (no fonts, analytics or CDNs).
- **Isolation:** each game runs in `<iframe sandbox="allow-scripts">` with a mandatory CSP meta tag checked byte for byte. Games talk to the desktop only via `shell/sdk.js`.
- **CI:** `scripts/check.mjs` (manifest, CSP, outside links, forbidden APIs, size, language keys, parents' guides, PR file boundary) and `tests/smoke.mjs` (Playwright opens every game, fails on any JS error). PRs may touch only `apps/<id>/`; other files need the maintainer's `core` label. Workflows use `pull_request` with read-only permissions, never `pull_request_target`.
- **One open PR per GitHub account**, enforced by the `one-pr` job in `checks.yml`; maintainers exempt.
- Licensing: MIT for code, CC BY 4.0 for content in `apps/`.

## Games

- `apps/maze`: **Robot Maze**, the reference game. Fewest steps to the star; ORACLE-3000 helps for sparks (3 per level); wrong answers point into walls (Explorers) or plausible dead ends (Investigators); "Are you sure?" always answers "100% sure"; "How do you know?" reveals guessing (Investigators); reflection card and badges (Brain power, Detective, Shortest route). The first answer on level 1 is always wrong. Exposes `window.__robotMaze` only when `navigator.webdriver` is true, for tests.
- `apps/secret-keeper`: **Secret Keeper** (HU Titoktartó, RO Păstrătorul de secrete). Sunny, a deliberately friendly-looking practice AI, asks for personal information mixed with harmless questions; answers are buttons (share / say no / ask a grown-up), never typed. Shields drop when a secret is shared. Investigators get sneakier questions and Sunny pushes back once ("Don't you trust me?"). Lesson: friendly is not the same as safe.
- `apps/sorter`: **Train the Sorter** (HU Tanítsd a Válogatót, RO Antrenează Sortatorul). The child labels fruit to teach SORT-1, a real 1-nearest-neighbour classifier on colour/shape/size. The first examples contain only red apples, so the test shows 3/6 (green and yellow apples and a cherry wrong, all with ~90% confidence); after retraining with varied apples it gets 6/6. The child judges each guess and picks why it failed. Teaches bias.
- `apps/nonsense`: **Confident Nonsense** (HU Magabiztos kamu, RO Sigur, dar greșit). QUIZ-O-TRON answers 6 questions per round, 3 true and 3 made up, all equally confident. The child calls "Sounds true" or "Made up!" and may use 2–3 limited library checks. Separate fact pools for Explorers (animals, nature) and Investigators (myths, capitals, science); every fact was chosen to be well established.
- `apps/pet`: **Vo**, an overlay pet that walks on windows and reacts to every game: cheers on `*:ai-flagged`, `*:caught`, `*:done`, `*:kept`.

## Architecture map

```
index.html            desktop markup, top bar, strict CSP
shell/shell.js        windows, start menu, taskbar, tray, top bar, languages, bus, storage, built-in windows
shell/i18n.js         desktop texts in EN, HU, RO
shell/sdk.js          window.kidvo for games: t, lang, onLang, store, emit/on, open, notify, setTitle
shell/ask-ai.js       the practice-AI panel (kidvoAI.create)
shell/shell.css       the OS look (tokens at the top)
apps/<id>/            manifest.json, index.html, icon, lang/<code>.js, parents/<code>.html
apps/registry.js|json generated by scripts/build-registry.mjs (gitignored)
scripts/lib.mjs       the rules: CSP, limits, skills, languages, manifest schema
templates/app/        a working mini game with a practice AI, ready to copy
```

Bus protocol (postMessage, `{kidvo:1, kind}`): app→shell `hello`, `sub`, `emit`, `call`. Shell→app `init {appId, winId, lang}`, `lang {lang}`, `event`, `reply`. App topics are prefixed with the sender's id.

**Claude artifact preview:** the private preview host refuses file requests from sandboxed frames, so the preview copy inlines every `<script src>` into each game page. The real site does not need this.

## Commands

`npm install` · `npm run dev` (localhost:8080) · `npm run check` · `npm run smoke` · `npm test`

## Launch checklist (Alpár)

- [ ] Review the Hungarian and Romanian texts (`shell/i18n.js`, `apps/*/lang/`, `apps/maze/parents/`).
- [ ] Retire the old kidvo marketplace repo first: see `RETIRE-AND-RESTART.md` in that repo (rename it to `kidvo-v1` and archive it, so this one can be `kidvo`).
- [x] GitHub user `AlparKacso` filled in everywhere (was a placeholder).
- [ ] Create a public repo `kidvo` on the personal GitHub account.
- [ ] Check the copyright name in `LICENSE`.
- [ ] First commit and push to `main`.
- [ ] Settings → Pages → Source: **GitHub Actions**. Custom domain `kidvo.eu`, enforce HTTPS.
- [ ] DNS: apex `A` 185.199.108.153, .109.153, .110.153, .111.153; `www` CNAME `alparkacso.github.io`. Verify the domain under account Settings → Pages.
- [ ] Ruleset on `main`: require PR, status checks "Do no harm (automatic part)" and "One open PR per person", Code Owner review, no force pushes.
- [ ] Create labels `core`, `idea`, `report`.
- [x] Contact address: hello@kidvo.eu (README, "For grown-ups" window, parents' guides).
- [ ] Send a test email to hello@kidvo.eu after any DNS change (keep the MX records).

## Backlog

- More games for the skills not yet covered: `spot-ai-made` (Real or Robot?), `ask-better-questions` (Better Question), `your-idea-matters`.
- Clear the practice-AI transcript (or re-greet) when the language changes mid-game; today old answers stay in the previous language.
- Optional read-aloud for Explorers (check that browser voices work offline first).
- An education co-curator and a written review checklist.
- First-pass AI reviewer for PRs (labels and summary, no secrets on forks).

## Conventions

- Keep the shell small and boring; let games be good.
- Plain, direct copy. No emoji in the UI. Short sentences for Explorers.
