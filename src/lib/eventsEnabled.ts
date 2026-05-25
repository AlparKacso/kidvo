// Hard kill-switch for the Events feature. Set
//   NEXT_PUBLIC_EVENTS_ENABLED=false
// on a deployment (e.g. prod) to hide every public surface — `/events`
// route, nav items, and the `/browse` "Coming up" band — and to
// short-circuit the daily scraper cron. Anything missing/empty/true
// keeps events enabled (default), so existing staging continues to
// work without changes.
//
// Admin surfaces (`/admin` queue, assisted-add form, inline edit,
// merge-into-series) stay accessible regardless — the kill-switch is
// for the public side. That lets the admin prepare events while the
// feature is dark, then flip the env var to launch.
//
// The NEXT_PUBLIC_ prefix exposes the var to client bundles so nav
// components can check it at render time without a fetch.
export function eventsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EVENTS_ENABLED !== 'false'
}
