# kidvo's play counter

kidvo.eu has no cookies, accounts or tracking. To see which games are used, the site counts game plays without names or IDs, and this small Cloudflare Worker keeps the totals.

## What is counted

When a game stops being played (the child goes back to the games, closes it, or the browser tab is hidden), the site sends one request:

```
POST https://kidvo-count.kidvo-counter.workers.dev/play?g=maze&s=412&r=3&n=1
```

- `g`: the game, one of the games on kidvo.eu (checked against the live `apps/registry.json`)
- `s`: seconds the game was on screen (not counted while it waits behind its card or the tab is hidden)
- `r`: rounds finished (the same `done` and `solved` events that make Vo grow)
- `n`: 1 for the first stretch after the game was opened, 0 when the child came back to it (Continue, or back to the tab)

The worker adds this to one row per game per day (`schema.sql`), in a D1 database kept in the EU (jurisdiction `eu`). It stores no IP address, browser, time of day or ID, and request logs are off, so the table cannot tell one child from another. Cloudflare sees each request's IP address on the way in, as any server does.

The site sends nothing when the page is not kidvo.eu itself, and nothing to browsers that ask not to be tracked (Global Privacy Control or Do Not Track). Only the shell sends counts; games still cannot reach the network.

## Reading the numbers

```bash
cd counter && npm run counts          # last 7 days, per game
cd counter && npm run counts:weeks    # the last 12 weeks, all games
```

Or open the `kidvo-count` database in the Cloudflare dashboard (Storage and Databases → D1 → Console) and run any `SELECT`.

## Setting it up (once)

```bash
cd counter && npm install
npx wrangler login                       # opens the browser: sign in to Cloudflare and allow
npx wrangler d1 create kidvo-count --jurisdiction eu   # data stays in the EU; copy the database_id into wrangler.toml
npm run schema
npm run deploy                           # prints the workers.dev address
```

Then put the address in `count.url` in `shell/config.js` and in `connect-src` in `index.html`.

## Trying it locally

`npm run dev` starts the worker on localhost:8787 with a local database, accepting counts from the dev server at localhost:8080.

Free plan limits (November 2026): 100,000 requests and about 100,000 database writes a day. Above that, counts are lost for the day; the site keeps working, because the count is sent and forgotten.
