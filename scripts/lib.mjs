// Shared rules for kidvo apps. Used by check.mjs (CI) and build-registry.mjs.
import { readdir, readFile, stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const APPS_DIR = join(ROOT, 'apps');

// Every HTML file inside an app must carry this exact policy. It blocks calls to
// other sites, trackers and form posts, so an app can only ever touch its own files.
export const APP_CSP =
  "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; " +
  "form-action 'none'; base-uri 'none'";

export const LIMITS = {
  windowBytes: 300 * 1024,
  overlayBytes: 150 * 1024,
  files: 60
};

export const ALLOWED_EXT = new Set([
  '.html', '.js', '.mjs', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.mp3', '.ogg', '.wav', '.woff2', '.txt', '.md'
]);
export const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.md']);
export const RESERVED_IDS = new Set(['shell', 'about', 'contribute', 'registry', 'kidvo', 'apps', 'templates']);
// Languages a game may offer. The desktop shows the ones it has texts for (shell/i18n.js).
export const LANGUAGES = ['en', 'hu', 'ro', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'ga', 'hr', 'it', 'lt', 'lv', 'mt', 'nl', 'pl', 'pt', 'sk', 'sl', 'sv', 'uk'];
// Age bands: explorers are 7-9, investigators are 10-13.
export const BANDS = ['explorers', 'investigators'];
// AI-literacy skills a learning app can teach. Draft list; the kidvo charter will settle it.
export const SKILLS = [
  'ai-can-be-wrong',        // AI answers can be wrong, even when they sound sure. Check them.
  'when-to-ask',            // decide when to think yourself and when asking AI is worth it
  'ask-better-questions',   // how you ask changes what you get
  'keep-secrets',           // don't share personal information with AI
  'spot-ai-made',           // tell AI-made text, pictures or sounds from human-made ones
  'ai-learns-from-examples',// AI learns patterns, and biased examples make biased AI
  'your-idea-matters'       // use AI for help while keeping ownership of your ideas
];
// Shell files an app may load from its folder.
export const SHELL_FILES = ['../../shell/sdk.js', '../../shell/ask-ai.js'];

// Hard failures: things that leak data, open side doors or hijack the page.
export const FORBIDDEN = [
  [/\bRTCPeerConnection\b/, 'WebRTC is not allowed (it can bypass the content policy).'],
  [/\bWebSocket\b/, 'WebSockets are not allowed. kidvo apps never talk to servers.'],
  [/\bsendBeacon\b/, 'navigator.sendBeacon is not allowed.'],
  [/\bimportScripts\b/, 'importScripts is not allowed.'],
  [/document\.cookie/, 'Cookies are not allowed.'],
  [/\b(window\.)?top\.location\b|\bparent\.location\b/, 'Apps may not navigate the desktop.'],
  [/http-equiv=["']?refresh/i, 'Meta refresh redirects are not allowed.'],
  [/\bserviceWorker\b/, 'Service workers are not allowed.'],
  [/\bRequestFileSystem\b|\bwebkitRequestFileSystem\b/, 'File system APIs are not allowed.']
];
// Soft warnings: allowed, but the reviewer looks twice.
export const WARN = [
  [/\beval\s*\(|new\s+Function\s*\(/, 'Uses eval/new Function. Fine for a calculator, suspicious elsewhere.'],
  [/\bsetInterval\s*\([^,]+,\s*[0-9]\s*\)/, 'Very fast setInterval. Prefer requestAnimationFrame.'],
  [/\bWorker\s*\(/, 'Starts a Web Worker. Make sure it is not mining anything.']
];

const URL_RE = /(?:https?|wss?|ftp):\/\/[^\s"'`)<>\\]+/gi;
const PROTO_REL_RE = /["'`(=]\s*\/\/[a-z0-9-]+\.[a-z]{2,}/gi;
const URL_ALLOW = [/^https?:\/\/www\.w3\.org\//i];

export function findUrls(text) {
  const found = [...(text.match(URL_RE) || []), ...(text.match(PROTO_REL_RE) || []).map(s => s.replace(/^["'`(=]\s*/, ''))];
  return found.filter(u => !URL_ALLOW.some(re => re.test(u)));
}

export async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(p));
    else out.push(p);
  }
  return out;
}

export async function appIds() {
  const entries = await readdir(APPS_DIR, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
}

const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const isStr = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;

// Returns { manifest, errors[] } for one app folder.
export async function readManifest(id) {
  const errors = [];
  let m;
  try {
    m = JSON.parse(await readFile(join(APPS_DIR, id, 'manifest.json'), 'utf8'));
  } catch (err) {
    return { manifest: null, errors: [`manifest.json is missing or not valid JSON (${err.message}).`] };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 32) errors.push('Folder name must be kebab-case, at most 32 characters (e.g. "pixel-garden").');
  if (RESERVED_IDS.has(id)) errors.push(`"${id}" is a reserved name.`);
  if (m.id !== id) errors.push(`manifest.id ("${m.id}") must match the folder name ("${id}").`);
  if (!isStr(m.name, 1, 32)) errors.push('name: 1 to 32 characters.');
  if (!isStr(m.description, 10, 160)) errors.push('description: 10 to 160 characters.');
  if (!m.author || !isStr(m.author.name, 1, 60)) errors.push('author.name: 1 to 60 characters.');
  if (m.author) for (const k of Object.keys(m.author)) if (!['name', 'url'].includes(k)) errors.push(`Unknown author field "${k}".`);
  if (!['window', 'overlay'].includes(m.type)) errors.push('type must be "window" or "overlay".');
  if (m.type === 'window') {
    const w = m.window || {};
    if (w.width !== undefined && !(w.width >= 200 && w.width <= 1200)) errors.push('window.width: 200 to 1200.');
    if (w.height !== undefined && !(w.height >= 150 && w.height <= 900)) errors.push('window.height: 150 to 900.');
  }
  if (m.autostart !== undefined && (m.type !== 'overlay' || typeof m.autostart !== 'boolean')) errors.push('autostart is only for overlay apps, and must be true or false.');
  if (m.color !== undefined && !isHex(m.color)) errors.push('color must look like "#a1b2c3".');
  if (!isStr(m.icon, 1, 64) || !/\.(svg|png)$/i.test(m.icon)) errors.push('icon must point to an .svg or .png file in your folder.');
  if (m.entry !== undefined && !/^[a-z0-9._-]+\.html$/i.test(m.entry)) errors.push('entry must be an .html file name in your folder.');
  if (m.tags !== undefined && !(Array.isArray(m.tags) && m.tags.length <= 5 && m.tags.every(t => isStr(t, 1, 16)))) errors.push('tags: up to 5 short strings.');
  if (m.added !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(m.added)) errors.push('added must be a date like 2026-10-03.');
  if (m.extends !== undefined && !(Array.isArray(m.extends) && m.extends.every(x => typeof x === 'string'))) errors.push('extends must be a list of app ids.');
  if (m.bands !== undefined && !(Array.isArray(m.bands) && m.bands.length && m.bands.every(b => BANDS.includes(b)))) errors.push(`bands must list one or both of: ${BANDS.join(', ')}.`);
  if (m.skills !== undefined && !(Array.isArray(m.skills) && m.skills.length && m.skills.length <= 3 && m.skills.every(s => SKILLS.includes(s)))) errors.push(`skills: 1 to 3 of ${SKILLS.join(', ')}.`);
  if (!Array.isArray(m.languages) || !m.languages.includes('en') || !m.languages.every(l => LANGUAGES.includes(l))) errors.push(`languages must list "en" plus any of: ${LANGUAGES.join(', ')}.`);
  for (const l of (m.languages || []).filter(l => l !== 'en')) {
    const tr = m.translations?.[l];
    if (!tr || !isStr(tr.name, 1, 32) || !isStr(tr.description, 10, 200)) errors.push(`translations.${l} needs a name (up to 32 characters) and a description.`);
  }
  for (const l of Object.keys(m.translations || {})) if (!(m.languages || []).includes(l)) errors.push(`translations.${l} is there, but "${l}" is not in languages.`);
  if (m.bands && !m.skills) errors.push('A learning app (with bands) must name the skills it teaches.');
  const known = new Set(['id', 'name', 'description', 'author', 'type', 'window', 'autostart', 'color', 'icon', 'entry', 'tags', 'added', 'extends', 'bands', 'skills', 'languages', 'translations']);
  for (const k of Object.keys(m)) if (!known.has(k)) errors.push(`Unknown manifest field "${k}".`);
  return { manifest: m, errors };
}

// Full check of one app folder. Returns { errors[], warnings[], bytes }.
export async function checkApp(id, allIds) {
  const dir = join(APPS_DIR, id);
  const { manifest: m, errors } = await readManifest(id);
  const warnings = [];
  const files = await listFiles(dir);
  let bytes = 0;

  if (files.length > LIMITS.files) errors.push(`Too many files (${files.length}). Keep it under ${LIMITS.files}.`);
  const entry = m?.entry || 'index.html';
  if (!files.some(f => relative(dir, f) === entry)) errors.push(`Missing ${entry}.`);
  if (m?.icon && !files.some(f => relative(dir, f) === m.icon)) errors.push(`Icon file "${m.icon}" not found.`);
  if (m?.extends) for (const x of m.extends) if (!allIds.includes(x)) errors.push(`extends: no app called "${x}".`);

  for (const f of files) {
    const rel = relative(dir, f);
    const ext = extname(f).toLowerCase();
    bytes += (await stat(f)).size;
    if (!ALLOWED_EXT.has(ext)) { errors.push(`${rel}: file type ${ext || '(none)'} is not allowed.`); continue; }
    if (rel.split('/').some(part => part.startsWith('.'))) errors.push(`${rel}: hidden files are not allowed.`);
    if (!TEXT_EXT.has(ext)) continue;

    let text = await readFile(f, 'utf8');
    if (rel === 'manifest.json') {
      try { const j = JSON.parse(text); if (j.author) delete j.author.url; text = JSON.stringify(j); } catch { /* reported above */ }
    }
    for (const u of findUrls(text)) errors.push(`${rel}: links to the outside world are not allowed (${u.slice(0, 60)}). Bundle what you need inside your folder.`);
    for (const [re, msg] of FORBIDDEN) if (re.test(text)) errors.push(`${rel}: ${msg}`);
    for (const [re, msg] of WARN) if (re.test(text)) warnings.push(`${rel}: ${msg}`);
    if (SHELL_FILES.reduce((t, f) => t.replaceAll(f, ''), text).includes('../')) {
      errors.push(`${rel}: only your own folder and ${SHELL_FILES.join(', ')} may be referenced.`);
    }
    if (ext === '.html') {
      const meta = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/i.exec(text);
      if (!meta) errors.push(`${rel}: missing the kidvo Content-Security-Policy <meta> tag (copy it from templates/app/index.html).`);
      else if (meta[1].trim() !== APP_CSP) errors.push(`${rel}: the Content-Security-Policy must be exactly the one in templates/app/index.html.`);
      else if (text.indexOf(meta[0]) > text.search(/<script|<link|<style/i)) errors.push(`${rel}: put the Content-Security-Policy <meta> before any script, style or link tag.`);
    }
  }
  // Texts: lang/<code>.js for every declared language, all with the same keys as English.
  const rels = files.map(f => relative(dir, f));
  if (m?.languages && rels.some(r => r.startsWith('lang/'))) {
    const keysOf = async code => {
      let captured = null;
      try {
        runInNewContext(await readFile(join(dir, 'lang', code + '.js'), 'utf8'), { kidvoStrings: (c, o) => { captured = o; } }, { timeout: 1000 });
      } catch (err) { errors.push(`lang/${code}.js could not be read (${err.message}).`); return null; }
      if (!captured) { errors.push(`lang/${code}.js must call kidvoStrings('${code}', { ... }).`); return null; }
      return new Set(Object.keys(captured));
    };
    const base = (s => s && new Set([...s].map(k => k.replace(/_(zero|one|two|few|many|other)$/, ''))))(await keysOf('en'));
    for (const l of m.languages) {
      if (!rels.includes(`lang/${l}.js`)) { errors.push(`Missing lang/${l}.js (it is listed in languages).`); continue; }
      if (l === 'en' || !base) continue;
      const keys = await keysOf(l);
      if (!keys) continue;
      const stems = new Set([...keys].map(k => k.replace(/_(zero|one|two|few|many|other)$/, '')));
      const missing = [...base].filter(k => !stems.has(k));
      const extra = [...stems].filter(k => !base.has(k));
      if (missing.length) errors.push(`lang/${l}.js is missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
      if (extra.length) warnings.push(`lang/${l}.js has keys English does not: ${extra.slice(0, 8).join(', ')}`);
    }
  }
  // Learning games ship a printable guide for parents and teachers in every language they offer.
  if (m?.bands) for (const l of m.languages || ['en']) {
    if (!rels.includes(`parents/${l}.html`)) errors.push(`Missing parents/${l}.html, the parents' guide in "${l}".`);
  }

  const limit = m?.type === 'overlay' ? LIMITS.overlayBytes : LIMITS.windowBytes;
  if (bytes > limit) errors.push(`Folder is ${(bytes / 1024).toFixed(0)} KB. The limit is ${limit / 1024} KB.`);
  return { manifest: m, errors, warnings, bytes };
}
