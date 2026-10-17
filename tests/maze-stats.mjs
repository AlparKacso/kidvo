// Robot Maze statistics: how hard the mazes are and how ORACLE's wrong hints look.
//   node tests/maze-stats.mjs            2,000 mazes per level
//   MAZES=500 SEED=7 node tests/maze-stats.mjs
// The maze generator and the hint logic below are a copy of the block in apps/maze/index.html
// between "copy for tests/maze-stats.mjs starts" and "ends". The script stops when the two differ.
// Exits with 1 when a target is missed:
//   - Investigators: median par at every level at least 1.5 x (2N - 2), the straight-line minimum
//   - Investigators: no wrong hint points into a wall, none points back where the robot came from
//   - the first answer on level 1 can always be made wrong
import { readFileSync } from 'node:fs';

const MAZES = Number(process.env.MAZES || 2000);
let seed = Number(process.env.SEED || 2026) >>> 0;
// mulberry32: a small seeded random generator, so a run can be repeated exactly.
const random = () => {
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = n => Math.floor(random() * n);

/* ---------------- copied from apps/maze/index.html ---------------- */
// A run is 8 levels. Later Investigator levels get harder through ORACLE (more wrong answers,
// fewer sparks), not through bigger mazes.
const LEVELS = 8;
const BANDS = {
  // Explorers (7-9) get wrong answers that point straight into a wall: easy to check by looking.
  explorers: { ages: '7–9', size: l => Math.min(4 + l, 9), loops: 0.12, wrongChance: () => 0.35, sparks: () => 3, wrongKind: 'wall' },
  // Investigators (10-13) get mazes with real choices and believable wrong answers that lead into dead ends.
  investigators: { ages: '10–13', size: l => Math.min(5 + 2 * l, 15), shortcuts: l => 2 + l, shortcutGap: 8,
    wrongChance: l => [0.4, 0.4, 0.4, 0.45, 0.45, 0.5, 0.5, 0.55][l - 1], sparks: l => (l >= 7 ? 2 : 3), wrongKind: 'deadend' }
};
const DIRS = { up: [0, -1, 1], right: [1, 0, 2], down: [0, 1, 4], left: [-1, 0, 8] };
const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
let N, cells, dist;

function generate(n, B, l) {
  if (!B.shortcuts) return carve(n, B.loops);
  // Investigators: a perfect maze (one route) whose route is at least 1.5 times the straight-line
  // minimum, then a few shortcuts that keep it so.
  const minPar = Math.ceil(1.5 * (2 * n - 2)), start = n * (n - 1), goal = n - 1;
  let g = carve(n, 0);
  for (let i = 0; i < 40 && walkLength(g, n, start, goal, n * n) < minPar; i++) g = carve(n, 0);
  addShortcuts(g, n, B.shortcuts(l), B.shortcutGap, minPar);
  return g;
}

function carve(n, loops) {
  const g = new Uint8Array(n * n), seen = new Uint8Array(n * n), stack = [0];
  seen[0] = 1;
  while (stack.length) {
    const c = stack[stack.length - 1], x = c % n, y = (c / n) | 0;
    const opts = Object.values(DIRS).filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy, bit] = opts[rand(opts.length)];
    const nc = (y + dy) * n + (x + dx);
    g[c] |= bit; g[nc] |= OPP[bit]; seen[nc] = 1; stack.push(nc);
  }
  // Explorers: knock out some extra walls so there is more than one route.
  if (loops) {
    for (let c = 0; c < n * n; c++) {
      if (random() > loops) continue;
      const x = c % n, y = (c / n) | 0;
      const closed = Object.values(DIRS).filter(([dx, dy, bit]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < n && ny < n && !(g[c] & bit); });
      if (!closed.length) continue;
      const [dx, dy, bit] = closed[rand(closed.length)];
      g[c] |= bit; g[(y + dy) * n + (x + dx)] |= OPP[bit];
    }
  }
  return g;
}

