# Contributing to kidvo

Thanks for wanting to build something for kids. This page is the charter (what gets merged and why) and the practical guide.

## The mission

**Use AI wisely. Keep thinking for yourself.** kidvo only merges small games that help children aged 7 to 13 learn to use AI responsibly without losing their critical thinking.

## Merge rules

A pull request is merged when it meets all four:

1. **Do no harm.** Safe and suitable for children (every text, picture and sound, and your author name and link), collects nothing, breaks nothing that is already there. CI checks the technical part.
2. **Teaches one named skill.** The manifest lists 1 to 3 skills from the list below, and the game clearly practises them.
3. **The child stays in charge.** Thinking comes first, asking the AI is optional and has a visible cost, and checking is rewarded.
4. **It's fun.** A child would play it twice.

House rules: **one open pull request per GitHub account** (CI enforces it), and **a parents' guide with every game**.

### Skills

| id | The child learns that... |
|---|---|
| `ai-can-be-wrong` | AI answers can be wrong, even when they sound sure, so you check them |
| `when-to-ask` | sometimes thinking yourself is better than asking AI |
| `ask-better-questions` | how you ask changes what you get |
| `keep-secrets` | you don't share personal information with AI |
| `spot-ai-made` | you can learn to tell AI-made from human-made |
| `ai-learns-from-examples` | AI learns patterns from examples, and biased examples make biased AI |
| `your-idea-matters` | you can use AI for help and still own your ideas |

The list follows the spirit of the EC/OECD AI Literacy Framework for primary and secondary education. New skills can be proposed in an issue.

### Age bands

- **Explorers (7–9):** very short sentences, tap-only, wrong AI answers that are easy to spot.
- **Investigators (10–13):** longer reasoning, believable wrong answers, trade-offs.

A game can support one band or both.

## The practice AI

Games never call a real AI. They use `shell/ask-ai.js`, a shared, clearly labelled practice-AI panel:

- question buttons with a cost in sparks, a short "thinking" pause and typed answers
- follow-up questions after each answer
- a "Not right?" button on every answer, so children can flag mistakes
- `stats()` at the end of a round: asked, spent, wrong answers given, caught, missed

**Your game decides every answer, including the deliberately wrong ones.** Make the AI look like a machine, not a friend.

## Quick start

```bash
npm install
npx playwright install chromium webkit   # browsers for the smoke test (Chromium and Safari's engine)
cp -r templates/app apps/my-game     # a working mini game with a practice AI
npm run dev                          # http://localhost:8080
npm test                             # static checks + a real-browser smoke test
```

A game is one folder:

```
apps/my-game/
  index.html        the game
  manifest.json     name, author, bands, skills, languages, translations of name and description
  icon.svg          16x16 pixel art looks best
  lang/en.js        every text the child sees (plus lang/hu.js, lang/ro.js, ...)
  parents/en.html   one printable A4 page for parents and teachers (one per language)
```

You get the credit: `author.name` appears on your game's window as "by <name>" (use your GitHub username or the name you want children to see), and `author.url` (for example your GitHub profile) is linked from the game's info window. Both must be suitable for children: the curator checks them, and a name may only use letters, digits, spaces and `. _ - '`.

Robot Maze (`apps/maze`) is the reference game. Copy its patterns.

## Languages

- **English is required.** Every key in `lang/en.js` must exist in every other language file. CI checks this, and plural forms (`_one`, `_few`, `_other`) are handled by the SDK.
- **Hungarian and Romanian are welcome from day one** but not required. A game that lacks the player's language falls back to English.
- **Translations can be separate pull requests**, by anyone. That is the easiest way to contribute without coding.
- **Every language has a steward**, a native speaker who reviews its texts (see `.github/CODEOWNERS`). Hungarian and Romanian: the maintainer. A new language joins when someone translates the desktop (`shell/i18n.js`) and agrees to be its steward.

## Talking to the desktop

```js
kidvo.t('key', { n: 3 })        // your text in the player's language
kidvo.onLang(lang => {})        // re-render texts when the language changes
kidvo.store.get / set           // up to 32 KB per game, in the visitor's browser
kidvo.emit('solved', {...})     // others hear "my-game:solved"
kidvo.on('maze:solved', fn)     // listen to other games
```

## Hard limits (CI)

- Only your folder: a pull request may change `apps/<your-id>/` and nothing else. Changes to the desktop are "core" and need a maintainer's label.
- The content-policy `<meta>` line from the template in every HTML file. No outside links, CDNs, fonts or network calls.
- No WebSockets, WebRTC, cookies, service workers or navigating the desktop.
- 300 KB per game, 60 files, common web file types only.
- The desktop and every game must open without a single JavaScript error.
- **Every game must work on phones**, portrait and landscape, and on tablets. On small or touch screens the desktop opens games full-screen; your game must fit a 360 px wide screen without sideways scrolling (CI checks this), use buttons at least 44 px tall for fingers (`@media (pointer: coarse)`), and stay playable in a short landscape screen (`@media (max-height: 480px)`). Robot Maze shows one way: on phones its practice AI slides up as a drawer.

## Review

1. CI runs `npm run check` and the smoke test. It tells you exactly what to fix.
2. The maintainer reviews rules 2 to 4 and the texts, then merges, asks for one change, or closes with a written reason.
3. Merged games go live automatically.

## Licensing

By opening a pull request you agree that your code is MIT-licensed and your texts, art and sound are CC BY 4.0. Only submit what you have the right to share: no copyrighted characters, logos or lyrics.
