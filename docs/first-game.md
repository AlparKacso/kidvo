# Your first kidvo game in an evening

kidvo games are small: one folder, plain HTML and JavaScript, no build step, no framework. This guide takes you from an idea to a pull request. [CONTRIBUTING.md](../CONTRIBUTING.md) has the full rules; this page is the path through them.

What you need: Node.js 20 or newer, Git, a GitHub account (13+, GitHub's minimum age) and an evening.

## 1. Pick one skill and one idea

Every kidvo game teaches one to three of these skills to children aged 7 to 13:

| Skill | The child learns that... |
|---|---|
| `ai-can-be-wrong` | AI answers can be wrong, even when they sound sure, so you check them |
| `when-to-ask` | sometimes thinking yourself is better than asking AI |
| `ask-better-questions` | how you ask changes what you get |
| `keep-secrets` | you don't share personal information with AI |
| `spot-ai-made` | you can learn to tell AI-made from human-made |
| `ai-learns-from-examples` | AI learns patterns from examples, and biased examples make biased AI |
| `your-idea-matters` | you can use AI for help and still own your ideas |

No idea yet? The [open game ideas](https://github.com/AlparKacso/kidvo/issues?q=is%3Aissue+is%3Aopen+label%3Aidea) are waiting for a builder. Comment on one before you start, so two people don't build the same game.

Keep it small: one screen, one mechanic, a round that takes two to five minutes.

## 2. Get the code running

Fork [AlparKacso/kidvo](https://github.com/AlparKacso/kidvo) on GitHub, then:

```bash
git clone https://github.com/<you>/kidvo.git
cd kidvo
npm install
npx playwright install chromium webkit
npm run dev
```

Open http://localhost:8080. You see the games page with every game.

## 3. Copy the template

```bash
cp -r templates/app apps/my-game
```

Use your game's id instead of `my-game`: lowercase words joined by hyphens, at most 32 characters. The template is a working mini game: one question and a practice AI that answers it wrong on purpose. Open http://localhost:8080/#my-game to see it.

Then fill in `apps/my-game/manifest.json`:

- `id`: the folder name.
- `name`: up to 32 characters.
- `description`: the text on your game's card. One or two short sentences a child can read, up to 90 characters.
- `author.name`: the name children see on your game's window. Letters, digits, spaces and `. _ - '` only.
- `bands`: `explorers` (7 to 9), `investigators` (10 to 13), or both.
- `skills`: one to three ids from the table above.
- `color`: your card's colour; `added`: today's date.

## 4. Build the game

Three files hold almost everything:

- `index.html` is the game. Keep its first `<meta http-equiv="Content-Security-Policy">` line exactly as it is, first in `<head>`: CI checks it, and it stops the game from reaching the network.
- `lang/en.js` holds every text the child sees. Read them with `kidvo.t('key')`, never as strings in the code, so other languages can follow.
- `icon.svg` is your icon. Shapes only: no scripts, links or embedded images.

**The practice AI.** Games never call a real AI. Use the shared panel from `shell/ask-ai.js`, as the template does: `kidvoAI.create(element, { sparks, text, questions, onFlag })`. Your game writes every answer, including the wrong ones. Three rules make a kidvo game:

1. **The child thinks first.** Asking the AI is optional and has a visible cost (sparks, in the template).
2. **Wrong answers are wrong on purpose** and catchable: easy to spot for Explorers, believable for Investigators.
3. **Checking is rewarded**, and so is solving it yourself. Make the AI look like a machine, not a friend.

**Tell the desktop what happened.** Vo, the pet that walks on the page, grows one step each time a child finishes a round, in any game:

```js
kidvo.emit('done', {})                 // once, when a round is over: this grows Vo
kidvo.emit('judged', { right: true })  // a call the child made
kidvo.emit('caught', {})               // a wrong AI answer caught (the panel's "Not right?" already sends it)
```

**Save progress if you need to** with `kidvo.store.get` and `kidvo.store.set` (up to 32 KB, only in this browser).

**Phones.** Every game must fit a 360 px wide screen without sideways scrolling, use buttons at least 44 px tall on touch screens (`@media (pointer: coarse)`) and stay playable in a short landscape screen (`@media (max-height: 480px)`). Robot Maze (`apps/maze`) shows one way: its practice AI slides up as a drawer on phones.

## 5. Write the parents' guide

`parents/en.html` is one printable A4 page for parents and teachers: what the child does, what it teaches, and two or three questions to talk about afterwards. Keep the template's first `<meta>` line and its footer.

## 6. Test

```bash
npm test
```

It runs the same checks as CI: the manifest, the content-policy line, texts in every language, file sizes, and a real-browser test in Chromium and WebKit (Safari's engine) that opens your game, fails on any JavaScript error and checks it fits a phone.

Then play it yourself, twice. Would a child?

## 7. Open the pull request

- Change only `apps/my-game/`. Anything outside it needs the maintainer.
- One open pull request per GitHub account.
- Hungarian and Romanian are welcome but not required: a game without them falls back to English.

The maintainer checks the four merge rules: do no harm, teaches a named skill, the child stays in charge, and it's fun. You get an answer, one requested change, or a written reason. Merged games go live on [kidvo.eu](https://kidvo.eu) by themselves.

Stuck? Ask in [Discussions](https://github.com/AlparKacso/kidvo/discussions) or write to hello@kidvo.eu. Show your game early in Discussions (Show and tell): it is easier to change course at the start.
