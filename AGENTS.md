# AGENTS.md: for AI coding agents

You may build a game for kidvo. Read `CONTRIBUTING.md` first: it is the charter, and it decides what gets merged.

## In short

- kidvo only merges small games that help children aged 7 to 13 use AI wisely while thinking for themselves.
- Games never call a real AI or the network. They use the practice-AI panel in `shell/ask-ai.js`, with answers written in the game, some deliberately wrong.
- Start from `templates/app/`. Study `apps/maze/` (Robot Maze), the reference game.
- Every text goes into `lang/en.js`. Add `lang/hu.js` and `lang/ro.js` only if you can write them well; a native-speaker steward reviews every language.
- Ship `parents/en.html`: one printable A4 page for parents and teachers.
- Make it work on phones: no sideways scrolling at 360 px, buttons at least 44 px tall on touch screens, playable in short landscape screens. `npm test` checks the first part.
- Touch nothing outside `apps/<your-id>/`. Run `npm test` until it passes.
- Open **one** pull request per GitHub account, titled `game: <id>: <what the child practises>`. Wait for review before sending another.

## Writing for children

- Explorers (7–9): sentences under 10 words, one idea each, no irony.
- Investigators (10–13): short paragraphs are fine; explain trade-offs.
- Never make the practice AI cute, flattering or friend-like. It is a tool.
- No scary content, no personal data prompts (except in a `keep-secrets` game, where saying no is the right answer), no brands or copyrighted characters.

## Sandbox facts

Your game runs in `<iframe sandbox="allow-scripts">` with an opaque origin: no `localStorage` (use `kidvo.store`), no cookies, no popups, no forms that submit, no network beyond this repository's files. Canvas, SVG, CSS animation, Web Audio after a tap, and pointer or keyboard input all work.
