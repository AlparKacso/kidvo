/* kidvo OS — the shell.
 * Owns the desktop, windows, taskbar, start menu, the event bus and per-app storage.
 * Apps never touch this file: they run in sandboxed iframes and talk to the shell
 * through postMessage via shell/sdk.js. See CONTRIBUTING.md for the contract.
 */
(() => {
  'use strict';

  const CFG = window.KIDVO_CONFIG || {};
  const REGISTRY = Array.isArray(window.KIDVO_REGISTRY) ? window.KIDVO_REGISTRY : [];
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, props = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) node.append(kid);
    return node;
  };

  const desktop = $('#desktop');
  const winLayer = $('#windows');
  const ovLayer = $('#overlays');
  const iconsEl = $('#icons');
  const taskList = $('#task-list');
  const trayOverlays = $('#tray-overlays');
  const startBtn = $('#start-btn');
  const startMenu = $('#start-menu');
  const toasts = $('#toasts');
  const playEl = $('#play');
  const pageEl = $('#page');
  const aboveEl = $('#above');
  const skyEl = $('#sky');
  const hotLayer = $('#hotspots');

  const apps = new Map(REGISTRY.map(a => [a.id, a]));
  const wins = new Map();      // winId -> window record
  const frames = new Map();    // contentWindow -> { appId, winId, topics:Set, bucket }
  const overlays = new Map();  // appId -> { frame, ctx }
  let zTop = 10;
  let seq = 0;
  let focusedId = null;

  // Compact screens (phones, short landscape screens, touch tablets): every window becomes a full sheet.
  // Keep this query in sync with the "compact" @media block in shell.css.
  const COMPACT = '(max-width: 700px), (max-height: 500px), (pointer: coarse) and (max-width: 1100px)';
  const narrow = () => window.matchMedia(COMPACT).matches;

  /* ---------------- language ---------------- */
  const I18N = window.KIDVO_I18N || { languages: { en: 'English' }, strings: { en: {} } };
  const LANGS = Object.keys(I18N.languages);
  let lang = 'en';
  function T(key, vars = {}) {
    const pick = l => {
      const dict = I18N.strings[l] || {};
      if (typeof vars.n === 'number') {
        let cat = 'other';
        try { cat = new Intl.PluralRules(l).select(vars.n); } catch { /* old browser */ }
        if (dict[key + '_' + cat] != null) return dict[key + '_' + cat];
        if (dict[key + '_other'] != null) return dict[key + '_other'];
      }
      return dict[key];
    };
    const text = pick(lang) ?? pick('en') ?? key;
    return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  }
  // An app's name or description in the current language, falling back to English.
  const appText = (app, field) => app.translations?.[lang]?.[field] || app[field];

  const appDir = app => `apps/${app.id}/`;
  const iconUrl = app => appDir(app) + (app.icon || 'icon.svg');

  /* ---------------- preferences (shell's own, in this browser) ---------------- */
  const prefs = (() => {
    let data = {};
    try { data = JSON.parse(localStorage.getItem('kidvo:shell') || '{}') || {}; } catch { data = {}; }
    return {
      get: k => data[k],
      set: (k, v) => { data[k] = v; try { localStorage.setItem('kidvo:shell', JSON.stringify(data)); } catch { /* storage blocked */ } }
    };
  })();

  /* ---------------- views: the games page (default) or the desktop ---------------- */
  // Both views share the same windows, apps and bus. On the games page one game at a time sits on a
  // centred stage (a full sheet on compact screens) and the page behind it dims.
  const VIEWS = ['play', 'desktop'];
  let view = VIEWS.includes(prefs.get('view')) ? prefs.get('view') : 'play';
  const playing = () => view === 'play';
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate;

  /* ---------------- per-app storage ---------------- */
  const store = {
    read(appId) {
      try { return JSON.parse(localStorage.getItem('kidvo:app:' + appId) || '{}') || {}; } catch { return {}; }
    },
    write(appId, obj) {
      const s = JSON.stringify(obj);
      if (s.length > (CFG.storeLimit || 32768)) throw new Error('storage limit reached for ' + appId);
      try { localStorage.setItem('kidvo:app:' + appId, s); } catch { /* storage blocked: keep going */ }
      memoryStore.set(appId, obj);
    }
  };
  const memoryStore = new Map(); // fallback when localStorage is unavailable
  const readStore = appId => {
    const persisted = store.read(appId);
    return Object.keys(persisted).length ? persisted : (memoryStore.get(appId) || {});
  };

  /* ---------------- colors ---------------- */
  function readableOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#191833';
    const n = parseInt(m[1], 16);
    const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
    return L > 0.22 ? '#191833' : '#ffffff';
  }

  /* ---------------- desktop icons + start menu ---------------- */
  function renderIcons() {
    iconsEl.replaceChildren();
    for (const app of apps.values()) {
      if (app.type === 'overlay') continue;
      const btn = el('button', {
        class: 'icon', type: 'button', role: 'listitem',
        title: appText(app, 'description'),
        'data-app': app.id
      }, el('img', { src: iconUrl(app), alt: '', width: 44, height: 44, draggable: 'false' }), el('span', {}, appText(app, 'name')));
      btn.addEventListener('click', e => {
        iconsEl.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
        btn.classList.add('selected');
        // One tap opens on touch screens and narrow layouts; double-click elsewhere.
        if (e.detail === 0 || narrow() || e.pointerType === 'touch' || btn.dataset.touch) openApp(app.id);
      });
      btn.addEventListener('pointerdown', e => { btn.dataset.touch = e.pointerType === 'touch' ? '1' : ''; });
      btn.addEventListener('dblclick', () => openApp(app.id));
      iconsEl.append(btn);
    }
  }

  function renderStartMenu() {
    const list = $('#sm-apps');
    list.replaceChildren();
    const games = [...apps.values()].filter(a => a.type !== 'overlay');
    const sorted = games.sort((a, b) => appText(a, 'name').localeCompare(appText(b, 'name')));
    for (const app of sorted) {
      list.append(el('button', {
        class: 'sm-app', type: 'button', role: 'menuitem',
        onclick: () => { closeStart(); openApp(app.id); }
      },
        el('img', { src: iconUrl(app), alt: '' }),
        el('span', {}, el('div', { class: 'sm-app-name' }, appText(app, 'name')), el('div', { class: 'sm-app-by' }, appText(app, 'description'))),
        el('span', { class: 'bands' }, ...(app.bands || []).map(b => el('span', { class: 'band ' + b, title: T(b) }, b === 'explorers' ? '7–9' : '10–13')))
      ));
    }
    $('#sm-stats').textContent = T('games', { n: games.length });
  }

  function openStart() { startMenu.hidden = false; startBtn.setAttribute('aria-expanded', 'true'); $('.sm-app', startMenu)?.focus(); }
  function closeStart() { startMenu.hidden = true; startBtn.setAttribute('aria-expanded', 'false'); }
  startBtn.addEventListener('click', () => (startMenu.hidden ? openStart() : closeStart()));
  document.addEventListener('pointerdown', e => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) closeStart();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !startMenu.hidden) { closeStart(); startBtn.focus(); }
  });
  startMenu.addEventListener('click', e => {
    const which = e.target.closest('[data-shell]')?.dataset.shell;
    if (!which) return;
    closeStart();
    ({ about: openAbout, grownups: openGrownups, build: openBuild })[which]?.();
  });

  /* ---------------- windows ---------------- */
  function createWindow({ appId = null, title, color, icon, body, width = 480, height = 400, frame = null }) {
    const id = 'w' + (++seq);
    const rect = desktop.getBoundingClientRect();
    const w = Math.min(width, rect.width - 24);
    const h = Math.min(height + 34, rect.height - 24);
    const step = (seq - 1) % 7;
    const left = Math.max(8, Math.min(rect.width - w - 8, 128 + step * 30));
    const top = Math.max(8, Math.min(rect.height - h - 8, 24 + step * 30));

    // A game's maker is credited quietly next to its title (plain text; the info window links to them).
    const author = appId ? apps.get(appId)?.author?.name : null;
    const btn = (act, label, text) => el('button', { type: 'button', 'data-act': act, 'aria-label': label, title: label }, text);
    const bar = el('header', { class: 'win-bar' },
      el('button', { type: 'button', class: 'win-back', 'data-act': 'back', 'aria-label': T('backToGames'), title: T('backToGames') }, '‹'),
      icon ? el('img', { class: 'win-icon', src: icon, alt: '' }) : null,
      el('span', { class: 'win-title' }, title),
      author ? el('span', { class: 'win-by' }, T('byAuthor', { name: author })) : null,
      el('div', { class: 'win-btns' },
        appId ? btn('info', T('aboutApp'), 'i') : null,
        btn('min', T('minimize'), '_'),
        btn('max', T('maximize'), '□'),
        btn('close', T('close'), '×')
      ));
    const bodyEl = el('div', { class: 'win-body' }, body);
    const grip = el('div', { class: 'win-resize', 'aria-hidden': 'true' });
    const node = el('section', {
      class: 'win', role: 'dialog', 'aria-label': title, 'data-win': id,
      style: `left:${left}px;top:${top}px;width:${w}px;height:${h}px;`
    }, bar, bodyEl, grip);
    if (color) {
      node.style.setProperty('--app', color);
      node.style.setProperty('--app-fg', readableOn(color));
    }

    const rec = { id, appId, title, icon, node, frame, minimized: false, task: null, size: { w: width, h: height + 34 } };
    wins.set(id, rec);
    winLayer.append(node);
    fitStage(rec);

    bar.addEventListener('click', e => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'back') goBack();
      else if (act === 'close') closeWindow(id);
      else if (act === 'min') minimize(id);
      else if (act === 'max') toggleMax(id);
      else if (act === 'info') openInfo(appId);
    });
    bar.addEventListener('dblclick', e => { if (!e.target.closest('button')) toggleMax(id); });
    node.addEventListener('pointerdown', () => focus(id), true);
    node.addEventListener('focusin', () => focus(id));
    enableDrag(rec, bar);
    enableResize(rec, grip);

    rec.task = el('button', { class: 'task', type: 'button', title }, icon ? el('img', { src: icon, alt: '' }) : null, el('span', {}, title));
    rec.task.addEventListener('click', () => {
      if (rec.minimized) restore(id);
      else if (focusedId === id) minimize(id);
      else focus(id);
    });
    taskList.append(rec.task);

    focus(id);
    if (appId) broadcast('shell:opened', { appId }, 'shell');
    syncHash();
    return rec;
  }

  function focus(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (focusedId !== id || rec.node.style.zIndex != zTop) rec.node.style.zIndex = ++zTop;
    focusedId = id;
    for (const r of wins.values()) {
      r.node.classList.toggle('focused', r.id === id);
      r.task.classList.toggle('active', r.id === id && !r.minimized);
    }
    queueWindows();
  }

  function minimize(id) {
    const rec = wins.get(id);
    if (!rec) return;
    rec.minimized = true;
    playSend(id); // back to the games (or minimized on the desktop): this stretch of play is over
    rec.node.hidden = true;
    rec.task.classList.add('min');
    rec.task.classList.remove('active');
    if (focusedId === id) {
      focusedId = null;
      const next = [...wins.values()].filter(r => !r.minimized).sort((a, b) => b.node.style.zIndex - a.node.style.zIndex)[0];
      if (next) focus(next.id);
    }
    queueWindows();
  }

  function restore(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (rec.appId) soloStage(id);
    rec.minimized = false;
    rec.node.hidden = false;
    rec.task.classList.remove('min');
    fitStage(rec);
    focus(id);
  }

  // On the games page one game at a time is on the stage; the others wait, minimized, behind their cards.
  function soloStage(keepId) {
    if (!playing()) return;
    for (const r of [...wins.values()]) if (r.id !== keepId && r.appId && !r.minimized) minimize(r.id);
  }

  // The stage: centred and as large as a game needs, with room above it for Vo when the screen is tall enough.
  // Compact screens ignore this: there every window is a full sheet (shell.css).
  function fitStage(rec) {
    if (!playing() || narrow() || rec.minimized) return;
    const W = desktop.clientWidth, H = desktop.clientHeight;
    const want = rec.appId ? { w: Math.max(rec.size.w, 900), h: Math.max(rec.size.h, 660) } : rec.size;
    const w = Math.min(want.w, W - 32);
    const gap = H - 120 >= 520 ? 104 : 16;
    const h = Math.min(want.h, H - gap - 16);
    Object.assign(rec.node.style, {
      left: Math.round((W - w) / 2) + 'px', top: Math.round(Math.max(gap, (H - h) / 2)) + 'px',
      width: Math.round(w) + 'px', height: Math.round(h) + 'px'
    });
  }

  // "Back to the games": every window on the stage shrinks into its card (or simply goes) and waits there.
  function goBack() {
    for (const r of [...wins.values()]) {
      if (r.minimized || r.leaving) continue;
      const card = r.appId && cardFor(r.appId);
      if (!playing() || !card || narrow() || calm()) { minimize(r.id); continue; }
      r.leaving = true;
      const anim = flip(r.node, card.getBoundingClientRect(), true);
      const done = () => { r.leaving = false; minimize(r.id); anim.cancel(); };
      anim.finished.then(done, done);
    }
  }

  // Zooms a window from a rectangle (a game card) to where it stands now, or back when `reverse` is set.
  function flip(node, from, reverse = false) {
    const to = node.getBoundingClientRect();
    const k = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const frames = [{ transformOrigin: '0 0', transform: k, opacity: 0.3 }, { transformOrigin: '0 0', transform: 'none', opacity: 1 }];
    return node.animate(reverse ? frames.reverse() : frames, { duration: reverse ? 220 : 340, easing: 'cubic-bezier(.2,.9,.25,1)', fill: reverse ? 'forwards' : 'none' });
  }

  function toggleMax(id) {
    const rec = wins.get(id);
    if (!rec || narrow() || playing()) return;
    rec.node.classList.toggle('max');
    queueWindows();
  }

  function closeWindow(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (rec.frame) frames.delete(rec.frame.contentWindow);
    playSend(id);
    plays.delete(id);
    rec.node.remove();
    rec.task.remove();
    wins.delete(id);
    if (focusedId === id) {
      focusedId = null;
      const next = [...wins.values()].filter(r => !r.minimized).sort((a, b) => b.node.style.zIndex - a.node.style.zIndex)[0];
      if (next) focus(next.id);
    }
    if (rec.appId) broadcast('shell:closed', { appId: rec.appId }, 'shell');
    queueWindows();
    syncHash();
  }

  function enableDrag(rec, handle) {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button') || narrow() || playing() || rec.node.classList.contains('max')) return;
      const start = { x: e.clientX, y: e.clientY, left: rec.node.offsetLeft, top: rec.node.offsetTop };
      const bounds = desktop.getBoundingClientRect();
      handle.setPointerCapture(e.pointerId);
      desktop.classList.add('busy');
      const move = ev => {
        const left = Math.min(bounds.width - 60, Math.max(60 - rec.node.offsetWidth, start.left + ev.clientX - start.x));
        const top = Math.min(bounds.height - 34, Math.max(0, start.top + ev.clientY - start.y));
        rec.node.style.left = left + 'px';
        rec.node.style.top = top + 'px';
        queueWindows();
      };
      const up = () => {
        desktop.classList.remove('busy');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function enableResize(rec, grip) {
    grip.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY, w: rec.node.offsetWidth, h: rec.node.offsetHeight };
      grip.setPointerCapture(e.pointerId);
      desktop.classList.add('busy');
      const move = ev => {
        rec.node.style.width = Math.max(220, start.w + ev.clientX - start.x) + 'px';
        rec.node.style.height = Math.max(140, start.h + ev.clientY - start.y) + 'px';
        queueWindows();
      };
      const up = () => {
        desktop.classList.remove('busy');
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
  }

  /* ---------------- apps ---------------- */
  function openApp(appId) {
    const app = apps.get(appId);
    if (!app) { toast('kidvo', T('noSuchApp', { id: appId })); return null; }
    if (app.type === 'overlay') { startOverlay(app); return null; }
    const existing = [...wins.values()].find(r => r.appId === appId);
    if (existing) { restore(existing.id); return existing; }
    soloStage(null);

    const frame = el('iframe', {
      src: appDir(app) + (app.entry || 'index.html'),
      sandbox: 'allow-scripts',
      // No fullscreen (a game could paint a fake desktop or browser over everything) and no clipboard.
      allow: 'autoplay',
      referrerpolicy: 'no-referrer',
      title: appText(app, 'name')
    });
    const rec = createWindow({
      appId, title: appText(app, 'name'), color: app.color, icon: iconUrl(app), body: frame,
      width: app.window?.width || 480, height: app.window?.height || 400, frame
    });
    registerFrame(frame, appId, rec.id);
    playStart(rec);
    return rec;
  }

  function registerFrame(frame, appId, winId) {
    const ctx = { appId, winId, topics: new Set(), bucket: { t: performance.now(), n: 0 }, frame };
    // contentWindow exists as soon as the iframe is in the document.
    frames.set(frame.contentWindow, ctx);
    frame.addEventListener('load', () => frames.set(frame.contentWindow, ctx));
    return ctx;
  }

  function startOverlay(app) {
    if (overlays.has(app.id)) return;
    const frame = el('iframe', {
      src: appDir(app) + (app.entry || 'index.html'),
      sandbox: 'allow-scripts',
      referrerpolicy: 'no-referrer',
      tabindex: '-1',
      title: appText(app, 'name')
    });
    ovLayer.append(frame);
    const ctx = registerFrame(frame, app.id, null);
    overlays.set(app.id, { frame, ctx });
    prefs.set('overlay:' + app.id, 'on');
    renderTray();
    broadcast('shell:opened', { appId: app.id }, 'shell');
  }

  function setHotspot(ctx, rect) {
    let spot = ctx.hotspot;
    const r = rect && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(rect[k])) ? rect : null;
    if (!r) { spot?.remove(); ctx.hotspot = null; return; }
    if (!spot) {
      const app = apps.get(ctx.appId);
      spot = el('button', { type: 'button', class: 'hotspot', 'aria-label': appText(app, 'name'), title: appText(app, 'name') });
      const poke = (e, long) => {
        const box = ovLayer.getBoundingClientRect();
        try { ctx.frame.contentWindow.postMessage({ kidvo: 1, kind: 'event', topic: 'shell:poke', data: { x: e.clientX - box.left, y: e.clientY - box.top, long }, from: 'shell' }, '*'); } catch { /* gone */ }
      };
      // A long press (half a second), a right-click or the context-menu key arrives with long: true.
      let press = null;
      spot.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        clearTimeout(press?.timer);
        try { spot.setPointerCapture(e.pointerId); } catch { /* not supported */ }
        const p = press = { fired: false, timer: setTimeout(() => { p.fired = true; poke(e, true); }, 550) };
      });
      // The click after a long press is swallowed; forget the press if no click comes (touch screens).
      for (const type of ['pointerup', 'pointercancel']) spot.addEventListener(type, () => {
        const p = press;
        clearTimeout(p?.timer);
        setTimeout(() => { if (press === p) press = null; }, 400);
      });
      spot.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (press?.fired) return;
        clearTimeout(press?.timer);
        if (press) press.fired = true;
        poke(e, true);
      });
      spot.addEventListener('click', e => {
        const p = press;
        press = null;
        if (!p?.fired) poke(e, false);
      });
      // Hotspots have their own layer just above the overlays (see #above in shell.css), below every window.
      hotLayer.append(spot);
      ctx.hotspot = spot;
    }
    const w = Math.min(140, Math.max(16, r.w)), h = Math.min(140, Math.max(16, r.h));
    spot.style.cssText = `left:${Math.round(r.x)}px;top:${Math.round(r.y)}px;width:${Math.round(w)}px;height:${Math.round(h)}px;`;
  }

  // Only Vo may lift above the windows (security review 2026-10-14): overlays stay under the windows so a
  // contributed overlay can never cover a game and take its clicks. The shell ignores the request from any other app.
  const MODAL_APPS = new Set(['pet']);
  const mayModal = app => app?.type === 'overlay' && MODAL_APPS.has(app.id);

  // Vo lifts himself above the windows and takes every click while he shows his garage card. He turns this
  // off when the card closes; hiding him from the tray also ends it.
  function setModal(ctx, on) {
    const ov = overlays.get(ctx.appId);
    if (!ov) return;
    ov.frame.classList.toggle('modal', on);
    const any = [...overlays.values()].some(o => o.frame.classList.contains('modal'));
    ovLayer.classList.toggle('modal', any);
    aboveEl.classList.toggle('modal', any);
    if (on) ov.frame.focus();
    else if (document.activeElement === ov.frame) ctx.hotspot ? ctx.hotspot.focus() : ov.frame.blur();
  }

  function stopOverlay(appId) {
    const ov = overlays.get(appId);
    if (!ov) return;
    ov.ctx.hotspot?.remove();
    setModal(ov.ctx, false);
    frames.delete(ov.frame.contentWindow);
    ov.frame.remove();
    overlays.delete(appId);
    prefs.set('overlay:' + appId, 'off');
    renderTray();
  }

  function renderTray() {
    trayOverlays.replaceChildren();
    for (const app of apps.values()) {
      if (app.type !== 'overlay') continue;
      const on = overlays.has(app.id);
      trayOverlays.append(el('button', {
        type: 'button', class: 'tray-btn' + (on ? ' on' : ''),
        title: T(on ? 'hide' : 'show', { name: appText(app, 'name') }), 'aria-pressed': on ? 'true' : 'false',
        onclick: () => (on ? stopOverlay(app.id) : startOverlay(app))
      }, el('img', { src: iconUrl(app), alt: app.name })));
    }
  }

  /* ---------------- built-in windows ---------------- */
  const html = (strings, ...vals) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = strings.reduce((acc, s, i) => acc + s + (i < vals.length ? vals[i] : ''), '');
    return wrap;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (key, vars) => esc(T(key, vars));
  const repo = CFG.repoUrl || '#';
  const mail = CFG.contactEmail || 'hello@kidvo.eu';
  const games = () => [...apps.values()].filter(a => a.type !== 'overlay' && a.bands?.length);
  const parentsUrl = app => `${appDir(app)}parents/${(app.languages || ['en']).includes(lang) ? lang : 'en'}.html`;

  function openBuiltin(key, title, width, height, bodyFn, reopen) {
    const existing = [...wins.values()].find(r => r.builtin === key);
    if (existing) { restore(existing.id); return; }
    const rec = createWindow({ title, color: '#ffd23f', icon: 'shell/logo.svg', body: bodyFn(), width, height });
    rec.builtin = key;
    rec.reopen = reopen;
    rec.node.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openApp(b.dataset.open)));
    rec.node.querySelectorAll('[data-parents]').forEach(b => b.addEventListener('click', () => openParents(b.dataset.parents)));
  }

  function openAbout() {
    const first = games().find(a => a.id === CFG.startApp) || games()[0];
    openBuiltin('about', T('welcomeTitle'), 460, 470, () => html`
      <div class="doc">
        <h2>${t('welcomeH')}</h2>
        <p class="lede">${t('welcomeP1')}</p>
        <p>${t('welcomeP2')}</p>
        <h3>${t('tipsH')}</h3>
        <ol class="rules">
          <li><span><b>${t('tip1b')}</b> ${t('tip1')}</span></li>
          <li><span><b>${t('tip2b')}</b> ${t('tip2')}</span></li>
          <li><span><b>${t('tip3b')}</b> ${t('tip3')}</span></li>
        </ol>
        <p class="small">${t('welcomeP3')}</p>
        ${first ? `<div class="btn-row"><button class="btn" type="button" data-open="${esc(first.id)}">${t('play')}</button></div>` : ''}
      </div>`, openAbout);
  }

  function openGrownups() {
    openBuiltin('grownups', T('grownupsTitle'), 520, 520, () => html`
      <div class="doc">
        <h2>${t('grownupsH')}</h2>
        <p class="lede">${t('grownupsLede')}</p>
        <h3>${t('safeH')}</h3>
        <ul>
          <li><b>${t('safe1b')}</b> ${t('safe1')}</li>
          <li><b>${t('safe2b')}</b> ${t('safe2')}</li>
          <li><b>${t('safe3b')}</b> ${t('safe3')}</li>
        </ul>
        <h3>${t('privacyH')}</h3>
        <ul>
          <li>${t('priv1')}</li>
          <li>${t('priv2')}</li>
          <li>${t('privCount')}</li>
          <li>${t('priv3')} <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">${t('privacyGithub')}</a></li>
        </ul>
        <h3>${t('gamesH')}</h3>
        <ul class="game-list">
          ${games().map(app => `<li><span><b>${esc(appText(app, 'name'))}</b> <small>${app.bands.map(b => t(b)).join(' · ')}</small></span>
            <button class="btn alt" type="button" data-parents="${esc(app.id)}">${t('parentsGuide')}</button></li>`).join('')}
        </ul>
        <h3>${t('buildH')}</h3>
        <p>${t('buildP')}</p>
        <div class="btn-row">
          <a class="btn alt" href="${esc(repo)}" target="_blank" rel="noopener">${t('source')}</a>
          <a class="btn alt" href="${esc(repo)}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">${t('howTo')}</a>
        </div>
        <h3>${t('contactH')}</h3>
        <p>${t('contactP', { mail: '%MAIL%' }).replace('%MAIL%', `<a href="mailto:${esc(mail)}">${esc(mail)}</a>`)}</p>
        <p class="small">${t('madeByAlpar')}</p>
      </div>`, openGrownups);
  }

  // For grown-ups who want to contribute. Worded for adults: GitHub's minimum age is 13.
  function openBuild() {
    openBuiltin('build', T('buildWinTitle'), 480, 530, () => html`
      <div class="doc">
        <h2>${t('buildWinH')}</h2>
        <p class="lede">${t('buildWinHey')}</p>
        <p class="lede">${t('buildWinLede')}</p>
        <p class="lede">${t('buildWinLede2')}</p>
        <p class="lede">${t('buildWinAsk')}</p>
        <h3>${t('lookH')}</h3>
        <ul>
          <li>${t('look1')}</li>
          <li>${t('look2')}</li>
          <li>${t('look3')}</li>
        </ul>
        <div class="btn-row">
          <a class="btn" href="${esc(repo)}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">${t('howTo')}</a>
          <a class="btn alt" href="${esc(repo)}" target="_blank" rel="noopener">${t('source')}</a>
        </div>
        <p>${t('suggestP')}</p>
        <div class="btn-row">
          <a class="btn alt" href="${esc(repo)}/issues/new?template=app-idea.yml" target="_blank" rel="noopener">${t('suggest')}</a>
          <a class="btn alt" href="${esc(repo)}/issues?q=is%3Aissue%20is%3Aopen%20label%3Aidea" target="_blank" rel="noopener">${t('openIdeas')}</a>
        </div>
        <p class="small">${t('buildAge')}</p>
      </div>`, openBuild);
  }

  function openInfo(appId) {
    const app = apps.get(appId);
    if (!app) return;
    openBuiltin('info:' + appId, appText(app, 'name') + ' · i', 400, 380, () => html`
      <div class="doc">
        <h2>${esc(appText(app, 'name'))}</h2>
        <p>${esc(appText(app, 'description'))}</p>
        <dl class="meta">
          <dt>${t('madeBy')}</dt><dd>${app.author.url ? `<a href="${esc(app.author.url)}" target="_blank" rel="noopener">${esc(app.author.name)}</a>` : esc(app.author.name)}</dd>
          ${app.bands?.length ? `<dt>${t('forWho')}</dt><dd>${app.bands.map(b => t(b)).join(', ')}</dd>` : ''}
          ${app.skills?.length ? `<dt>${t('teaches')}</dt><dd>${app.skills.map(k => t('skill_' + k.replaceAll('-', '_'))).join('; ')}</dd>` : ''}
          <dt>${t('added')}</dt><dd>${esc(app.added || '')}</dd>
        </dl>
        <div class="btn-row">
          ${app.bands?.length ? `<button class="btn" type="button" data-parents="${esc(app.id)}">${t('parentsGuide')}</button>` : ''}
          <a class="btn alt" href="${esc(repo)}/tree/main/apps/${esc(app.id)}" target="_blank" rel="noopener">${t('viewSource')}</a>
        </div>
      </div>`, () => openInfo(appId));
  }

  // The parents' guide is a plain, printable page in the game's folder: apps/<id>/parents/<lang>.html
  function openParents(appId) {
    const app = apps.get(appId);
    if (!app) return;
    openBuiltin('parents:' + appId, `${T('parentsGuide')} · ${appText(app, 'name')}`, 640, 580, () => {
      const url = parentsUrl(app);
      return el('div', { class: 'parents-wrap' },
        el('iframe', { src: url, sandbox: '', referrerpolicy: 'no-referrer', title: T('parentsGuide') }),
        el('a', { class: 'btn print-link', href: url, target: '_blank', rel: 'noopener' }, T('openToPrint')));
    }, () => openParents(appId));
  }

  /* ---------------- the games page ---------------- */
  // Small pixel pictures, drawn from rows of letters. Each letter is a class (px-<letter>) that shell.css colours,
  // so the sky can change with the time of day.
  function pixelSvg(rows, scale, cls = '') {
    let rects = '';
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const c = row[x];
        let n = 1;
        while (row[x + n] === c) n++;
        if (c !== '.') rects += `<rect class="px-${c}" x="${x}" y="${y}" width="${n}" height="1"/>`;
        x += n;
      }
    });
    const w = rows[0].length, h = rows.length;
    return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  const ART = {
    games: ['ccc.ccc', 'ccc.ccc', 'ccc.ccc', '.......', 'ccc.ccc', 'ccc.ccc', 'ccc.ccc'],
    desktop: ['ccccccc', 'ccccccc', 'c.....c', 'c.....c', 'c.....c', 'c.....c', 'ccccccc'],
    play: ['cc....', 'ccc...', 'cccc..', 'ccccc.', 'ccccc.', 'cccc..', 'ccc...', 'cc....'],
    cloud: ['.....wwww.......', '...wwwwwwww.ww..', '.wwwwwwwwwwwwww.', 'wwwwwwwwwwwwwwww', 'sswwwwwwwwwwwwss', '.ssssssssssssss.'],
    puff: ['...www.....', '.wwwwwwww..', 'wwwwwwwwwww', '.sssssssss.'],
    sun: ['....yyyy....', '..yhhyyyyy..', '.yhhyyyyyyy.', '.yhyyyyyyyy.', 'yyyyyyyyyyyy', 'yyyyyyyyyyyy', 'yyyyyyyyyyyy', 'yyyyyyyyyyyo', '.yyyyyyyyyo.', '.yyyyyyyyoo.', '..yyyyyooo..', '....oooo....'],
    moon: ['....mmmm....', '..mmmmm.....', '.mmmmm......', '.mmmm.......', 'mmmm........', 'mmmm........', 'mmmm........', 'mmmm........', '.mmmm.......', '.mmmmm......', '..mmmmm.....', '....mmmm....']
  };

  // A row of stepped hills, as one path: `cells` columns, each `h` cells tall at most.
  function hills(cells, h, seed, cls) {
    let d = `M0 ${h}`;
    for (let i = 0; i < cells; i++) {
      const y = h - Math.max(1, Math.round(h * (0.55 + 0.25 * Math.sin(i / 9 + seed) + 0.2 * Math.sin(i / 3.7 + seed * 2))));
      d += `V${y}h1`;
    }
    return `<svg class="hills ${cls}" viewBox="0 0 ${cells} ${h}" width="${cells * 6}" height="${h * 6}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}V${h}z"/></svg>`;
  }

  // Morning, day, sunset or night, from this device's clock. Nothing else changes with it.
  const skyPhase = () => {
    const h = new Date().getHours();
    return h >= 6 && h < 9 ? 'dawn' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night';
  };
  function renderSky() {
    let stars = '';
    for (let i = 0; i < 46; i++) {
      // Fixed places (no Math.random), so the night sky looks the same on every visit.
      const x = (i * 37.3) % 100, y = (i * 61.7) % 58, big = i % 5 === 0;
      stars += `<i class="star${big ? ' big' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;animation-delay:${(i % 7) * 0.45}s"></i>`;
    }
    const clouds = [[8, 0.62, 4, 95], [26, 0.4, 3, 140], [46, 0.82, 5, 80], [64, 0.25, 3, 120], [80, 0.55, 4, 105]]
      .map(([top, start, scale, secs], i) => `<div class="cloud" style="top:${top}%;animation-duration:${secs}s;animation-delay:${-start * secs}s">${pixelSvg(i % 2 ? ART.puff : ART.cloud, scale)}</div>`).join('');
    skyEl.innerHTML = `<div class="sky-far"><div class="stars">${stars}</div>${pixelSvg(ART.sun, 7, 'sun')}${pixelSvg(ART.moon, 7, 'moon')}</div>
      <div class="sky-near">${clouds}</div>${hills(560, 22, 1.3, 'far')}${hills(560, 13, 4.1, 'near')}`;
    skyEl.dataset.phase = skyPhase();
  }
  setInterval(() => { skyEl.dataset.phase = skyPhase(); }, 5 * 60 * 1000);

  const cardFor = appId => playEl.querySelector(`.card[data-app="${CSS.escape(appId)}"]`);
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  // A card leans towards the mouse a little, like a real one held in a hand.
  function tilt(card) {
    card.addEventListener('pointermove', e => {
      if (!fine.matches || calm()) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 8).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });
  }

  function openFromCard(appId, card) {
    const from = card.getBoundingClientRect();
    const rec = openApp(appId);
    if (rec && playing() && !narrow() && !calm()) flip(rec.node, from);
  }

  // A game that is already open (waiting behind its card) says "Continue" instead of "Play".
  function markCards() {
    for (const card of playEl.querySelectorAll('.card')) {
      const on = [...wins.values()].some(r => r.appId === card.dataset.app);
      const btn = card.querySelector('.card-play');
      if (btn.dataset.on === String(on)) continue;
      btn.dataset.on = String(on);
      card.classList.toggle('running', on);
      btn.querySelector('span').textContent = T(on ? 'continueBtn' : 'playBtn');
      btn.setAttribute('aria-label', `${T(on ? 'continueBtn' : 'playBtn')}: ${card.querySelector('.card-name').textContent}`);
    }
  }

  // One grid of tiles: the motto first, then the games, with two small guide tiles (the three tips, and how Vo
  // grows) placed between them, so the games stay in front and the explaining sits right next to them.
  function renderPlay() {
    const top = playEl.scrollTop;
    const pet = apps.get('pet');
    const tip = n => `<div class="note"><span class="tip-n">${n}</span><p><b>${t(`tip${n}b`)}</b> ${t(`tip${n}`)}</p></div>`;
    const page = html`
      <div class="play-in">
        <div class="tiles">
          <header class="intro">
            <p class="intro-for" data-surface>${t('heroFor', { ages: '%AGES%' }).replace('%AGES%', '<b class="ages">7–13</b>')}</p>
            <h1 class="intro-h" data-surface>${t('motto').replace(/\bAI\b/g, '<span class="ai">AI</span>')}</h1>
            <p class="intro-p">${t('heroP')}</p>
            <p class="intro-note"><b>${t('safe1b')}</b> ${t('safe1')}</p>
          </header>
          <div class="guide" data-guide="1" data-surface>${tip(1)}${tip(2)}</div>
          <div class="guide" data-guide="2" data-surface>${tip(3)}${pet ? `<div class="note vo"><img src="${esc(iconUrl(pet))}" alt="" width="40" height="40"><p><b>${t('voH')}</b> ${t('voP')}</p></div>` : ''}</div>
        </div>
        <div class="play-foot">
          <button class="btn alt" type="button" data-shell="about">${t('menuAbout')}</button>
          <button class="btn alt" type="button" data-shell="grownups">${t('menuGrownups')}</button>
          <button class="btn alt" type="button" data-shell="build">${t('menuBuild')}</button>
        </div>
        <p class="play-note">${t('priv1')}</p>
      </div>`.firstElementChild;
    const tiles = page.querySelector('.tiles');
    const [guide1, guide2] = tiles.querySelectorAll('.guide');
    const games = [...apps.values()].filter(a => a.type !== 'overlay');
    games.forEach((app, i) => {
      const name = appText(app, 'name');
      const btn = el('button', { type: 'button', class: 'card-play' }, el('span', {}, T('playBtn')));
      btn.insertAdjacentHTML('afterbegin', pixelSvg(ART.play, 2));
      // A quiet way in for grown-ups: the game's parents' guide. Play stays the big yellow button.
      const guide = app.bands?.length ? el('button', {
        type: 'button', class: 'card-grownups', title: `${T('parentsGuide')} · ${name}`, 'aria-label': `${T('menuGrownups')}: ${name}`
      }, T('menuGrownups')) : null;
      const card = el('article', { class: 'card', 'data-app': app.id, 'data-surface': '' },
        el('div', { class: 'card-art', 'aria-hidden': 'true' }, el('img', { src: iconUrl(app), alt: '', width: 96, height: 96, draggable: 'false' })),
        el('div', { class: 'card-body' },
          el('h3', { class: 'card-name' }, name),
          // The age bands are stickers on the picture (shell.css), read right after the name.
          el('span', { class: 'bands card-bands' }, ...(app.bands || []).map(b => el('span', { class: 'band ' + b, title: T(b) }, b === 'explorers' ? '7–9' : '10–13'))),
          el('p', { class: 'card-desc' }, appText(app, 'description')),
          el('div', { class: 'card-foot' }, guide, btn)));
      if (app.color) card.style.setProperty('--app', app.color);
      btn.addEventListener('click', () => openFromCard(app.id, card));
      guide?.addEventListener('click', () => openParents(app.id));
      tilt(card);
      // The tips follow the third game and Vo's note the fourth (or the last games, when there are fewer).
      tiles.insertBefore(card, i < 3 ? guide1 : i === 3 ? guide2 : null);
    });
    page.querySelector('.play-foot').addEventListener('click', e => {
      const which = e.target.closest('[data-shell]')?.dataset.shell;
      ({ about: openAbout, grownups: openGrownups, build: openBuild })[which]?.();
    });
    pageEl.replaceChildren(page);
    playEl.scrollTop = top;
    markCards();
    queueWindows();
  }

  // Vo walks on the page too: the headline, the cards and the tips are surfaces, like window tops.
  function playSurfaces() {
    const box = desktop.getBoundingClientRect();
    const out = [];
    playEl.querySelectorAll('[data-surface]').forEach((n, i) => {
      const r = n.getBoundingClientRect();
      if (r.bottom <= box.top || r.top >= box.bottom) return;
      out.push({ id: 'page' + i, appId: null, title: '', x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height, z: 0, focused: false });
    });
    return out;
  }

  playEl.addEventListener('scroll', () => {
    skyEl.style.setProperty('--scroll', playEl.scrollTop);
    queueWindows();
  }, { passive: true });
  // Tiles slide in and lift under the mouse: tell Vo where they ended up, or he stands where they were.
  playEl.addEventListener('animationend', queueWindows);
  playEl.addEventListener('transitionend', queueWindows);

  // While a game is on the stage the page behind it dims; a click there (or Escape) goes back to the games.
  // On the page only: a tap on Vo's hotspot (in #above) still reaches Vo.
  pageEl.addEventListener('click', e => {
    if (!desktop.classList.contains('staged')) return;
    e.preventDefault();
    e.stopPropagation();
    goBack();
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && desktop.classList.contains('staged') && startMenu.hidden) goBack();
  });

  function renderViews() {
    const box = $('#views');
    box.replaceChildren(...VIEWS.map(v => {
      const label = T(v === 'play' ? 'viewGames' : 'viewDesktop');
      const b = el('button', { type: 'button', class: 'view-btn', title: label, 'aria-label': label, 'aria-pressed': v === view ? 'true' : 'false', onclick: () => setView(v) },
        el('span', {}, label));
      b.insertAdjacentHTML('afterbegin', pixelSvg(v === 'play' ? ART.games : ART.desktop, 2));
      return b;
    }));
    box.setAttribute('aria-label', T('viewLabel'));
  }

  // Switching views: a quick wipe of pixel blocks, then the other view.
  function pixelWipe(middle) {
    const cols = 14, rows = Math.max(5, Math.round(cols * innerHeight / innerWidth));
    const wipe = el('div', { class: 'wipe', 'aria-hidden': 'true', style: `grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)` });
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = el('i', { class: (r * 7 + c * 3) % 11 === 0 ? 'sun' : '' });
        cells.push([cell, (r + c) / (rows + cols - 2)]);
        wipe.append(cell);
      }
    }
    document.body.append(wipe);
    const run = (a, b) => Promise.all(cells.map(([cell, k]) => cell.animate(
      [{ transform: `scale(${a})` }, { transform: `scale(${b})` }],
      { duration: 150, delay: k * 200, easing: 'steps(3, end)', fill: 'forwards' }).finished));
    let switched = false;
    const swap = () => { if (!switched) { switched = true; middle(); } };
    run(0, 1.04).then(() => { swap(); return run(1.04, 0); }).catch(swap).finally(() => wipe.remove());
  }

  function setView(v, animate = true) {
    if (!VIEWS.includes(v) || (v === view && document.body.dataset.view === v)) return;
    const apply = () => {
      view = v;
      prefs.set('view', v);
      document.body.dataset.view = v;
      closeStart();
      if (playing()) {
        const keep = wins.get(focusedId);
        for (const r of [...wins.values()]) if (r !== keep && !r.minimized) minimize(r.id);
        for (const r of wins.values()) { r.node.classList.remove('max'); fitStage(r); }
      }
      renderViews();
      queueWindows();
    };
    if (!animate || calm()) apply(); else pixelWipe(apply);
  }

  /* ---------------- toasts ---------------- */
  const lastToast = new Map();
  function toast(from, text) {
    const now = Date.now();
    if (now - (lastToast.get(from) || 0) < 2500) return false;
    lastToast.set(from, now);
    const node = el('div', { class: 'toast' }, el('div', {}, el('b', {}, from), el('div', {}, String(text).slice(0, 140))));
    toasts.append(node);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => node.remove(), 4500);
    return true;
  }

  /* ---------------- event bus ---------------- */
  const matches = (pattern, topic) =>
    pattern === '*' || pattern === topic || (pattern.endsWith(':*') && topic.startsWith(pattern.slice(0, -1)));

  function broadcast(topic, data, from) {
    for (const [win, ctx] of frames) {
      if (![...ctx.topics].some(p => matches(p, topic))) continue;
      try { win.postMessage({ kidvo: 1, kind: 'event', topic, data, from }, '*'); } catch { /* frame gone */ }
    }
  }

  function windowRects() {
    const out = [];
    for (const r of wins.values()) {
      if (r.minimized) continue;
      out.push({
        id: r.id, appId: r.appId, title: r.title,
        x: r.node.offsetLeft, y: r.node.offsetTop, w: r.node.offsetWidth, h: r.node.offsetHeight,
        z: Number(r.node.style.zIndex) || 0, focused: r.id === focusedId
      });
    }
    return out.sort((a, b) => a.z - b.z);
  }

  let windowsQueued = false;
  function queueWindows() {
    if (windowsQueued) return;
    windowsQueued = true;
    requestAnimationFrame(() => {
      windowsQueued = false;
      // On compact screens an open window fills the desktop, so overlays (like Vo) step aside
      // instead of covering the game's buttons.
      const shown = [...wins.values()].some(r => !r.minimized);
      desktop.classList.toggle('sheet-open', narrow() && shown);
      desktop.classList.toggle('staged', playing() && shown);
      markCards();
      playTick();
      const rects = windowRects();
      if (playing() && !(narrow() && shown)) rects.unshift(...playSurfaces());
      broadcast('shell:windows', { windows: rects, width: desktop.clientWidth, height: desktop.clientHeight }, 'shell');
    });
  }
  // #above is pinned to the top of the visible page with no height of its own; the overlays and hotspots in it
  // are as tall as the visible part, so Vo's floor is the bottom of the screen, not of the page. The visible part
  // also changes without a window resize: the desktop's taskbar is taller than the games page's strip of ground,
  // and Vo walked behind it after a switch of views.
  const sizeAbove = () => aboveEl.style.setProperty('--vo-h', playEl.clientHeight + 'px');
  new ResizeObserver(() => { sizeAbove(); queueWindows(); }).observe(playEl);
  window.addEventListener('resize', () => {
    for (const r of wins.values()) fitStage(r);
    queueWindows();
  });

  const TOPIC = /^[a-z0-9][a-z0-9-]{0,31}$/;
  const PATTERN = /^(\*|[a-z0-9][a-z0-9-]{0,31}(:[a-z0-9*][a-z0-9-]{0,31})?)$/;

  function allowed(ctx) {
    const now = performance.now();
    if (now - ctx.bucket.t > 1000) { ctx.bucket.t = now; ctx.bucket.n = 0; }
    return ++ctx.bucket.n <= (CFG.emitRate || 40);
  }

  const methods = {
    open: (ctx, id) => { if (!apps.has(id)) throw new Error('unknown app ' + id); openApp(id); return true; },
    notify: (ctx, text) => toast(apps.get(ctx.appId)?.name || ctx.appId, text),
    setTitle: (ctx, text) => {
      const rec = wins.get(ctx.winId);
      if (!rec) return false;
      const t = String(text).slice(0, 48) || apps.get(ctx.appId).name;
      rec.node.querySelector('.win-title').textContent = t;
      rec.task.querySelector('span').textContent = t;
      return true;
    },
    windows: () => windowRects(),
    apps: () => [...apps.values()].map(a => ({ id: a.id, name: a.name, type: a.type, skills: a.skills || [], open: [...wins.values()].some(r => r.appId === a.id) || overlays.has(a.id) })),
    'store.get': (ctx, key) => readStore(ctx.appId)[String(key)] ?? null,
    'store.set': (ctx, key, value) => {
      const obj = { ...readStore(ctx.appId), [String(key).slice(0, 64)]: value };
      store.write(ctx.appId, obj);
      return true;
    },
    'store.remove': (ctx, key) => {
      const obj = { ...readStore(ctx.appId) };
      delete obj[String(key)];
      store.write(ctx.appId, obj);
      return true;
    }
  };

  window.addEventListener('message', e => {
    const ctx = frames.get(e.source);
    const m = e.data;
    if (!ctx || !m || m.kidvo !== 1 || typeof m.kind !== 'string') return;
    if (!allowed(ctx)) return;
    const reply = msg => { try { e.source.postMessage({ kidvo: 1, ...msg }, '*'); } catch { /* gone */ } };

    switch (m.kind) {
      case 'hello':
        reply({ kind: 'init', appId: ctx.appId, winId: ctx.winId, lang });
        break;
      case 'sub':
        // Every broadcast walks every pattern, so one app may hold at most 32.
        if (typeof m.topic === 'string' && PATTERN.test(m.topic) && (ctx.topics.size < 32 || ctx.topics.has(m.topic))) {
          ctx.topics.add(m.topic);
          if (matches(m.topic, 'shell:windows')) queueWindows();
        }
        break;
      case 'hotspot': {
        // Overlays can't be clicked (they would block the desktop). Instead an overlay may ask for one
        // small clickable spot, e.g. over a pet. A click on it is sent to that overlay as "shell:poke".
        if (apps.get(ctx.appId)?.type !== 'overlay') return;
        setHotspot(ctx, m.rect);
        break;
      }
      case 'modal': {
        if (!mayModal(apps.get(ctx.appId))) return;
        setModal(ctx, m.on === true);
        break;
      }
      case 'emit': {
        if (typeof m.topic !== 'string' || !TOPIC.test(m.topic)) return;
        let data = null;
        try {
          const s = JSON.stringify(m.data ?? null);
          if (s.length > (CFG.maxPayload || 4096)) return;
          data = JSON.parse(s);
        } catch { return; }
        broadcast(ctx.appId + ':' + m.topic, data, ctx.appId);
        playRound(ctx.appId, m.topic);
        break;
      }
      case 'call': {
        const fn = methods[m.method];
        if (!fn) { reply({ kind: 'reply', id: m.id, error: 'unknown method ' + m.method }); return; }
        try {
          const result = fn(ctx, ...(Array.isArray(m.args) ? m.args : []));
          reply({ kind: 'reply', id: m.id, result: result === undefined ? null : JSON.parse(JSON.stringify(result)) });
        } catch (err) {
          reply({ kind: 'reply', id: m.id, error: String(err && err.message || err) });
        }
        break;
      }
    }
  });

  /* ---------------- counting game plays, without names or IDs ---------------- */
  // To see which games are used, the shell (never a game) sends one small count when a game stops being played
  // (back to the games, closed, or the tab hidden): which game, the seconds it was on screen and the rounds finished
  // (counter/README.md). No cookie, no ID, nothing
  // kept on the device for it. Only on kidvo.eu itself, and never for browsers that ask not to be tracked.
  const COUNT = CFG.count || {};
  const counting = !!COUNT.url && location.hostname === COUNT.host && typeof navigator.sendBeacon === 'function' &&
    navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1' && window.doNotTrack !== '1';
  const plays = new Map(); // winId -> { appId, fresh, ms, since, rounds, lastRound }
  const ROUND_END = new Set(['done', 'solved']); // a finished round, as for Vo (apps/pet/bricks.js)

  function playStart(rec) {
    if (counting) plays.set(rec.id, { appId: rec.appId, fresh: true, ms: 0, since: null, rounds: 0, lastRound: -Infinity });
    playTick();
  }
  // The clock runs while the game is on screen: its window open (not waiting behind its card) and the tab visible.
  function playTick() {
    const now = performance.now(), shown = document.visibilityState === 'visible';
    for (const [id, p] of plays) {
      const on = shown && wins.has(id) && !wins.get(id).minimized;
      if (on && p.since === null) p.since = now;
      else if (!on && p.since !== null) { p.ms += now - p.since; p.since = null; }
    }
  }
  function playRound(appId, topic) {
    if (!ROUND_END.has(topic)) return;
    const now = performance.now();
    for (const p of plays.values()) if (p.appId === appId && now - p.lastRound > 1500) { p.rounds++; p.lastRound = now; }
  }
  // Sends what this stretch of play added up to, and starts the next stretch from zero.
  function playSend(id) {
    const p = plays.get(id);
    if (!p) return;
    playTick();
    const now = performance.now();
    const ms = p.ms + (p.since === null ? 0 : now - p.since);
    if (p.fresh || ms >= 1000 || p.rounds) {
      const q = `g=${encodeURIComponent(p.appId)}&s=${Math.round(ms / 1000)}&r=${p.rounds}&n=${p.fresh ? 1 : 0}`;
      try { navigator.sendBeacon(`${COUNT.url}?${q}`); } catch { /* not counted, and nothing else happens */ }
    }
    Object.assign(p, { fresh: false, ms: 0, rounds: 0, since: p.since === null ? null : now });
  }
  // A hidden tab may never come back (phones close them silently), so each stretch is sent when the page hides.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') for (const id of plays.keys()) playSend(id);
    playTick();
  });
  window.addEventListener('pagehide', () => { for (const id of plays.keys()) playSend(id); });

  /* ---------------- deep links: #maze.map opens those apps ---------------- */
  let syncing = false;
  function syncHash() {
    if (syncing) return;
    const ids = [...new Set([...wins.values()].filter(r => r.appId).map(r => r.appId))];
    try { history.replaceState(null, '', ids.length ? '#' + ids.join('.') : location.pathname + location.search); } catch { /* sandboxed */ }
  }
  function openFromHash() {
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed link like #%: open nothing */ }
    const ids = hash.split('.').filter(id => apps.has(id));
    syncing = true;
    ids.forEach(openApp);
    syncing = false;
    return ids.length > 0;
  }

  /* ---------------- clock ---------------- */
  const clock = $('#clock');
  const tick = () => {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = d.toISOString();
  };
  tick();
  setInterval(tick, 15000);

  /* ---------------- switching language ---------------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = T(n.dataset.i18n); });
    const box = $('#lang');
    box.replaceChildren(...LANGS.map(l => el('button', {
      type: 'button', class: 'lang-btn', lang: l, title: I18N.languages[l],
      'aria-pressed': l === lang ? 'true' : 'false',
      onclick: () => setLang(l)
    }, l.toUpperCase())));
    box.setAttribute('aria-label', T('language'));
    renderViews();
  }

  function setLang(l, initial = false) {
    if (!LANGS.includes(l)) l = 'en';
    lang = l;
    prefs.set('lang', l);
    applyStatic();
    if (initial) return;
    renderIcons();
    renderStartMenu();
    renderTray();
    renderPlay();
    const prevFocus = focusedId;
    const replaced = new Map();
    for (const rec of [...wins.values()]) {
      const btns = rec.node.querySelectorAll('.win-bar button');
      btns.forEach(b => { const k = { back: 'backToGames', info: 'aboutApp', min: 'minimize', max: 'maximize', close: 'close' }[b.dataset.act]; b.title = T(k); b.setAttribute('aria-label', T(k)); });
      if (rec.appId) {
        const name = appText(apps.get(rec.appId), 'name');
        rec.node.querySelector('.win-title').textContent = name;
        const by = rec.node.querySelector('.win-by');
        if (by) by.textContent = T('byAuthor', { name: apps.get(rec.appId).author.name });
        rec.task.querySelector('span').textContent = name;
      } else if (rec.reopen) {
        // Built-in windows are simply rebuilt in the new language, in the same place.
        const { left, top, width, height, zIndex } = rec.node.style;
        closeWindow(rec.id);
        rec.reopen();
        const fresh = [...wins.values()].pop();
        if (fresh) {
          Object.assign(fresh.node.style, { left, top, width, height, zIndex });
          replaced.set(rec.id, fresh.id);
        }
      }
    }
    // Keep whatever the player was looking at in front.
    const keep = replaced.get(prevFocus) || prevFocus;
    if (wins.has(keep)) focus(keep);
    // Every app hears about the change, whether or not it subscribed.
    for (const win of frames.keys()) { try { win.postMessage({ kidvo: 1, kind: 'lang', lang }, '*'); } catch { /* gone */ } }
  }

  /* ---------------- boot ---------------- */
  const browserLang = (navigator.languages || [navigator.language || 'en']).map(x => String(x).slice(0, 2).toLowerCase()).find(x => LANGS.includes(x));
  document.body.dataset.view = view;
  setLang(prefs.get('lang') || browserLang || 'en', true);
  if (!REGISTRY.length) {
    toast('kidvo', T('noApps'));
  }
  sizeAbove();
  renderSky();
  renderPlay();
  renderIcons();
  renderStartMenu();
  for (const app of apps.values()) {
    if (app.type === 'overlay' && app.autostart && prefs.get('overlay:' + app.id) !== 'off') startOverlay(app);
  }
  renderTray();
  const opened = openFromHash();
  // The games page welcomes by itself; the desktop opens hello.txt the first time.
  if (!opened && !playing() && !prefs.get('welcomed')) {
    openAbout();
    prefs.set('welcomed', true);
  }

  // A small, read-only handle for tests and curious people in the console.
  window.kidvoShell = Object.freeze({ openApp, closeWindow, setLang, setView, view: () => view, apps: () => [...apps.keys()], windows: windowRects });
})();
