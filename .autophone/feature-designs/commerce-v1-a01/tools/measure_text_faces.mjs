// Record the font faces each text actually resolves to in a packaged design, one element at a time.
// Usage: node measure_text_faces.mjs <package-dir> <out.json>
// Environment: PLAYWRIGHT_MODULE, COMPOSITOR_PROFILES (same Chromium args as the platform packager).
//
// CSS.getPlatformFontsForNode counts the whole subtree and reports no per-character mapping, so each
// rendered element's own text is split into runs of one script class (whitespace, CJK, other), each
// run in its own span, and every run is measured alone. The split must not change what is measured:
// the element's box, the per-line extent of its text and the computed style are compared before and
// after; a node that moves by more than TOLERANCE_PT, changes its line count or its computed style
// is recorded with wrap_unchanged=false and must not be judged.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [pkgDir, outPath] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: node measure_text_faces.mjs <package-dir> <out.json>');
  process.exit(2);
}
// Splitting a text node at script boundaries can move the shaped advance by a few hundredths of a
// point (measured up to 0.04pt on commerce-v1 home); 0.1pt is a third of one device pixel at 3x.
const TOLERANCE_PT = 0.1;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const profiles = JSON.parse(readFileSync(process.env.COMPOSITOR_PROFILES, 'utf8'));
const args = profiles.profiles[profiles.packaging_profile].chromium_args;
const pkg = JSON.parse(readFileSync(join(pkgDir, 'design-package.json'), 'utf8'));
const compiled = join(pkgDir, 'prototype/compiled/index.html');
const entry = existsSync(compiled) ? compiled : join(pkgDir, 'prototype/index.html');

const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: pkg.frame_size.width, height: pkg.frame_size.height } });
const cdp = await page.context().newCDPSession(page);
await page.goto(pathToFileURL(resolve(entry)).href);
await page.evaluate(() => document.fonts.ready);

const nodes = await page.evaluate((TOLERANCE_PT) => {
  const round = (v) => Math.round(v * 100) / 100;
  // Script classes for attributing faces to characters: whitespace, CJK and full-width forms, other.
  const classOf = (ch) => (/\s/.test(ch) ? 'space'
    : /[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch) ? 'cjk' : 'other');
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  const rendered = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.visibility === 'visible' && el.getClientRects().length > 0 && r.width > 0 && r.height > 0
      && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  };
  // Lines of the element's own text, as one union rect per line, so splitting a text node into runs
  // does not by itself count as a change.
  const lines = (nodes) => {
    const byTop = new Map();
    for (const t of nodes) {
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const r of range.getClientRects()) {
        if (r.width <= 0) continue;
        const key = Math.round(r.top);
        const u = byTop.get(key) || [r.left, r.top, r.right, r.bottom];
        byTop.set(key, [Math.min(u[0], r.left), Math.min(u[1], r.top), Math.max(u[2], r.right), Math.max(u[3], r.bottom)]);
      }
    }
    return [...byTop.values()].map((u) => u.map(round)).sort((a, b) => a[1] - b[1]);
  };
  const owner = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const id = n.dataset?.stableId || n.dataset?.testid;
      if (id) return id;
    }
    return null;
  };
  const candidates = [...document.querySelectorAll('body *')].filter((el) => ownText(el).length && rendered(el)
    && !['script', 'style', 'title'].includes(el.tagName.toLowerCase()));
  let runIndex = 0;
  return candidates.map((el, index) => {
    const texts = ownText(el);
    const cs = getComputedStyle(el);
    const box = () => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(round); };
    const before = { box: box(), lines: lines(texts) };
    const runs = [];
    for (const t of texts) {
      const value = t.textContent;
      let start = 0;
      const pieces = [];
      for (let i = 1; i <= value.length; i += 1) {
        if (i === value.length || classOf(value[i]) !== classOf(value[start])) {
          pieces.push(value.slice(start, i));
          start = i;
        }
      }
      const fragment = document.createDocumentFragment();
      for (const piece of pieces) {
        const span = document.createElement('span');
        span.textContent = piece;
        span.setAttribute('data-face-run', String(runIndex));
        runs.push({ run: runIndex, text: piece, class: classOf(piece[0]) });
        runIndex += 1;
        fragment.appendChild(span);
      }
      t.replaceWith(fragment);
    }
    const spans = [...el.querySelectorAll(':scope > [data-face-run]')];
    const after = { box: box(), lines: lines(spans.map((s) => s.firstChild)) };
    // Largest coordinate change of the box and the per-line extents; null when the line count changed.
    const flat = (m) => [...m.box, ...m.lines.flat()];
    const delta = before.lines.length === after.lines.length
      ? round(Math.max(...flat(before).map((v, i) => Math.abs(v - flat(after)[i])))) : null;
    const styleSame = spans.every((s) => {
      const c = getComputedStyle(s);
      return c.fontWeight === cs.fontWeight && c.fontFamily === cs.fontFamily && c.fontSize === cs.fontSize;
    });
    return {
      index,
      owner: owner(el),
      stable_id: el.dataset?.stableId || null,
      tag: el.tagName.toLowerCase(),
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      css: { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle },
      box: before.box,
      wrap_max_delta_pt: delta,
      wrap_unchanged: styleSame && delta !== null && delta <= TOLERANCE_PT,
      ...(styleSame && delta === 0 ? {} : { wrap_before: before, wrap_after: after }),
      runs,
    };
  });
}, TOLERANCE_PT);
await cdp.send('DOM.enable');
await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
for (const node of nodes) {
  for (const run of node.runs) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-face-run="${run.run}"]` });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    run.faces = fonts.map((f) => ({ family: f.familyName, postscript: f.postScriptName, glyphs: f.glyphCount }));
  }
}
await browser.close();
writeFileSync(outPath, JSON.stringify({
  schema_version: 'commerce-v1-text-faces/v1',
  package: { design_package_sha256: sha(readFileSync(join(pkgDir, 'design-package.json'))), entry: entry.replace(`${pkgDir}/`, '') },
  browser: `chromium/${browser.version()}`,
  host: { platform: process.platform, arch: process.arch },
  compositor_args: args,
  wrap_tolerance_pt: TOLERANCE_PT,
  nodes,
}, null, 1) + '\n');
console.log(`${nodes.length} text nodes, ${nodes.filter((n) => !n.wrap_unchanged).length} changed by wrapping`);
