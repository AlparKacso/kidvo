// kidvo's automated half of rule 1 ("do no harm").
//   npm run check                  checks every app
//   BASE_SHA=<sha> npm run check   also checks which files a pull request touches
// In CI, ALLOW_CORE=true (set when a maintainer adds the "core" label) permits
// changes outside an app folder.
// A pull request runs its own copy of this file and of checks.yml, so a green result says nothing
// about a PR that changes anything outside apps/<id>/: review those files line by line.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { ROOT, appIds, checkApp } from './lib.mjs';

const errors = [];
const warnings = [];
const notes = [];
const ids = await appIds();
const manifests = new Map();

for (const id of ids) {
  const r = await checkApp(id, ids);
  manifests.set(id, r.manifest);
  for (const e of r.errors) errors.push(`apps/${id}: ${e}`);
  for (const w of r.warnings) warnings.push(`apps/${id}: ${w}`);
  notes.push(`apps/${id}: ${(r.bytes / 1024).toFixed(1)} KB, languages: ${(r.manifest?.languages || []).join(', ')}, by "${r.manifest?.author?.name ?? '?'}"`);
}

const base = process.env.BASE_SHA;
if (base) {
  const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  // --no-renames: a rename is a deletion plus an addition, so both paths are judged. With renames on,
  // apps/x/notes.txt -> .github/workflows/evil.yml looked like an app change.
  const out = git('diff', '--name-status', '--no-renames', '-z', `${base}...HEAD`).split('\0');
  const changed = [];
  for (let i = 0; i + 1 < out.length; i += 2) changed.push({ status: out[i][0], path: out[i + 1] });
  const inApp = /^apps\/([^/]+)\//;
  const core = changed.filter(c => !inApp.test(c.path));
  const touchedApps = new Set(changed.filter(c => inApp.test(c.path)).map(c => inApp.exec(c.path)[1]));
  const allowCore = process.env.ALLOW_CORE === 'true';

  if (core.length && !allowCore) {
    errors.push(
      `This pull request changes files outside an app folder (apps/<id>/): ${core.map(c => c.path).join(', ')}. ` +
      'App PRs may only touch their own folder. If this is a deliberate change to the desktop itself, ' +
      'say so in the PR and a maintainer will add the "core" label.'
    );
  }
  for (const c of changed) {
    if (c.status === 'D' && c.path.endsWith('/manifest.json') && !allowCore) {
      errors.push(`${c.path} is deleted. Removing someone else's app needs the "core" label.`);
    }
  }
  for (const id of touchedApps) {
    let existed = false;
    try { git('cat-file', '-e', `${base}:apps/${id}/manifest.json`); existed = true; } catch { existed = false; }
    if (existed) warnings.push(`apps/${id}: this PR changes an existing app. The curator checks that it extends rather than replaces, and credits the original author.`);
    else notes.push(`apps/${id}: new app`);
  }
  // Names are free text shown to children, so every touched app's credit is put in front of the reviewer.
  for (const id of touchedApps) {
    const a = manifests.get(id)?.author;
    if (a) warnings.push(`apps/${id}: credited on the game window as "${a.name}"${a.url ? ` (links to ${a.url})` : ''}. Check that the name and link are suitable for children.`);
  }
  if (touchedApps.size > 1) warnings.push(`This PR touches ${touchedApps.size} apps (${[...touchedApps].join(', ')}). One app per PR is easier to review.`);
}

const md = [
  '## kidvo checks',
  errors.length ? `### ❌ ${errors.length} problem(s)\n${errors.map(e => `- ${e}`).join('\n')}` : '### ✅ All automatic checks passed',
  warnings.length ? `### ⚠️ For the reviewer\n${warnings.map(w => `- ${w}`).join('\n')}` : '',
  `### Apps\n${notes.map(n => `- ${n}`).join('\n')}`,
  '_Rule 1 is partly checked by machines. Rules 2 and 3 are checked by a human curator._'
].filter(Boolean).join('\n\n');

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
process.exit(errors.length ? 1 : 0);
