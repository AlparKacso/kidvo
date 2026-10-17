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

    const rec = { id, appId, title, icon, node, frame, minimized: false, task: null };
    wins.set(id, rec);
    winLayer.append(node);

    bar.addEventListener('click', e => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'close') closeWindow(id);
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
    rec.minimized = false;
    rec.node.hidden = false;
    rec.task.classList.remove('min');
    focus(id);
  }

  function toggleMax(id) {
    const rec = wins.get(id);
    if (!rec || narrow()) return;
    rec.node.classList.toggle('max');
    queueWindows();
  }

  function closeWindow(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (rec.frame) frames.delete(rec.frame.contentWindow);
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
      if (e.button !== 0 || e.target.closest('button') || narrow() || rec.node.classList.contains('max')) return;
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
      ovLayer.append(spot);
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
    ovLayer.classList.toggle('modal', [...overlays.values()].some(o => o.frame.classList.contains('modal')));
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
        <p class="lede">${t('buildWinLede')}</p>
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
      desktop.classList.toggle('sheet-open', narrow() && [...wins.values()].some(r => !r.minimized));
      broadcast('shell:windows', { windows: windowRects(), width: desktop.clientWidth, height: desktop.clientHeight }, 'shell');
    });
  }
  window.addEventListener('resize', queueWindows);

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
    const prevFocus = focusedId;
    const replaced = new Map();
    for (const rec of [...wins.values()]) {
      const btns = rec.node.querySelectorAll('.win-btns button');
      btns.forEach(b => { const k = { info: 'aboutApp', min: 'minimize', max: 'maximize', close: 'close' }[b.dataset.act]; b.title = T(k); b.setAttribute('aria-label', T(k)); });
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
  setLang(prefs.get('lang') || browserLang || 'en', true);
  if (!REGISTRY.length) {
    toast('kidvo', T('noApps'));
  }
  renderIcons();
  renderStartMenu();
  for (const app of apps.values()) {
    if (app.type === 'overlay' && app.autostart && prefs.get('overlay:' + app.id) !== 'off') startOverlay(app);
  }
  renderTray();
  const opened = openFromHash();
  if (!opened && !prefs.get('welcomed')) {
    openAbout();
    prefs.set('welcomed', true);
  }

  // A small, read-only handle for tests and curious people in the console.
  window.kidvoShell = Object.freeze({ openApp, closeWindow, setLang, apps: () => [...apps.keys()], windows: windowRects });
})();
