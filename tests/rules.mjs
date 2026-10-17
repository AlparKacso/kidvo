// The safety rules in scripts/lib.mjs, held against the tricks that once got past them.
//   node tests/rules.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { APP_CSP, GUIDE_CSP, findUrls, unmask, htmlProblems, svgProblems } from '../scripts/lib.mjs';

const meta = csp => `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
const page = (between, csp = APP_CSP) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${between}${meta(csp)}\n<title>x</title>`;
const ok = (problems, label) => assert.deepEqual(problems, [], label);
const bad = (problems, label) => assert.ok(problems.length > 0, label);

// HTML: the policy only counts while the browser is still inside <head>.
ok(htmlProblems('index.html', page('')), 'the template layout');
ok(htmlProblems('index.html', page('<!-- Keep this line exactly as it is, first in the head. -->\n')), 'a plain comment before the policy');
ok(htmlProblems('parents/en.html', page('', GUIDE_CSP)), 'a guide with the guide policy');
bad(htmlProblems('parents/en.html', page('')), 'a guide with the game policy (it would allow scripts)');
bad(htmlProblems('index.html', page('', GUIDE_CSP)), 'a game with the guide policy');
bad(htmlProblems('index.html', page('<img src="x.png">\n')), 'an <img> closes <head>, so the policy is ignored');
bad(htmlProblems('index.html', page('x')), 'a stray letter closes <head>');
bad(htmlProblems('index.html', page('\u00a0')), 'a no-break space closes <head>');
bad(htmlProblems('index.html', page('<!--><img src=x> -->')), '"<!-->" ends a comment in browsers');
bad(htmlProblems('index.html', page('<title>x</title>')), 'nothing but charset and comments before the policy');
bad(htmlProblems('index.html', page('').replace('<html lang="en">', '<html lang="x><head><meta http-equiv=">')), 'markup hidden in <html>');
bad(htmlProblems('index.html', page('') + '<meta http-equiv="&#114;efresh" content="0;url=/">'), 'a second http-equiv (an encoded refresh)');
bad(htmlProblems('index.html', page('').replace(APP_CSP, APP_CSP + ' ')), 'the policy must match exactly');

// SVG: no policy applies to an SVG opened as a page, so only plain drawing passes.
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16">${body}</svg>`;
ok(svgProblems(svg('<rect x="1" y="1" width="14" height="14" fill="#191833"/>')), 'a pixel icon');
ok(svgProblems('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
  svg('<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient><style>.a{fill:url(#g)}</style></defs><!-- c --><use href="#g"/><path class="a" style="fill: url(\'#g\')" d="M0 0h4"/><text>a &amp; b</text>')),
  'an exported drawing with gradients, styles and inner references');
for (const [body, label] of [
  ['<script>fetch("/x")</script>', 'a script'],
  ['<image href="x.png"/>', 'an image (it would load as a page)'],
  ['<foreignObject><img xmlns="http://www.w3.org/1999/xhtml" src="x"/></foreignObject>', 'foreignObject'],
  ['<rect onload="x()"/>', 'an event handler'],
  ['<use href="https://evil.example/a.svg#x"/>', 'an outside reference'],
  ['<use xlink:href="&#104;ttps://evil.example/a.svg#x"/>', 'an encoded outside reference'],
  ['<rect fill="url(//evil.example/p.svg#x)"/>', 'url() to elsewhere'],
  ['<style>@import "x.css";</style>', '@import'],
  ['<style>rect{fill:\\75 rl(x.svg#a)}</style>', 'a CSS escape'],
  ['<style>rect{fill:ur<!-- -->l(x.svg#a)}</style>', 'markup inside <style>'],
  ['<style>rect{background:image-set("x.png" 1x)}</style>', 'image-set'],
  ['<set attributeName="href" to="x"/>', 'animation'],
  ['<svg:script xmlns:svg="http://www.w3.org/2000/svg"/>', 'a prefixed element'],
  ['<g xmlns="http://www.w3.org/1999/xhtml"/>', 'another namespace'],
  ['<![CDATA[ x ]]>', 'CDATA'],
  ['<text>&e;</text>', 'an unknown entity']
]) bad(svgProblems(svg(body)), label);
bad(svgProblems('<!DOCTYPE svg [<!ENTITY e "<script>x()</script>">]>' + svg('<text>&e;</text>')), 'an entity defined in the DOCTYPE');
bad(svgProblems('<?xml-stylesheet href="x.css"?>' + svg('')), 'a stylesheet instruction');

