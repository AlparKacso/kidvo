// How Vo grows. Every thinking moment a game reports on the bus is a brick; the first brick from a game
// that teaches a skill grows the matching head part; bricks unlock the rides in the garage.
// Pure logic, no drawing and no storage, so tests/rules.mjs can hold it to its rules.
(function (root) {
  'use strict';
  // Events that count, by the part after the colon. Everything else (ai-asked, shared, checked, solved,
  // shell events) earns nothing.
  const COUNTS = {
    caught: () => true,                              // a wrong answer caught
    kept: () => true,                                // a secret kept
    judged: d => !!d && d.right === true,            // a right call
    'ai-flagged': d => !!d && d.wasWrong === true,   // the practice-AI panel's "Not right?" on a wrong answer: a catch
    done: () => true,                                // a round is over
    finished: () => true                             // Robot Maze's run of 8 levels is over: its "done"
  };
  const ROUND_END = new Set(['done', 'finished']);
  const PER_ROUND = 3;  // bricks per app per round at most
  const GAP = 8000;     // ms: no brick within 8 seconds of the last one from the same app

  // Skill -> head part. One part per skill, fixed for good.
  // TODO: draw a part for each of the other four skills, add it here and to compose() in sprites.js:
  //   ai-learns-from-examples  a tag or scarf
  //   ask-better-questions     ears
  //   spot-ai-made             a magnifier monocle
  //   your-idea-matters        a lightbulb on the antenna
  // Until then their bricks are recorded (state.skills), so the part appears as soon as it is drawn.
  const PARTS = { 'ai-can-be-wrong': 'eyes', 'when-to-ask': 'antenna', 'keep-secrets': 'cap' };
  const PART_ORDER = ['eyes', 'antenna', 'cap'];

  // The garage, unlocked by total bricks. Adding a ride later is one sprite in sprites.js and one line here.
  const RIDES = [
    { id: 'skateboard', bricks: 5 }, { id: 'pogo', bricks: 10 }, { id: 'monocycle', bricks: 15 }, { id: 'hoverboard', bricks: 20 },
    { id: 'cloud', bricks: 25 }, { id: 'car', bricks: 30 }, { id: 'helicopter', bricks: 35 }, { id: 'plane', bricks: 40 }
  ];

  // Per-app rounds live in memory only: a reload starts a fresh round, which a child cannot farm.
  // Returns offer(topic, data, now): the app id when the event earns a brick, otherwise null.
  function counter() {
    const apps = new Map();
    return function offer(topic, data, now) {
      const [app, kind] = String(topic).split(':');
      if (!app || !kind || app === 'shell' || app === 'pet' || !COUNTS[kind] || !COUNTS[kind](data)) return null;
      let a = apps.get(app);
      if (!a) apps.set(app, a = { n: 0, last: -Infinity });
      const ok = a.n < PER_ROUND && now - a.last >= GAP;
      if (ok) { a.n++; a.last = now; }
      if (ROUND_END.has(kind)) a.n = 0;
      return ok ? app : null;
    };
  }

  const fresh = () => ({ bricks: 0, skills: {}, parts: [], rides: [], ride: null });

  // Read whatever was stored, keeping only what makes sense.
  function clean(s) {
    const out = fresh();
    if (!s || typeof s !== 'object') return out;
    out.bricks = Number.isInteger(s.bricks) && s.bricks > 0 ? s.bricks : 0;
    if (s.skills && typeof s.skills === 'object') for (const [k, v] of Object.entries(s.skills)) if (Number.isInteger(v) && v > 0) out.skills[k] = v;
    out.parts = PART_ORDER.filter(p => Array.isArray(s.parts) && s.parts.includes(p));
    out.rides = RIDES.map(r => r.id).filter(id => Array.isArray(s.rides) && s.rides.includes(id));
    out.ride = out.rides.includes(s.ride) ? s.ride : null;
    return out;
  }

  // Two copies of Vo (two tabs) merge upward: growth only, never shrink. The ride is a choice, not growth:
  // b's choice wins, so pass the copy whose choice counts (the one in memory when saving) as b.
  function merge(a, b) {
    a = clean(a); b = clean(b);
    const skills = { ...a.skills };
    for (const [k, v] of Object.entries(b.skills)) skills[k] = Math.max(skills[k] || 0, v);
    return clean({
      bricks: Math.max(a.bricks, b.bricks), skills,
      parts: [...a.parts, ...b.parts], rides: [...a.rides, ...b.rides], ride: b.ride
    });
  }

  // One brick from an app that teaches `skills`. Returns the new state, the part that grew (at most one per
  // brick, so two parts never arrive at once) and the rides this brick unlocked.
  function grow(state, skills) {
    const s = clean(state);
    s.bricks++;
    for (const k of skills || []) s.skills[k] = (s.skills[k] || 0) + 1;
    const due = PART_ORDER.filter(p => !s.parts.includes(p) && Object.keys(s.skills).some(k => PARTS[k] === p));
    const part = due[0] || null;
    if (part) s.parts = PART_ORDER.filter(p => p === part || s.parts.includes(p));
    const rides = RIDES.filter(r => r.bricks <= s.bricks && !s.rides.includes(r.id)).map(r => r.id);
    s.rides = RIDES.map(r => r.id).filter(id => s.rides.includes(id) || rides.includes(id));
    return { state: s, part, rides };
  }

  root.VoBricks = { COUNTS, PER_ROUND, GAP, PARTS, PART_ORDER, RIDES, counter, fresh, clean, merge, grow };
})(globalThis);
