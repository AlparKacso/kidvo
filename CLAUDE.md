# CLAUDE.md: context for AI assistants working on this repo

Read this first. It holds the concept, the decisions so far and what is left to do, so any session (Claude Code, Cowork or another tool) can continue without the original conversation.

## Concept

kidvo.eu: **"Use AI wisely. Keep thinking for yourself."** A free, open-source collection of short browser games that help **children aged 7–13** learn to use AI responsibly without losing their critical thinking. Owner and maintainer: Alpár (personal GitHub). Anyone may propose a game by pull request; only games that fit the mission are merged. The charter and merge rules live in `CONTRIBUTING.md`.

## Decisions

- **Desktop metaphor** ("kidvo OS"): games are windows and icons; overlays (Vo) draw between the icons and the windows: above the windows, Safari sends trackpad scrolling to the transparent overlay frame and no window can scroll (2026-10-14). Original retro look (periwinkle dotted desktop, 2px ink borders, hard shadows, yellow accent, system monospace). One look, no dark mode.
- **Top bar** shows the one-line mission and the language switch (EN / HU / RO). No separate landing page: the desktop is the landing page.
- **Practice AI, never a live LLM.** `shell/ask-ai.js` is the shared, clearly labelled pretend-AI panel. Games write every answer, some deliberately wrong. Live LLMs are out of scope (cost, backend, children's data, moderation, provider terms for minors). A possible later type: "grown-up co-pilot" games that hand a parent a good question to paste into their own AI tool.
- **Age bands:** Explorers (7–9) and Investigators (10–13). Manifest `bands`.
- **Skills:** manifest `skills`, from `SKILLS` in `scripts/lib.mjs` (draft list, aligned in spirit with the EC/OECD AI Literacy Framework, 2026).
- **Languages:** English required, Hungarian and Romanian at launch. Texts in `apps/<id>/lang/<code>.js` via `kidvoStrings(code, {...})`; `kidvo.t(key, vars)` with `Intl.PluralRules` plural forms (`_one/_few/_other`); fallback to English. Desktop texts in `shell/i18n.js`. CI checks that every declared language has the same keys as English. Language stewards (native speakers) review via `.github/CODEOWNERS`. HU and RO steward: Alpár.
- **"AI" in every language** (2026-10-13): never MI (HU) or IA (RO). HU: `az AI`, suffixes by back-vowel harmony (`AI-t`, `AI-val`, `AI-nak`, `AI-tól`, `AI-asszisztens`). RO: masculine/neuter, `un AI`, `AI-ul`, `unui AI`, adjectives agree (`un AI real`, `AI-ul ... sigur`). The spelled-out terms (`mesterséges intelligencia`, `inteligență artificială`) stay where they explain the word.
- **Parents' guide per game:** `apps/<id>/parents/<code>.html`, one printable A4 page per language, opened from the game's info window or the "For grown-ups" window. CI requires it for games with `bands`.
- **Authorship:** no human/AI/hybrid labels (removed 2026-10-13). Manifest `author` is `{ name, url? }`. Shown as a quiet "by <name>" next to the window title (2026-10-14, plain text, not a link, so children are not sent to GitHub) and linked in the info window. `author.name` may only use letters, digits, spaces and `. _ - '` and `author.url` must be https; on every PR the check summary shows each touched app's credit to the reviewer, who checks it is suitable for children (no word filter on purpose: it would sit in a public kids' repo and block real names). Seed games are by "Alpár".
- **Removed 2026-10-13:** Logic-speak, Builders Map (with contributor locations and PR counts), the generative poem before that.
- **Mobile first-class** (2026-10-13): "compact" screens (max-width 700px, or max-height 500px, or a touch screen up to 1100px wide; one query `COMPACT` in shell.js mirrored in shell.css) open every window as a full sheet, and overlays (Vo) hide while a sheet is open so they never cover game buttons. Touch screens get bigger targets via `@media (pointer: coarse)`. Each game has phone and short-landscape layouts; Robot Maze puts ORACLE in a slide-up drawer on phones and uses a three-column layout in landscape. `tests/smoke.mjs` fails if a game is wider than a 360px phone or a 740x360 landscape screen.
- **Progress** (badges, best level, band, current level) is stored per browser via `kidvo.store` (localStorage, 32 KB per game). No accounts, no leaderboards, nothing leaves the device. Robot Maze has a two-tap "start over" for shared family devices.
- **Contact and privacy** (2026-10-13): hello@kidvo.eu (`contactEmail` in `shell/config.js`) is shown in the "For grown-ups" window and in the footer of every parents' guide. The same window has a three-line privacy note: no cookies, accounts or tracking; progress only in this browser; GitHub Pages keeps standard server logs.
- **Stack:** static HTML/CSS/JS on GitHub Pages; cost is the domain only. No third-party requests at all (no fonts, analytics or CDNs).
- **Isolation:** each game runs in `<iframe sandbox="allow-scripts">` with a mandatory CSP meta tag checked byte for byte. The CSP lists `https://kidvo.eu` next to `'self'` because Safari matches `'self'` against the sandboxed frame's opaque origin and then blocks every script and image (found 2026-10-14: no game ran in Safari 26.5); `scripts/serve.mjs` swaps in its own address locally. Moving the site to another domain means changing `SITE_ORIGIN`, `APP_CSP` and `GUIDE_CSP` in `scripts/lib.mjs` and every app page. Games talk to the desktop only via `shell/sdk.js`.
- **Security review** (2026-10-14, a colleague's findings plus follow-up). The CSP meta must be the first thing in `<head>`, after only `<meta charset>` and comments: an `<img>` or a stray character before it closes `<head>`, and browsers then ignore the policy. SVG files get no policy when opened as a page (a game that framed or navigated to its own SVG loaded outside files in Chromium and WebKit), so CI accepts drawing-only SVGs (`svgProblems`). Parents' guides open as kidvo.eu itself for printing, so they carry `GUIDE_CSP`, which allows no scripts. One `http-equiv` per page, no symlinks in apps. The PR boundary diffs with `--no-renames` and requires `apps/<id>/` (a rename out of `apps/` used to pass). `tests/rules.mjs` holds every known bypass. Frames get `allow="autoplay"` only, an app may hold 32 bus patterns, and the dev server listens on 127.0.0.1 (`HOST=0.0.0.0` to try a phone) and checks the Host header. The overlay hotspot was left as is: it sits under the windows and can only cover desktop icons.
- **What CI cannot prove.** A PR runs its own copy of `checks.yml` and `scripts/`, so a green check says nothing once a PR touches anything outside `apps/<id>/`: "Files changed" is the gate. CSP does not cover WebRTC, and Safari opens `preconnect` despite it; only text checks (`FORBIDDEN`) catch them, so obfuscated game code still needs the curator's read. A game page opened directly in a tab runs as kidvo.eu (backlog: second origin).
- **CI:** `scripts/check.mjs` (manifest, CSP position and text, SVG content, outside links, forbidden APIs, size, language keys, parents' guides, PR file boundary), `tests/rules.mjs` and `tests/smoke.mjs` (Playwright, in Chromium and WebKit: opens every game and parents' guide, requires the SDK handshake, fails on any JS error and on any request that leaves the local server). PRs may touch only `apps/<id>/`; other files need the maintainer's `core` label. Workflows use `pull_request` with read-only permissions, never `pull_request_target`.
- **One open PR per GitHub account**, enforced by the `one-pr` job in `checks.yml`; maintainers exempt.
- **"Make a game" window** (2026-10-14): start-menu entry for grown-ups and teens 13+ (GitHub's minimum age), not aimed at children. Links CONTRIBUTING.md, the source, the idea form (`app-idea.yml`) and open ideas (issues labelled `idea`). Game ideas waiting for a builder live as issues labelled `idea` + `help wanted`. Repo social preview: `docs/social-preview.png` (Vo on a kidvo window), uploaded by hand in Settings.
- **Sharing** (2026-10-14): `index.html` has Open Graph tags with `shell/og-image.png` (1200x630, Vo). Facebook profile picture and cover: `docs/brand/`. Icons (2026-10-16): "Vo is who, the house is where." Vo (`shell/vo.svg`, a copy of `apps/pet/icon.svg`) is the browser icon and the top-bar logo; `favicon.ico`, `shell/favicon-96.png` and `shell/apple-touch-icon.png` are renders of it. The little house (`shell/logo.svg`) stays on the start button, start menu and built-in windows; window title bars never show Vo, because Vo walks on them. `robots.txt` and `sitemap.xml` sit at the root for Google (deployed by `deploy.yml`).
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

`npm install` · `npx playwright install chromium webkit` · `npm run dev` (localhost:8080) · `npm run check` · `npm run smoke` · `npm test`

## Launch checklist (Alpár)

- [ ] Review the Hungarian and Romanian texts (`shell/i18n.js`, `apps/*/lang/`, `apps/maze/parents/`).
- [x] Retire the old kidvo marketplace repo first (done 2026-10-13: now `AlparKacso/kidvo-v1`, private and archived; see `RETIRE-AND-RESTART.md` there).
- [x] GitHub user `AlparKacso` filled in everywhere (was a placeholder).
- [x] Create a public repo `kidvo` on the personal GitHub account.
- [ ] Check the copyright name in `LICENSE`.
- [x] First commit and push to `main`.
- [x] Settings → Pages → Source: **GitHub Actions**. Custom domain `kidvo.eu`, HTTPS enforced (2026-10-14). The certificate stayed at "new" for 10 hours and only started after removing the custom domain and saving it again in the web UI (the API did not trigger it).
- [x] DNS (2026-10-13, at GoDaddy): apex `A` 185.199.108.153, .109.153, .110.153, .111.153; `www` CNAME `alparkacso.github.io`. Domain verified under account Settings → Pages (TXT `_github-pages-challenge-AlparKacso`).
- [x] Ruleset `main`: require PR with 1 approval and Code Owner review, status checks "Do no harm (automatic part)" and "One open PR per person", no force pushes or deletion. Repository admins may bypass (solo maintainer).
- [x] Create labels `core`, `idea`, `report`.
- [x] Contact address: hello@kidvo.eu (README, "For grown-ups" window, parents' guides).
- [x] Send a test email to hello@kidvo.eu after any DNS change (keep the MX records). Checked 2026-10-13.

## Backlog

- More games for the skills not yet covered, open for contributors as issues #1 Real or Robot? (`spot-ai-made`), #2 Better Question (`ask-better-questions`), #3 Your idea matters (`your-idea-matters`).
- Clear the practice-AI transcript (or re-greet) when the language changes mid-game; today old answers stay in the previous language.
- Optional read-aloud for Explorers (check that browser voices work offline first).
- An education co-curator and a written review checklist.
- First-pass AI reviewer for PRs (labels and summary, no secrets on forks).
- Serve `apps/` from a second origin (for example `play.kidvo.eu` as a second Pages site), so a game page opened directly in a tab cannot read the desktop's storage or act as kidvo.eu. Worth it once games come from people Alpár does not know.

## Conventions

- Keep the shell small and boring; let games be good.
- Plain, direct copy. No emoji in the UI. Short sentences for Explorers.
