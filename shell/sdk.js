/* kidvo SDK — include it in your app with:
 *   <script src="../../shell/sdk.js"></script>
 *
 * It gives you window.kidvo:
 *   kidvo.ready(fn)            fn({ appId, winId }) once the desktop said hello
 *   kidvo.emit(topic, data)    tell everyone something happened (topic becomes "<your-app-id>:<topic>")
 *   kidvo.on(pattern, fn)      listen: "maze:solved", "maze:*", "shell:windows" or "*"
 *   kidvo.open(appId)          open another app
 *   kidvo.notify(text)         show a small toast on the desktop
 *   kidvo.setTitle(text)       change your window title
 *   kidvo.windows()            list open windows with their positions
 *   kidvo.apps()               list installed apps
 *   kidvo.lang                 the language the player chose: "en", "hu", "ro", ...
 *   kidvo.onLang(fn)           fn(lang) now and whenever the player switches language
 *   kidvo.t(key, vars)         your text in the current language, e.g. kidvo.t('steps', { n: 3 })
 *                              (falls back to English; keys ending in _one/_few/_other are plural forms)
 *   kidvo.store.get/set/remove small per-app storage kept in the visitor's browser
 *   kidvo.setHotspot(rect)     overlays only: one clickable spot {x, y, w, h} (max 140x140); clicks arrive as "shell:poke"
 *   kidvo.standalone           true when your page is opened outside the desktop
 *
 * Texts live in lang/<code>.js files in your folder, loaded after this script:
 *   kidvoStrings('en', { hello: 'Hello {name}!', steps_one: '{n} step', steps_other: '{n} steps' });
 *
 * All calls return Promises. Everything works (quietly) when opened standalone,
 * so you can develop your app by opening its index.html directly.
 */
(() => {
  'use strict';
  const standalone = window.parent === window;
  const listeners = new Map();
  const pending = new Map();
  const readyFns = [];
  let info = null;
  let nextId = 0;

  /* ---------- language ---------- */
  const dictionaries = {};
  const langFns = new Set();
  const fromUrl = new URLSearchParams(location.search).get('lang');
  let lang = (fromUrl || (navigator.language || 'en')).slice(0, 2).toLowerCase();
  window.kidvoStrings = (code, strings) => { dictionaries[code] = Object.assign(dictionaries[code] || {}, strings); };
  function pick(code, key, vars) {
    const dict = dictionaries[code];
    if (!dict) return undefined;
    if (typeof vars.n === 'number') {
      let cat = 'other';
      try { cat = new Intl.PluralRules(code).select(vars.n); } catch { /* old browser */ }
      if (dict[key + '_' + cat] != null) return dict[key + '_' + cat];
      if (dict[key + '_other'] != null) return dict[key + '_other'];
    }
    return dict[key];
  }
  function t(key, vars = {}) {
    const text = pick(lang, key, vars) ?? pick('en', key, vars) ?? key;
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  }
  function setLang(code) {
    if (!code || code === lang) return;
    lang = code;
    document.documentElement.lang = code;
    for (const fn of langFns) { try { fn(lang); } catch (err) { console.error('[kidvo]', err); } }
  }

  const post = msg => { if (!standalone) window.parent.postMessage(Object.assign({ kidvo: 1 }, msg), '*'); };
  const matches = (p, t) => p === '*' || p === t || (p.endsWith(':*') && t.startsWith(p.slice(0, -1)));

  window.addEventListener('message', e => {
    if (e.source !== window.parent) return;
    const m = e.data;
    if (!m || m.kidvo !== 1) return;
    if (m.kind === 'init') {
      info = { appId: m.appId, winId: m.winId };
      setLang(m.lang);
      readyFns.splice(0).forEach(fn => fn(info));
    } else if (m.kind === 'lang') {
      setLang(m.lang);
    } else if (m.kind === 'event') {
      for (const [pattern, fns] of listeners) {
        if (!matches(pattern, m.topic)) continue;
        for (const fn of fns) {
          try { fn(m.data, { topic: m.topic, from: m.from }); } catch (err) { console.error('[kidvo]', err); }
        }
      }
    } else if (m.kind === 'reply') {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
    }
  });

  const call = (method, ...args) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    post({ kind: 'call', id, method, args });
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error('kidvo: the desktop did not answer ' + method));
    }, 5000);
  });

  const mem = {};
  const kidvo = {
    standalone,
    ready(fn) { if (standalone) fn({ appId: null, winId: null }); else if (info) fn(info); else readyFns.push(fn); },
    emit(topic, data) { post({ kind: 'emit', topic: String(topic), data }); },
    on(pattern, fn) {
      if (!listeners.has(pattern)) { listeners.set(pattern, new Set()); post({ kind: 'sub', topic: pattern }); }
      listeners.get(pattern).add(fn);
      return () => listeners.get(pattern)?.delete(fn);
    },
    open: id => (standalone ? Promise.resolve(false) : call('open', id)),
    notify: text => (standalone ? Promise.resolve(false) : call('notify', String(text))),
    setTitle: text => (standalone ? Promise.resolve(false) : call('setTitle', String(text))),
    windows: () => (standalone ? Promise.resolve([]) : call('windows')),
    apps: () => (standalone ? Promise.resolve([]) : call('apps')),
    get lang() { return lang; },
    setHotspot(rect) { post({ kind: 'hotspot', rect: rect || null }); },
    onLang(fn) { langFns.add(fn); try { fn(lang); } catch (err) { console.error('[kidvo]', err); } return () => langFns.delete(fn); },
    t,
    store: standalone
      ? {
          get: async k => (k in mem ? mem[k] : null),
          set: async (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); return true; },
          remove: async k => { delete mem[k]; return true; }
        }
      : {
          get: k => call('store.get', k),
          set: (k, v) => call('store.set', k, v),
          remove: k => call('store.remove', k)
        }
  };
  window.kidvo = Object.freeze(kidvo);
  post({ kind: 'hello' });
})();