// Outside links: only a heuristic, but the cheap disguises are caught.
for (const s of ['&#104;ttps://evil.example', '"h" + "ttps://evil.example"', 'https:\\/\\/evil.example', '"\\x68ttps://evil.example"', '"\\u{68}ttps://evil.example"'])
  assert.ok(findUrls(unmask(s)).length > 0, `finds ${s}`);
assert.deepEqual(findUrls(unmask('const a = "x" + "y"; // http-free')), [], 'ordinary code is left alone');

// Vo grows one step for every finished round, in any game, the same game again included; growth only.
const vo = {};
vm.runInNewContext(readFileSync(new URL('../apps/pet/bricks.js', import.meta.url), 'utf8'), vo);
const { counter, grow, merge, fresh, clean, ridesAt, RIDES, LAST, GAP } = vo.VoBricks;
{
  const offer = counter();
  let now = 0;
  const steps = topic => offer(topic, now += GAP) !== null;
  assert.ok(steps('nonsense:done') && steps('nonsense:done') && steps('nonsense:done'), 'the same game again and again is a step every round');
  assert.ok(steps('maze:solved'), 'each Robot Maze level is a round');
  assert.equal(offer('maze:finished', now + 1), null, "Robot Maze's finished arrives with its last solved: no second step");
  assert.equal(offer('maze:solved', now + 1), null, 'one round end per app at a time, so an event sent twice is one step');
  assert.notEqual(offer('sorter:done', now + 1), null, 'another app is not held back by that wait');
  for (const topic of ['nonsense:caught', 'secret-keeper:kept', 'secret-keeper:shared', 'sorter:judged', 'maze:ai-flagged', 'maze:ai-asked', 'shell:opened', 'pet:done'])
    assert.equal(offer(topic, now += GAP), null, `${topic} is not a finished round`);
}
{
  let s = fresh();
  const first = grow(s);
  assert.deepEqual([first.state.step, first.got, first.state.ride], [1, 'head', null], 'the first round grows the big eyes and antenna together');
  s = first.state;
  const got = [];
  for (let i = 0; i < RIDES.length; i++) { const g = grow(s); s = g.state; got.push(g.got); assert.equal(s.ride, g.got, 'a new ride is put on straight away'); }
  assert.deepEqual(got, [...RIDES], 'then one ride per round, in garage order');
  assert.ok(!RIDES.includes('cap') && !RIDES.includes('rocket'), 'no cap and no rocket');
  assert.deepEqual([grow(s).got, grow(s).state.step], [null, LAST], 'a full garage stays full');
  assert.equal(merge(s, { step: 2, ride: 'skateboard' }).step, LAST, 'merging with an older copy never shrinks Vo');
  assert.equal(clean({ step: 3, ride: 'plane' }).ride, null, 'a ride not unlocked yet is never worn');
  assert.deepEqual([...ridesAt(3)], ['skateboard', 'pogo'], 'step 3 has the first two rides');
  assert.equal(clean({ bricks: 12, parts: ['eyes'], rides: ['skateboard', 'pogo'], ride: 'pogo' }).step, 3, 'a Vo saved before steps keeps what he grew');
  const hatched = fresh(Date.now());
  assert.equal(merge(s, hatched).step, 0, 'a newly hatched Vo wins over the old one, wherever the old copy comes from');
  assert.equal(merge(hatched, s).step, 0, 'whichever side it is on');
}

// Overlays stay under the windows: only the built-in pet may lift itself above them (kidvo.setModal),
// so a contributed overlay can never cover a game and take its clicks. tests/smoke.mjs tries it in a browser.
{
  const shell = readFileSync(new URL('../shell/shell.js', import.meta.url), 'utf8');
  const decl = shell.match(/^\s*const MODAL_APPS = .*;$/m), rule = shell.match(/^\s*const mayModal = .*;$/m);
  assert.ok(decl && rule, 'shell.js names the apps allowed to go modal (MODAL_APPS, mayModal)');
  const { mayModal } = vm.runInNewContext(`${decl[0]}\n${rule[0]}\n({ mayModal })`);
  assert.ok(mayModal({ id: 'pet', type: 'overlay' }), 'Vo may open his garage above the windows');
  assert.ok(!mayModal({ id: 'ghost', type: 'overlay' }), 'another overlay may not go modal');
  assert.ok(!mayModal({ id: 'pet', type: 'window' }), 'a window app named pet may not go modal');
  assert.ok(!mayModal(undefined), 'an unknown app may not go modal');
  assert.match(shell, /case 'modal': \{\s*if \(!mayModal\(apps\.get\(ctx\.appId\)\)\) return;/, "the shell's modal message checks mayModal first");
}

console.log('Rules hold.');
