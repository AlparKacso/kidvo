// Vo's pixels: the head, the big eyes and antenna of his first step, and the rides in the garage.
// Every sprite is a list of row strings, 36 columns wide: K ink, Y yellow, R coral, W white, "." empty.
// Vo's head sits at columns 12-23 and stays head-only on purpose. Drawn in the stage viewer
// (design doc "Desktop: Vo grows"), copied here row by row.
(function (root) {
  'use strict';
  const COLORS = { K: '#191833', Y: '#ffd23f', R: '#ff6b5b', W: '#ffffff' };
  const GW = 36, HL = 12; // grid width; the head's left column
  const line = (left, s) => '.'.repeat(left) + s + '.'.repeat(GW - left - s.length);

  // The rides, in garage order. `alt` = frame B for the rows that move; `overlay` = [rowFromHeadBottom, col, text]
  // drawn beside the head (windscreens, a tail fin); `top` = rows above the whole head (a rotor), `topAlt` their
  // frame B, `mast` = a column drawn from the top rows down to the head. `fly` rides hover `lift` px above the
  // surface and land to sleep; `bounce` moves by bouncing; `spin` animates even when Vo stands still.
  const VEHICLES = {
    skateboard: { speed: 0.07, rows: [
      '.............KK......KK.............', '..........KKKKKKKKKKKKKKKK..........', '.........KYYYYYYYYYYYYYYYYK.........', '..........KKKKKKKKKKKKKKKK..........',
      '...........KK..........KK...........', '..........KKKK........KKKK..........', '..........KWWK........KWWK..........', '..........KKKK........KKKK..........'],
      // Pushing: the back foot swings out; the wheels turn.
      alt: { 0: '.............KK.........KK..........', 6: '..........KWKK........KWKK..........' }, overlay: [] },
    pogo: { speed: 0.06, bounce: true, rows: [
      '.............KK......KK.............', '...........KKKKKKKKKKKKKK...........', '.................KK.................', '.................KK.................', '.................KK.................',
      '................KYYK................', '.................KK.................', '................KKKK................'],
      alt: {}, overlay: [] },
    monocycle: { speed: 0.07, rows: [
      '...............KKKKKK...............', '.................KK.................', '.................KK.................',
      '................KKKK................', '..............KKKKKKKK..............', '.............KKK.KK.KKK.............', '............KKK..KK..KKK............',
      '............KKKKKWWKKKKK............', '............KKKKKWWKKKKK............', '............KKK..KK..KKK............', '.............KKK.KK.KKK.............',
      '..............KKKKKKKK..............', '................KKKK................'],
      // The spokes turn: upright, then diagonal.
      alt: { 5: '.............KKK....KKK.............', 6: '............KKKK....KKKK............', 7: '............KK..KWWK..KK............', 8: '............KK..KWWK..KK............', 9: '............KKKK....KKKK............', 10: '.............KKK....KKK.............' }, overlay: [] },
    hoverboard: { speed: 0.08, fly: true, lift: 10, spin: true, rows: [
      '.............KK......KK.............', '..........KKKKKKKKKKKKKKKK..........', '.........KYYYYYYYYYYYYYYYYK.........', '..........KKKKKKKKKKKKKKKK..........',
      '...........RR..........RR...........', '............R............R..........'],
      // The thrusters flicker.
      alt: { 4: '............RR........RR............', 5: '...........R............R...........' }, overlay: [] },
    cloud: { speed: 0.06, fly: true, lift: 14, rows: [
      '............KKKK....KKK.............', '..........KKWWWWKKKKWWWKK...........', '........KKWWWWWWWWWWWWWWWKK.........', '.......KWWWWWWWWWWWWWWWWWWWK........', '........KKKKKKKKKKKKKKKKKKKK........'],
      alt: {}, overlay: [] },
    car: { speed: 0.08, rows: [
      '........KKKKKKKKKKKKKKKKKKKKK.......', '.....KKKYYYYYYYYYYYYYYYYYKYYYKKK....', '....KYYYYYYYYYYYYYYYYYYYYKYYYYYYRK..', '....KYYYYYYYYYYYYYYYYYYYYKYYYYYYYK..', '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
      '......KKKKKK..............KKKKKK....', '.....KKKWWKKK............KKKWWKKK...', '.....KKKWWKKK............KKKWWKKK...', '......KKKKKK..............KKKKKK....'],
      alt: { 6: '.....KKWKKKKK............KKWKKKKK...', 7: '.....KKKKKWKK............KKKKKWKK...' }, overlay: [[-2, 26, 'KW'], [-1, 25, 'KW'], [0, 24, 'KW']] },
    helicopter: { speed: 0.06, fly: true, lift: 26, spin: true,
      top: ['........KKKKKKKKKKKKKKKKKKKKKKKKKKKK', '.....................KKK............'],
      topAlt: { 0: '...................KKKKKKK..........' }, mast: 22,
      rows: [
      '.K.....KKKKKKKKKKKKKKKKKKKKK........', '.K....KYYYYYYYYYYYYYYYYYYYYYK.......', '.KKKKKKYYYYYYYYYYYYYYYYYYYYRK.......', '.K....KKKKKKKKKKKKKKKKKKKKKKK.......',
      '.........K...............K..........', '.......KKKKKKKKKKKKKKKKKKKKK........'],
      alt: {}, overlay: [[-2, 26, 'KW'], [-1, 25, 'KW'], [0, 24, 'KW']] },
    plane: { speed: 0.07, fly: true, lift: 26, spin: true, rows: [
      '.KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....', '.KYYYYYYYYYYYYYYYYYYYYYYYYYYYYYKK..R', '..KYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYKKR', '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..R',
      '......KKKKKKKKKKKKKKKKKKKKK.........', '..........KK.........KK.............', '.........KKKK.......KKKK............'],
      // The propeller spins.
      alt: { 1: '.KYYYYYYYYYYYYYYYYYYYYYYYYYYYYYKK...', 3: '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...' }, overlay: [[-3, 2, 'KK'], [-2, 2, 'KYK'], [-1, 2, 'KYYK'], [0, 2, 'KYYYK']] }
  };

  // Build the sprite for a set of head parts ({ eyes, antenna }) and a ride (a VEHICLES key or nothing).
  // Returns the rows plus what the animations need: m.alt (frame B rows), m.shut (blink rows), m.mouth (smile and
  // chomp row), m.headTop, and the drawn box m.x0..m.x1 (columns), so the hotspot covers Vo and not the empty grid.
  function compose(p) {
    const rows = [], m = {};
    if (p.antenna) rows.push(line(18, 'KRRK'), line(18, 'KRRK'), line(19, 'KK'), line(19, 'K'));
    else rows.push(line(19, 'KR'), line(19, 'K'), line(19, 'K'));
    rows.push(line(14, 'KKKKKKKK'), line(13, 'KYYYYYYYYK'));
    m.headTop = rows.length;
    // Big eyes: two 5x5 round tiles that touch, like the Lego build, with a centred pupil.
    const H = p.eyes
      ? ['KYYYYYYYYYYK', 'KYKKKYYKKKYK', 'KKWWWKKWWWKK', 'KKWKWKKWKWKK', 'KKWWWKKWWWKK', 'KYKKKYYKKKYK', 'KYYYYYKYYYYK', 'KYYYYYYYYYYK']
      : ['KYYYYYYYYYYK', 'KYYYYYYYYYYK', 'KYYKYYYYKYYK', 'KYYKYYYYKYYK', 'KYYYYYKYYYYK', 'KYYYYYYYYYYK'];
    for (const h of H) rows.push(line(HL, h));
    const plain = line(HL, 'KYYYYYYYYYYK');
    m.shut = p.eyes
      ? { [m.headTop + 1]: plain, [m.headTop + 2]: plain, [m.headTop + 3]: line(HL, 'KYKKKKKKKKYK'), [m.headTop + 4]: plain, [m.headTop + 5]: plain }
      : { [m.headTop + 2]: plain };
    m.mouth = m.headTop + (p.eyes ? 6 : 4);
    m.smile = line(HL, 'KYYYYKKYYYYK');
    m.open = [line(HL, 'KYYYKKKKYYYK'), line(HL, 'KYYYKRRKYYYK')];
    let hb = rows.length;
    rows.push(line(13, 'KKKKKKKKKK'));
    const put = (r, c, s) => { if (rows[r]) rows[r] = rows[r].slice(0, c) + s + rows[r].slice(c + s.length); };
    const V = p.ride && VEHICLES[p.ride];
    m.alt = {}; m.speed = 0.05; m.fly = false; m.spin = false; m.lift = 0; m.bounce = false; m.ride = V ? p.ride : null;
    if (V) {
      if (V.top) { // rows above the head shift every index below them
        const n = V.top.length;
        rows.unshift(...V.top);
        m.headTop += n; m.mouth += n; hb += n;
        m.shut = Object.fromEntries(Object.entries(m.shut).map(([k, v]) => [Number(k) + n, v]));
        for (const [i, r] of Object.entries(V.topAlt || {})) m.alt[Number(i)] = r;
        if (V.mast) for (let r = n; r < m.headTop; r++) put(r, V.mast, 'K');
      }
      const base = rows.length;
      for (const r of V.rows) rows.push(r);
      for (const [i, r] of Object.entries(V.alt)) m.alt[base + Number(i)] = r;
      for (const [dr, c, s] of V.overlay) put(hb + dr, c, s);
      m.speed = V.speed; m.fly = !!V.fly; m.spin = !!V.spin; m.lift = V.lift || 0; m.bounce = !!V.bounce;
    } else {
      rows.push(line(13, 'KK......KK'));
      m.alt[rows.length - 1] = line(14, 'KK....KK');
    }
    let x0 = GW, x1 = -1;
    for (const r of [...rows, ...Object.values(m.alt)]) {
      const a = r.search(/[^.]/), b = r.length - 1 - [...r].reverse().join('').search(/[^.]/);
      if (a >= 0) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); }
    }
    m.x0 = x0; m.x1 = x1;
    return { rows, m };
  }

  // Draw a sprite (or its outline: only the pixels on the edge of the shape, for parts and rides not earned yet).
  function paint(ctx, sprite, left, top, S, opts = {}) {
    const { rows } = sprite;
    const face = opts.face || 1, ghost = opts.ghost;
    const at = (r, c) => (rows[r] && rows[r][c] && rows[r][c] !== '.');
    for (let r = 0; r < rows.length; r++) {
      const row = opts.row ? opts.row(r) : rows[r];
      for (let c = 0; c < GW; c++) {
        const ch = row[face === 1 ? c : GW - 1 - c];
        if (ch === '.') continue;
        if (ghost) {
          const cc = face === 1 ? c : GW - 1 - c;
          if (at(r - 1, cc) && at(r + 1, cc) && at(r, cc - 1) && at(r, cc + 1)) continue;
          ctx.fillStyle = ghost;
        } else ctx.fillStyle = COLORS[ch];
        ctx.fillRect(left + c * S, top + r * S, S, S);
      }
    }
  }

  root.VoSprites = { COLORS, GW, HL, VEHICLES, compose, paint };
})(globalThis);
