// Measure the renderer-dependent layout defaults of the frozen prototype, as the reference renderer resolves them.
// Usage: node measure_layout_pins.mjs <prototype.html> <out-dir> <page> ...
// Environment: PLAYWRIGHT_MODULE, COMPOSITOR_PROFILES (host Chromium, the reference renderer).
//
// Decision D7: layout that depends on the renderer's defaults is pinned to explicit values. Two kinds
// were found on commerce-v1 home (2026-11-06; device WebKit laid blocks out about 3.3pt higher):
//   line_height  every element whose computed line-height is `normal`; the value is the height of a
//                probe span holding the element's own text (or one Latin glyph for the line strut)
//                in the element's font at line-height normal;
//   box          every <button>: the user-agent box properties (padding, borders, box-sizing,
//                min-height, appearance, alignment, vertical margins) as Chromium resolved them.
// Elements are addressed by their path of child indices under #device, counting element children
// except <svg>, on the prototype as rendered (before any adapter tagging).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [prototype, outDir, ...pages] = process.argv.slice(2);
if (!prototype || !outDir || pages.length === 0) {
  console.error('usage: node measure_layout_pins.mjs <prototype.html> <out-dir> <page> ...');
  process.exit(2);
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const profiles = JSON.parse(readFileSync(process.env.COMPOSITOR_PROFILES, 'utf8'));
const args = profiles.profiles[profiles.packaging_profile].chromium_args;
export const BOX_PROPERTIES = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width',
  'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style',
  'border-bottom-style', 'border-left-style', 'box-sizing', 'min-height', 'appearance', 'align-items', 'text-align',
  'vertical-align', 'margin-top', 'margin-bottom'];

const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
const source = resolve(prototype);
for (const name of pages) {
  const url = new URL(pathToFileURL(source));
  url.search = `embed&width=430&page=${name}`;
  await page.goto(url.href);
  await page.evaluate(() => document.fonts.ready);
  const pins = await page.evaluate((boxProperties) => {
    const root = document.getElementById('device');
    const kids = (el) => [...el.children].filter((c) => c.tagName.toLowerCase() !== 'svg');
    const out = [];
    const visit = (el, path) => {
      const cs = getComputedStyle(el);
      const rendered = el.getClientRects().length > 0;
      if (rendered && cs.lineHeight === 'normal') {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
          .map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
        const probe = document.createElement('span');
        probe.textContent = own || 'x';
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;display:inline-block;white-space:pre;'
          + `line-height:normal;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};`
          + `font-style:${cs.fontStyle};letter-spacing:${cs.letterSpacing}`;
        document.body.appendChild(probe);
        const value = Math.round(probe.getBoundingClientRect().height * 100) / 100;
        probe.remove();
        out.push({ path, kind: 'line_height', value_px: value, strut: !own, text: own.slice(0, 16), font_size: cs.fontSize });
      }
      if (rendered && el.tagName.toLowerCase() === 'button') {
        out.push({ path, kind: 'box', properties: Object.fromEntries(boxProperties.map((p) => [p, cs.getPropertyValue(p)])),
          text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 16) });
      }
      kids(el).forEach((c, i) => visit(c, [...path, i]));
    };
    visit(root, []);
    return out;
  }, BOX_PROPERTIES);
  mkdirSync(join(outDir, name), { recursive: true });
  writeFileSync(join(outDir, name, 'layout-pins-430.json'), JSON.stringify({
    schema_version: 'commerce-v1-layout-pins/v1',
    decision: 'D7',
    source: { path: 'design/commerce-v1/ui/prototype.html', sha256: sha(readFileSync(source)) },
    url_query: url.search,
    browser: `chromium/${browser.version()}`,
    compositor_args: args,
    pins,
  }, null, 1) + '\n');
  console.log(`${name}: ${pins.filter((p) => p.kind === 'line_height').length} line heights, ${pins.filter((p) => p.kind === 'box').length} buttons`);
}
await browser.close();
