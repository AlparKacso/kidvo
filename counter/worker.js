// kidvo's play counter: a Cloudflare Worker that keeps daily totals per game, and nothing per visitor.
//
// The site sends one request when a game stops being played (closed, or the tab hidden):
//   POST /play?g=<game id>&s=<seconds on screen>&r=<rounds finished>&n=<1: a new open, 0: coming back to it>
// The worker adds it to that day's row for the game. It never stores the IP address, the browser, the time of day
// or anything else about who sent it, so the table cannot tell one child from another. See README.md.

const BANDS = [[60, 'm0'], [300, 'm1'], [900, 'm5'], [Infinity, 'm15']]; // seconds: under 1 minute, 1-5, 5-15, 15+
const MAX_SECONDS = 4 * 3600;
const MAX_ROUNDS = 100;

// The games on the live site, from its own registry, so a new game is counted without changing the worker,
// and made-up names are refused. Kept for an hour.
let known = { at: 0, ids: new Set() };
async function isGame(site, id) {
  if (Date.now() - known.at > 3600 * 1000) {
    try {
      const res = await fetch(`${site}/apps/registry.json`, { cf: { cacheTtl: 3600 } });
      if (res.ok) known = { at: Date.now(), ids: new Set((await res.json()).filter(a => a.type === 'window').map(a => a.id)) };
    } catch { /* keep the last list */ }
  }
  return known.ids.has(id);
}

const reply = status => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
const whole = (v, max) => {
  const n = Math.round(Number(v ?? 0));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : null;
};

export default {
  async fetch(req, env) {
    const site = env.SITE || 'https://kidvo.eu';
    const url = new URL(req.url);
    if (url.pathname !== '/play') return new Response('kidvo play counter. See https://github.com/AlparKacso/kidvo/tree/main/counter', { status: 404 });
    if (req.method !== 'POST') return reply(405);
    // Browsers send the page's origin with every POST: only kidvo.eu itself is counted.
    if (req.headers.get('Origin') !== site) return reply(403);
    const q = url.searchParams;
    const game = q.get('g') || '';
    const seconds = whole(q.get('s'), MAX_SECONDS);
    const rounds = whole(q.get('r'), MAX_ROUNDS);
    const fresh = q.get('n') === '1' ? 1 : 0;
    if (!/^[a-z0-9-]{1,32}$/.test(game) || seconds === null || rounds === null || !(await isGame(site, game))) return reply(400);
    const band = BANDS.find(([max]) => seconds < max)[1];
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      `INSERT INTO plays (day, game, opens, reports, seconds, rounds, ${band}) VALUES (?1, ?2, ?3, 1, ?4, ?5, 1)
       ON CONFLICT (day, game) DO UPDATE SET opens = opens + ?3, reports = reports + 1, seconds = seconds + ?4,
         rounds = rounds + ?5, ${band} = ${band} + 1`
    ).bind(day, game, fresh, seconds, rounds).run();
    return reply(204);
  }
};
