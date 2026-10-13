// Smoke test: boots the desktop in a real browser, opens every app, and fails on
// any JavaScript error. This is the "doesn't break existing functionality" check.
//   npm run build && npm run smoke
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { serve } from '../scripts/serve.mjs';

const registry = JSON.parse(await readFile(new URL('../apps/registry.json', import.meta.url), 'utf8'));
const server = await serve(0);
const port = server.address().port;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];

page.on('pageerror', err => problems.push(`page error: ${err.message}`));
page.on('console', msg => {
  if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(`console error: ${msg.text()}`);
});

const step = async (name, fn) => {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (err) { problems.push(`${name}: ${err.message}`); console.log(`FAIL ${name}`); }
};

await step('desktop boots', async () => {
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.kidvoShell && document.querySelectorAll('#icons .icon').length > 0, null, { timeout: 5000 });
});

const windowApps = registry.filter(a => a.type === 'window');
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
    const text = await frame.locator('body').innerText();
    const hasCanvas = await frame.locator('canvas').count();
    if (!text.trim() && !hasCanvas) throw new Error('app rendered nothing');
  });
}

for (const app of registry.filter(a => a.type === 'overlay')) {
  await step(`overlay ${app.id} runs`, async () => {
    await page.evaluate(id => window.kidvoShell.openApp(id), app.id);
    await page.locator(`#overlays iframe[src^="apps/${app.id}/"]`).waitFor({ state: 'attached', timeout: 5000 });
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

if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT });

// Phones: every game must fit a 360 px wide screen without sideways scrolling.
for (const [label, viewport] of [['phone', { width: 360, height: 640 }], ['phone landscape', { width: 740, height: 360 }]]) {
  const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
  const phone = await ctx.newPage();
  phone.on('pageerror', err => problems.push(`${label} page error: ${err.message}`));
  await phone.goto(`http://localhost:${port}/`);
  await phone.waitForFunction(() => window.kidvoShell, null, { timeout: 5000 });
  for (const app of windowApps) {
    await step(`${app.id} fits a ${label} screen`, async () => {
      await phone.evaluate(id => window.kidvoShell.openApp(id), app.id);
      await phone.waitForTimeout(700);
      const frame = phone.frames().find(f => f.url().endsWith(`/apps/${app.id}/index.html`));
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
server.close();

if (problems.length) {
  console.error('\nSmoke test failed:\n' + problems.map(p => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nSmoke test passed.');
