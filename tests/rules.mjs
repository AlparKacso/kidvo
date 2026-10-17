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

// Vo's bricks: at most 3 per app per round, none within 8 seconds of the last from the same app, growth only.
const vo = {};
vm.runInNewContext(readFileSync(new URL('../apps/pet/bricks.js', import.meta.url), 'utf8'), vo);
const { counter, grow, merge, fresh, PER_ROUND, GAP } = vo.VoBricks;
{
  const offer = counter();
  let now = 0;
  const earned = topic => offer(topic, {}, now += GAP) !== null;
  assert.equal([1, 2, 3, 4, 5].filter(() => earned('nonsense:caught')).length, PER_ROUND, 'a round earns at most 3 bricks');
  assert.ok(earned('sorter:caught'), 'the cap is per app');
  assert.ok(!earned('nonsense:done'), 'done does not lift the cap of the round it ends');
  assert.ok(earned('nonsense:caught'), 'done starts a new round');
  assert.equal(offer('nonsense:caught', {}, now + GAP - 1), null, 'none within 8 seconds of the last from the same app');
  assert.notEqual(offer('maze:ai-flagged', { wasWrong: true }, now + 1), null, 'another app is not held back by that wait');
  now += 1;
  for (const [topic, data] of [['secret-keeper:shared', {}], ['maze:ai-asked', {}], ['sorter:judged', { right: false }], ['maze:ai-flagged', { wasWrong: false }],
    ['shell:opened', {}], ['maze:solved', {}], ['nonsense:checked', {}]])
    assert.equal(offer(topic, data, now += GAP), null, `${topic} earns nothing`);
  assert.notEqual(offer('sorter:judged', { right: true }, now += GAP), null, 'a right call earns a brick');
}
{
  let s = fresh();
  const first = grow(s, ['ai-can-be-wrong', 'when-to-ask']);
  assert.deepEqual([first.state.bricks, first.part], [1, 'eyes'], 'the first brick of a skill grows its part');
  const second = grow(first.state, ['ai-can-be-wrong', 'when-to-ask']);
  assert.equal(second.part, 'antenna', 'one part per brick: the second skill of the game grows on the next brick');
  assert.equal(grow(second.state, ['ai-learns-from-examples']).part, null, 'a skill without a drawn part records the brick only');
  s = second.state;
  for (let i = 0; i < 3; i++) s = grow(s, []).state;
  assert.deepEqual([...s.rides], ['skateboard'], '5 bricks unlock the skateboard');
  assert.equal(merge(s, { bricks: 1, parts: [], rides: [] }).bricks, 5, 'merging with an older copy never shrinks Vo');
}

console.log('Rules hold.');