// A shortcut only opens between neighbours that are far apart through the maze, so it makes two
// routes of clearly different lengths: counting steps matters, and ORACLE's "shortest" can be checked.
function addShortcuts(g, n, max, gap, minPar) {
  const walls = [];
  for (let c = 0; c < n * n; c++) {
    if (c % n < n - 1 && !(g[c] & 2)) walls.push([c, c + 1, 2]);
    if (c < n * (n - 1) && !(g[c] & 4)) walls.push([c, c + n, 4]);
  }
  for (let i = walls.length - 1; i > 0; i--) { const j = rand(i + 1); [walls[i], walls[j]] = [walls[j], walls[i]]; }
  let opened = 0;
  for (const [a, b, bit] of walls) {
    if (opened >= max) break;
    if (walkLength(g, n, a, b, gap) < gap) continue;
    g[a] |= bit; g[b] |= OPP[bit];
    if (walkLength(g, n, n * (n - 1), n - 1, n * n) < minPar) { g[a] &= ~bit; g[b] &= ~OPP[bit]; continue; }
    opened++;
  }
}

// Steps from one cell to another through the maze, or limit when it takes limit or more.
function walkLength(g, n, from, to, limit) {
  const d = new Int16Array(n * n).fill(-1), q = [from];
  d[from] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (d[c] >= limit) break;
    for (const [dx, dy, bit] of Object.values(DIRS)) {
      if (!(g[c] & bit)) continue;
      const nc = c + dy * n + dx;
      if (d[nc] >= 0) continue;
      if (nc === to) return d[c] + 1;
      d[nc] = d[c] + 1; q.push(nc);
    }
  }
  return limit;
}

function distances(goal) {
  const d = new Int16Array(N * N).fill(-1), q = [goal];
  d[goal] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], x = c % N, y = (c / N) | 0;
    for (const [dx, dy, bit] of Object.values(DIRS)) {
      if (!(cells[c] & bit)) continue;
      const nc = (y + dy) * N + (x + dx);
      if (d[nc] < 0) { d[nc] = d[c] + 1; q.push(nc); }
    }
  }
  return d;
}

const idx = p => p.y * N + p.x;
const open = (p, d) => !!(cells[idx(p)] & DIRS[d][2]);
const step = (p, d) => ({ x: p.x + DIRS[d][0], y: p.y + DIRS[d][1] });
const exits = p => Object.keys(DIRS).filter(d => open(p, d));
const closer = (p, d) => open(p, d) && dist[idx(step(p, d))] === dist[idx(p)] - 1;
const bestDir = p => Object.keys(DIRS).find(d => closer(p, d));
// The direction back to the cell the robot came from.
const backOf = (p, from) => from && Object.keys(DIRS).find(d => open(p, d) && idx(step(p, d)) === idx(from));

function runLength(p, d, along) {
  // How many steps in direction d, either along the shortest path or down a corridor.
  let n = 0, cur = p;
  while (open(cur, d) && n < N) {
    const nx = step(cur, d);
    if (along && dist[idx(nx)] !== dist[idx(cur)] - 1) break;
    n++; cur = nx;
    if (!along && exits(cur).length > 2) break;
  }
  return Math.max(1, n);
}
// How many cells the corridor behind direction d leads further from the star, following its bends.
function awayLength(p, d) {
  let n = 0, prev = p, cur = step(p, d);
  while (dist[idx(cur)] > dist[idx(prev)]) {
    n++;
    const next = exits(cur).map(k => step(cur, k)).filter(q => idx(q) !== idx(prev));
    if (next.length !== 1) break;
    prev = cur; cur = next[0];
  }
  return n;
}
// Wrong step counts for the right direction: n plus or minus 1 or 2, never 0, never past the wall,
// and never a shorter count that happens to start another shortest route.
function wrongCounts(p, d, n) {
  let room = 0, cur = p;
  while (open(cur, d)) { cur = step(cur, d); room++; }
  const out = [];
  for (const k of [n - 2, n - 1, n + 1, n + 2]) {
    if (k < 1 || k > room) continue;
    if (k < n) {
      let q = p;
      for (let i = 0; i < k; i++) q = step(q, d);
      if (Object.keys(DIRS).some(o => o !== d && closer(q, o))) continue;
    }
    out.push(k);
  }
  return out;
}
// ORACLE's answer to "which way?" from cell p. back is the direction the robot came from.
// A wanted wrong answer comes back with wrong: false when nothing believable fits this cell.
function wayHint(p, back, wrong, kind) {
  const right = bestDir(p), n = runLength(p, right, true);
  if (!wrong) return { dir: right, n, wrong: false, kind: 'right' };
  if (kind === 'wall') {
    const walls = Object.keys(DIRS).filter(d => !open(p, d));
    const away = exits(p).filter(d => !closer(p, d));
    if (walls.length) return { dir: walls[rand(walls.length)], n: 1 + rand(2), wrong: true, kind: 'wall' };
    if (away.length) { const d = away[rand(away.length)]; return { dir: d, n: runLength(p, d, false), wrong: true, kind: 'away' }; }
    return { dir: right, n, wrong: false, kind: 'none' };
  }
  // Investigators: never a wall, never the way back. Best is a corridor that leads away from the star.
  const away = exits(p).filter(d => d !== back && !closer(p, d));
  const far = away.filter(d => awayLength(p, d) >= 2);
  const pool = far.length ? far : away;
  if (pool.length) { const d = pool[rand(pool.length)]; return { dir: d, n: runLength(p, d, false), wrong: true, kind: far.length ? 'away' : 'near' }; }
  // Only one way on (often at the start): the right direction with the wrong number of steps.
  const counts = wrongCounts(p, right, n);
  if (counts.length) return { dir: right, n: counts[rand(counts.length)], wrong: true, kind: 'count' };
  return { dir: right, n, wrong: false, kind: 'none' };
}

