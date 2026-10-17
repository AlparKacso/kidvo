// How Vo grows. Every round a child finishes in any game is one step, even the same game again and again:
// step 1 grows his big eyes and bigger antenna, every step after that brings the next ride in the garage.
// Pure logic, no drawing and no storage, so tests/rules.mjs can hold it to its rules.
(function (root) {
  'use strict';
  // A finished round, by the part after the colon: every game's `done`, and each Robot Maze level (`solved`).
  // Robot Maze also sends `finished` with its eighth `solved`; counting both would be two steps for one round.
  const ROUND_END = new Set(['done', 'solved']);
  const GAP = 1500; // ms: one round end per app at a time, so an event sent twice is one step

  // The rides in the order they arrive. Adding a ride later is one sprite in sprites.js and one id here.
  const RIDES = ['skateboard', 'pogo', 'monocycle', 'hoverboard', 'cloud', 'car', 'helicopter', 'plane'];
  const LAST = RIDES.length + 1; // step 0 is Vo as hatched, step 1 the head, then one ride per step

  // Returns offer(topic, now): the app id when the event finishes a round, otherwise null.
  function counter() {
    const last = new Map();
    return function offer(topic, now) {
      const [app, kind] = String(topic).split(':');
      if (!app || !kind || app === 'shell' || app === 'pet' || !ROUND_END.has(kind)) return null;
      if (now - (last.get(app) ?? -Infinity) < GAP) return null;
      last.set(app, now);
      return app;
    };
  }

  // `born`: when this Vo was hatched (ms). "Hatch a new Vo" makes a newer one, and a newer Vo wins every merge,
  // so an older copy (another tab, or a save still on its way) cannot bring the old one back.
  const fresh = (born = 0) => ({ step: 0, ride: null, born });
  const ridesAt = step => RIDES.slice(0, Math.max(0, step - 1));
  // What Vo looks like at a step, wearing the ride the child picked (or on foot).
  const look = s => ({ eyes: s.step >= 1, antenna: s.step >= 1, ride: s.ride });

  // Read whatever was stored, keeping only what makes sense. A Vo saved before steps (bricks, parts, rides)
  // keeps everything he had grown: his head and every ride he had unlocked.
  function clean(s) {
    const out = fresh();
    if (!s || typeof s !== 'object') return out;
    if (Number.isFinite(s.born) && s.born > 0) out.born = s.born;
    if (Number.isInteger(s.step)) out.step = Math.max(0, Math.min(LAST, s.step));
    else if (Array.isArray(s.parts) || Array.isArray(s.rides)) {
      const had = RIDES.filter(id => Array.isArray(s.rides) && s.rides.includes(id)).length;
      out.step = Math.min(LAST, (had || (Array.isArray(s.parts) && s.parts.length) ? 1 : 0) + had);
    }
    out.ride = ridesAt(out.step).includes(s.ride) ? s.ride : null;
    return out;
  }

  // Two copies of the same Vo (two tabs) merge upward: growth only, never shrink. The ride is a choice, not
  // growth: b's choice wins, so pass the copy whose choice counts (the one in memory when saving) as b.
  // Copies of different Vos: the newer one wins whole.
  function merge(a, b) {
    a = clean(a); b = clean(b);
    if (a.born !== b.born) return a.born > b.born ? a : b;
    return clean({ step: Math.max(a.step, b.step), ride: b.ride, born: b.born });
  }

  // One finished round. Returns the new state and what it brought: 'head', a ride id, or null once the garage
  // is full. A new ride is put on straight away, so the child sees the step; the garage lets them change it.
  function grow(state) {
    const s = clean(state);
    if (s.step >= LAST) return { state: s, got: null };
    s.step++;
    const got = s.step === 1 ? 'head' : RIDES[s.step - 2];
    if (got !== 'head') s.ride = got;
    return { state: s, got };
  }

  root.VoBricks = { ROUND_END, GAP, RIDES, LAST, counter, fresh, ridesAt, look, clean, merge, grow };
})(globalThis);
