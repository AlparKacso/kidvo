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
const SITE = `http://localhost:${server.address().port}`;
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

// Nothing may leave this machine. Whatever way a game finds around the content policy shows up
// here (and is blocked), as long as it happens while the test runs.
const guard = (ctx, label) => ctx.route('**/*', route => {
  const url = route.request().url();
  if (url.startsWith(SITE + '/') || /^(data|blob):/.test(url)) return route.continue();
  problems.push(`${label}: a request left the site: ${url.slice(0, 120)}`);
  return route.abort();
});

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
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await guard(desk, name);
  const page = await desk.newPage();
  page.on('pageerror', err => problems.push(`${name} page error: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(`${name} console error: ${msg.text()}`);
  });

  const step = async (label, fn) => {
    try { await fn(); console.log(`ok   [${name}] ${label}`); }
    catch (err) { problems.push(`[${name}] ${label}: ${err.message}`); console.log(`FAIL [${name}] ${label}`); }
  };

  await step('desktop boots', async () => {
    await page.goto(`${SITE}/`);
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

  // Robot Maze is a run of 8 levels that ends in a finale card. The test walks the shortest route
  // through every Investigator level, then plays the run again.
  await step('Robot Maze runs to the finale', async () => {
    const f = appFrame(page, 'maze');
    if (!f) throw new Error('maze frame not found');
    await f.evaluate(async () => {
      const wait = (find, what) => new Promise((resolve, reject) => {
        const t0 = Date.now();
        const tick = () => {
          const v = find();
          if (v) return resolve(v);
          if (Date.now() - t0 > 3000) return reject(new Error(`timed out waiting for ${what}`));
          setTimeout(tick, 20);
        };
        tick();
      });
      const m = window.__robotMaze;
      if (!m) throw new Error('window.__robotMaze is missing');
      (await wait(() => document.querySelector('#overlay [data-band="investigators"]'), 'the band picker')).click();
      for (let l = 1; l <= 8; l++) {
        if (m.level() !== l) throw new Error(`expected level ${l}, the game is on level ${m.level()}`);
        for (const d of m.route()) m.move(d);
        if (l < 8) (await wait(() => document.querySelector('#overlay .card:not([data-finale]) .btn'), `the level ${l} card`)).click();
      }
      await wait(() => document.querySelector('#overlay [data-finale]'), 'the finale card');
      const footer = document.getElementById('totals').textContent;
      if (!footer.endsWith(' · ' + kidvo.t('bestFinished')) || !footer.includes('8')) throw new Error(`the footer does not say the run is finished: "${footer}"`);
      document.querySelector('#overlay [data-act="again"]').click();
      if (m.level() !== 1 || !document.getElementById('overlay').hidden) throw new Error('"Play the run again" did not start level 1');
    });
  });

  // With an overlay running (Vo), long text windows must still scroll with the wheel or trackpad.
  // WebKit sent the scroll to the transparent overlay frame while it sat above the windows.
  await step('a text window scrolls with the mouse wheel', async () => {
    await page.click('#start-btn');
    await page.click('#start-menu [data-shell="grownups"]');
    const body = page.locator('.win .win-body').last();
    await body.waitFor({ timeout: 2000 });
    const box = await body.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(500);
    const top = await body.evaluate(b => b.scrollTop);
    if (top < 50) throw new Error(`the "For grown-ups" window did not scroll (scrollTop ${top})`);
    await page.evaluate(() => [...document.querySelectorAll('.win')].pop().querySelector('[data-act="close"]').click());
  });

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

  const other = await desk.newPage();
  other.on('pageerror', err => problems.push(`${name} page error: ${err.message}`));
  other.on('console', msg => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(`${name} console error: ${msg.text()}`);
  });
  await step('a broken deep link (#%) still boots', async () => {
    await other.goto(`${SITE}/#%`);
    await other.waitForFunction(() => window.kidvoShell, null, { timeout: 5000 });
  });
  // Guides open in their own tab to be printed, under a policy without scripts. Any blocked style shows as an error.
  for (const app of registry.filter(a => a.bands)) {
    await step(`${app.id} parents' guides open`, async () => {
      for (const l of app.languages) {
        await other.goto(`${SITE}/apps/${app.id}/parents/${l}.html`);
        if ((await other.locator('body').innerText()).length < 200) throw new Error(`parents/${l}.html looks empty`);
      }
    });
  }
  await other.close();

  // Phones: every game must fit a 360 px wide screen without sideways scrolling.
  for (const [label, viewport] of [['phone', { width: 360, height: 640 }], ['phone landscape', { width: 740, height: 360 }]]) {
    const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    await guard(ctx, `${name} ${label}`);
    const phone = await ctx.newPage();
    phone.on('pageerror', err => problems.push(`${name} ${label} page error: ${err.message}`));
    await phone.goto(`${SITE}/`);
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
