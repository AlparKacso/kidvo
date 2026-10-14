// Smoke test: boots the desktop in real browsers, opens every app, and fails on
// any JavaScript error. This is the "doesn't break existing functionality" check.
//   npm run build && npm run smoke
// Runs in Chromium and WebKit (Safari's engine). SMOKE_BROWSERS=chromium runs one.
// First run: npx playwright install chromium webkit
import { chromium, webkit } from 'playwright';
import { readFile } from 'node:fs/promises';
import { serve } from '../scripts/serve.mjs';

const registry = JSON.parse(await readFile(new URL('../apps/registry.json', import.meta.url), 'utf8'));
const windowApps = registry.filter(a => a.type === 'window');
const server = await serve(0);
const port = server.address().port;
const problems = [];
const ENGINES = { chromium, webkit };
const wanted = (process.env.SMOKE_BROWSERS || 'chromium,webkit').split(',').map(s => s.trim()).filter(Boolean);

// An app only counts as started once its SDK ran and the desktop answered its hello.
// Static HTML alone (e.g. a game's arrow buttons) is not enough: when Safari's CSP
// blocked every game script, the old text-only check still passed.
const handshake = frame => frame.evaluate(() => new Promise((resolve, reject) => {
  if (!window.kidvo) return reject(new Error('the kidvo SDK did not run (blocked script or CSP?)'));
  setTimeout(() => reject(new Error('the desktop never answered hello')), 3000);
  window.kidvo.ready(() => resolve(true));
}));
const appFrame = (page, id) => page.frames().find(f => f.url().endsWith(`/apps/${id}/index.html`));

async function run(name) {
  const engine = ENGINES[name];
  if (!engine) { problems.push(`unknown browser "${name}"`); return; }
  let browser;
  try {
    browser = await engine.launch(name === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  } catch (err) {
    problems.push(`${name}: cannot start (${err.message.split('\n')[0]}). Run: npx playwright install ${name}`);
    return;
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', err => problems.push(`${name} page error: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(`${name} console error: ${msg.text()}`);
  });

  const step = async (label, fn) => {
    try { await fn(); console.log(`ok   [${name}] ${label}`); }
    catch (err) { problems.push(`[${name}] ${label}: ${err.message}`); console.log(`FAIL [${name}] ${label}`); }
  };

  await step('desktop boots', async () => {
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => window.kidvoShell && document.querySelectorAll('#icons .icon').length > 0, null, { timeout: 5000 });
  });

  await step(`desktop shows ${windowApps.length} icon(s)`, async () => {
    const n = await page.locator('#icons .icon').count();
    if (n !== windowApps.length) throw new Error(`expected ${windowApps.length} icons, found ${n}`);
  });

  for (const app of windowApps) {
    await step(`opens ${app.id}`, async () => {
      await page.evaluate(id => window.kidvoShell.openApp(id), app.id);
      const frame = page.frameLocator(`iframe[src^="apps/${app.id}/"]`);
      await frame.locator('body').waitFor({ timeout: 5000 });
      await page.waitForTimeout(600);
      const f = appFrame(page, app.id);
      if (!f) throw new Error('game frame not found');
      await handshake(f);
      const text = await frame.locator('body').innerText();
      const hasCanvas = await frame.locator('canvas').count();
      if (!text.trim() && !hasCanvas) throw new Error('app rendered nothing');
    });
  }

  for (const app of registry.filter(a => a.type === 'overlay')) {
    await step(`overlay ${app.id} runs`, async () => {
      await page.evaluate(id => window.kidvoShell.openApp(id), app.id);
      await page.locator(`#overlays iframe[src^="apps/${app.id}/"]`).waitFor({ state: 'attached', timeout: 5000 });
      await page.waitForTimeout(300);
      const f = appFrame(page, app.id);
      if (!f) throw new Error('overlay frame not found');
      await handshake(f);
    });
  }

  await step('bus delivers events between apps', async () => {
    // Every window app gets the same message; we only check that the desktop survives the traffic.
    const count = await page.evaluate(() => window.kidvoShell.windows().length);
    if (count < windowApps.length) throw new Error(`only ${count} windows are open`);
  });

  await step('shell still responds after opening everything', async () => {
    await page.click('#start-btn');
    await page.locator('#start-menu').waitFor({ state: 'visible', timeout: 2000 });
    await page.keyboard.press('Escape');
  });

  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT.replace(/(\.\w+)?$/, `-${name}$1`) });

  // Phones: every game must fit a 360 px wide screen without sideways scrolling.
  for (const [label, viewport] of [['phone', { width: 360, height: 640 }], ['phone landscape', { width: 740, height: 360 }]]) {
    const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const phone = await ctx.newPage();
    phone.on('pageerror', err => problems.push(`${name} ${label} page error: ${err.message}`));
    await phone.goto(`http://localhost:${port}/`);
    await phone.waitForFunction(() => window.kidvoShell, null, { timeout: 5000 });
    for (const app of windowApps) {
      await step(`${app.id} fits a ${label} screen`, async () => {
        await phone.evaluate(id => window.kidvoShell.openApp(id), app.id);
        await phone.waitForTimeout(700);
        const frame = appFrame(phone, app.id);
        if (!frame) throw new Error('game did not load');
        const over = await frame.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (over > 1) throw new Error(`the game is ${over}px wider than the screen`);
        const box = await phone.locator(`iframe[src^="apps/${app.id}/"]`).boundingBox();
        if (!box || box.width < viewport.width - 4) throw new Error('the game window does not fill the screen');
        await phone.evaluate(() => document.querySelectorAll('.win').forEach(w => w.querySelector('[data-act="close"]').click()));
      });
    }
    await ctx.close();
  }

  await browser.close();
}

for (const name of wanted) await run(name);
server.close();

if (problems.length) {
  console.error('\nSmoke test failed:\n' + problems.map(p => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nSmoke test passed.');