// A new maze for level l. Goal: top-right cell. Start: bottom-left cell.
function newMaze(B, l) {
  N = B.size(l);
  const start = { x: 0, y: N - 1 };
  // Investigators: ORACLE must be able to give a believable wrong answer at the start.
  for (let i = 0; i < 20; i++) {
    cells = generate(N, B, l);
    dist = distances(N - 1);
    if (B.wrongKind !== 'deadend' || wayHint(start, null, true, B.wrongKind).wrong) break;
  }
  return start;
}
/* ---------------- end of the copy ---------------- */


// The old Investigators maze (loops 0.22, sizes growing to 15) and a perfect maze without
// shortcuts, both at the same size, for the before/after table.
const OLD = { size: l => Math.min(7 + (l - 1) * 2, 15), loops: 0.22 };

// The copy must match the game, or the numbers below describe some other maze.
{
  const between = (text, a, b) => text.slice(text.indexOf(a) + a.length, text.indexOf(b));
  const game = between(readFileSync(new URL('../apps/maze/index.html', import.meta.url), 'utf8'),
    '/* ---------------- copy for tests/maze-stats.mjs starts ---------------- */\n', '  /* ---------------- copy for tests/maze-stats.mjs ends').replace(/^  /gm, '');
  const mine = between(readFileSync(new URL(import.meta.url), 'utf8'),
    '/* ---------------- copied from apps/maze/index.html ---------------- */\n', '/* ---------------- end of the copy');
  if (game !== mine) {
    console.error('tests/maze-stats.mjs: the copied block differs from apps/maze/index.html. Copy it again.');
    process.exit(1);
  }
}

const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
const failures = [];

function playLevel(B, l, hints) {
  const start = newMaze(B, l), par = dist[idx(start)];
  const tally = (h, p, back) => {
    hints.total++;
    hints.kinds[h.kind] = (hints.kinds[h.kind] || 0) + 1;
    if (h.wrong && !open(p, h.dir)) hints.wall++;
    if (h.wrong && h.dir === back && h.kind !== 'count') hints.back++;
  };
  // 1. The first question asked at the start (level 1: always meant to be wrong).
  const first = wayHint(start, null, true, B.wrongKind);
  hints.first++;
  if (first.kind === 'none') hints.firstNone++;
  if (first.wrong && !open(start, first.dir)) hints.firstWall++;
  // 2. Every cell along the shortest route, asked as a wrong answer, coming from the previous cell.
  let from = null, cur = start;
  while (dist[idx(cur)] > 0) {
    tally(wayHint(cur, backOf(cur, from), true, B.wrongKind), cur, backOf(cur, from));
    from = cur; cur = step(cur, bestDir(cur));
  }
  // 3. A wandering robot (it never turns straight back unless it has to): 3N steps, asked at each.
  from = null; cur = start;
  for (let i = 0; i < 3 * N && dist[idx(cur)] > 0; i++) {
    const back = backOf(cur, from);
    tally(wayHint(cur, back, true, B.wrongKind), cur, back);
    const ways = exits(cur).filter(d => d !== back);
    const d = ways.length ? ways[rand(ways.length)] : back;
    from = cur; cur = step(cur, d);
  }
  return par;
}

for (const name of Object.keys(BANDS)) {
  const B = BANDS[name];
  console.log(`\n${name} (${MAZES} mazes per level)`);
  console.log('level  size  2N-2  median par  x(2N-2)  before  perfect | wrong hints: away 2+  away 1  count  none  | into a wall  way back');
  const all = { total: 0, wall: 0, back: 0, first: 0, firstNone: 0, firstWall: 0, none: 0 };
  for (let l = 1; l <= LEVELS; l++) {
    const hints = { total: 0, wall: 0, back: 0, first: 0, firstNone: 0, firstWall: 0, kinds: {} };
    const pars = [], before = [], perfect = [];
    for (let i = 0; i < MAZES; i++) pars.push(playLevel(B, l, hints));
    if (name === 'investigators') {
      for (let i = 0; i < MAZES; i++) {
        N = OLD.size(l); cells = carve(N, OLD.loops); dist = distances(N - 1);
        before.push(dist[idx({ x: 0, y: N - 1 })]);
        cells = carve(N, 0); dist = distances(N - 1);
        perfect.push(dist[idx({ x: 0, y: N - 1 })]);
      }
    }
    hints.none = hints.kinds.none || 0;
    for (const k of Object.keys(all)) all[k] += hints[k];
    const straight = 2 * B.size(l) - 2, med = median(pars), ratio = med / straight;
    const kinds = name === 'investigators'
      ? `${pct(hints.kinds.away || 0, hints.total).padStart(7)} ${pct(hints.kinds.near || 0, hints.total).padStart(7)} ${pct(hints.kinds.count || 0, hints.total).padStart(6)} ${pct(hints.none, hints.total).padStart(5)}`
      : `wall ${pct(hints.wall, hints.total)}, none ${pct(hints.none, hints.total)}`.padEnd(32);
    console.log(`${String(l).padStart(5)}  ${String(B.size(l)).padStart(4)}  ${String(straight).padStart(4)}  ${String(med).padStart(10)}  ${ratio.toFixed(2).padStart(7)}  ${String(before.length ? median(before) : '-').padStart(6)}  ${String(perfect.length ? median(perfect) : '-').padStart(7)} |      ${kinds}  | ${name === 'investigators' ? pct(hints.wall, hints.total).padStart(11) : '          -'}  ${pct(hints.back, hints.total).padStart(8)}`);
    if (name === 'investigators' && ratio < 1.5) failures.push(`${name} level ${l}: median par ${med} is ${ratio.toFixed(2)} x (2N - 2), below 1.5`);
  }
  console.log(`first answer at the start: ${pct(all.firstWall, all.first)} into a wall, ${pct(all.firstNone, all.first)} could not be made wrong`);
  if (name === 'investigators') {
    console.log(`all wrong hints: ${pct(all.wall, all.total)} into a wall, ${pct(all.back, all.total)} the way back, ${pct(all.none, all.total)} could not be made wrong at that cell (the game answers right there and gives the wrong answer at the next question)`);
    if (all.wall) failures.push(`${name}: ${all.wall} wrong hints point into a wall`);
    if (all.back) failures.push(`${name}: ${all.back} wrong hints point back the way the robot came`);
    if (all.firstWall) failures.push(`${name}: ${all.firstWall} first answers point into a wall`);
  }
  if (all.firstNone) failures.push(`${name}: ${all.firstNone} first answers at the start could not be made wrong`);
}

if (failures.length) {
  console.error('\nMaze stats missed a target:\n' + failures.map(f => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('\nAll maze targets met.');
