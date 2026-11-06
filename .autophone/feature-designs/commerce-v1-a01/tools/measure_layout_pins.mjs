// Measure the layout pins of the HTML route in the reference renderer (host Chromium).
// Usage: node measure_layout_pins.mjs <prototype.html> <batch-definition.json> <out-dir> <page> ...
// Environment: PLAYWRIGHT_MODULE, COMPOSITOR_PROFILES.
//
// The page is the prototype with the batch definition's injection (query and R4 shell CSS) applied,
// as the HTML adapter will serve it. Pins are recorded in the order they must be applied:
//   D7 line_height  every element with line-height: normal gets the height of a probe span holding its
//                   own text (one Latin glyph for the line strut) in its font at line-height normal;
//   D7 box          every <button> gets the user-agent box properties Chromium resolved;
//   D8 width        shrink-to-fit boxes (inline-block, inline-flex) with a visible background or border
//                   get their width rounded up to a whole point, and do not wrap;
//   D8 height       block edges are put on whole points: in-flow block-level elements whose snapped
//                   height differs from their height get an explicit height, measured again after each
//                   pass until no height changes (a block changed above moves the ones below).
// Elements are addressed by child-index paths under #device, counting element children except <svg>.
// Whole points, not 1/3pt: Chromium lays out in 1/64 CSS px, so k/3 px cannot be hit exactly.
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [prototype, batchPath, outDir, ...pages] = process.argv.slice(2);
if (!prototype || !batchPath || !outDir || pages.length === 0) {
  console.error('usage: node measure_layout_pins.mjs <prototype.html> <batch-definition.json> <out-dir> <page> ...');
  process.exit(2);
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const profiles = JSON.parse(readFileSync(process.env.COMPOSITOR_PROFILES, 'utf8'));
const args = profiles.profiles[profiles.packaging_profile].chromium_args;
const injection = JSON.parse(readFileSync(batchPath, 'utf8')).injection;
const BOX_PROPERTIES = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width',
  'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style',
  'border-bottom-style', 'border-left-style', 'box-sizing', 'min-height', 'appearance', 'align-items', 'text-align',
  'vertical-align', 'margin-top', 'margin-bottom'];

const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
const source = resolve(prototype);
for (const name of pages) {
  const url = new URL(pathToFileURL(source));
  url.search = injection.query.replace('{screen}', name);
  await page.goto(url.href);
  await page.addStyleTag({ content: injection.css });
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate((boxProperties) => {
    const root = document.getElementById('device');
    const kids = (el) => [...el.children].filter((c) => c.tagName.toLowerCase() !== 'svg');
    const walk = (fn) => {
      const visit = (el, path) => { fn(el, path); kids(el).forEach((c, i) => visit(c, [...path, i])); };
      visit(root, []);
    };
    const at = (path) => path.reduce((el, i) => kids(el)[i], root);
    const rendered = (el) => el.getClientRects().length > 0;
    const pins = [];

    // D7: renderer defaults.
    walk((el, path) => {
      const cs = getComputedStyle(el);
      if (rendered(el) && cs.lineHeight === 'normal') {
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
        pins.push({ decision: 'D7', path, kind: 'line_height', value_px: value, strut: !own, text: own.slice(0, 16) });
      }
      if (rendered(el) && el.tagName.toLowerCase() === 'button') {
        pins.push({ decision: 'D7', path, kind: 'box',
          properties: Object.fromEntries(boxProperties.map((p) => [p, cs.getPropertyValue(p)])),
          text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 16) });
      }
    });
    for (const pin of pins) {
      const el = at(pin.path);
      if (pin.kind === 'line_height') el.style.lineHeight = `${pin.value_px}px`;
      else for (const [prop, value] of Object.entries(pin.properties)) el.style.setProperty(prop, value);
    }

    // D8: fixed widths for shrink-to-fit boxes whose edge is visible.
    walk((el, path) => {
      const cs = getComputedStyle(el);
      const visible = cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
        || ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
      if (rendered(el) && ['inline-block', 'inline-flex'].includes(cs.display) && visible) {
        const width = el.getBoundingClientRect().width;
        if (Math.abs(width - Math.round(width)) > 0.0005) {
          const extra = cs.boxSizing === 'border-box' ? 0 : parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
            + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
          const value = Math.ceil(width) - extra;
          el.style.width = `${value}px`;
          el.style.whiteSpace = 'nowrap';
          pins.push({ decision: 'D8', path, kind: 'width', value_px: value, from_px: Math.round(width * 1000) / 1000,
            text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 16) });
        }
      }
    });

    // D8: whole-point block edges, until no height changes.
    const heights = new Map();
    let passes = 0;
    for (; passes < 50; passes += 1) {
      let changed = 0;
      walk((el, path) => {
        const cs = getComputedStyle(el);
        if (!rendered(el) || ['inline', 'contents', 'none'].includes(cs.display) || cs.position === 'absolute') return;
        const r = el.getBoundingClientRect();
        const target = Math.round(r.bottom) - Math.round(r.top);
        if (Math.abs(target - r.height) <= 0.0005) return;
        const extra = cs.boxSizing === 'border-box' ? 0 : parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
          + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        el.style.height = `${target - extra}px`;
        el.style.minHeight = '0px';
        const key = path.join('.');
        if (!heights.has(key)) heights.set(key, { decision: 'D8', path, kind: 'height', from_px: Math.round(r.height * 1000) / 1000 });
        heights.get(key).value_px = target - extra;
        changed += 1;
      });
      if (!changed) break;
    }
    pins.push(...heights.values());
    const offGrid = [];
    walk((el) => {
      const cs = getComputedStyle(el);
      if (!rendered(el) || ['inline', 'contents', 'none'].includes(cs.display) || cs.position === 'absolute') return;
      const r = el.getBoundingClientRect();
      if (Math.abs(r.top - Math.round(r.top)) > 0.0005 || Math.abs(r.bottom - Math.round(r.bottom)) > 0.0005) {
        offGrid.push({ tag: el.tagName.toLowerCase(), class: el.className || null, top: r.top, bottom: r.bottom });
      }
    });
    return { pins, passes, offGrid };
  }, BOX_PROPERTIES);
  if (result.passes >= 50) throw new Error(`${name}: whole-point heights did not converge`);
  mkdirSync(join(outDir, name), { recursive: true });
  writeFileSync(join(outDir, name, 'layout-pins-430.json'), JSON.stringify({
    schema_version: 'commerce-v1-layout-pins/v2',
    decisions: ['D7', 'D8'],
    source: { path: 'design/commerce-v1/ui/prototype.html', sha256: sha(readFileSync(source)) },
    url_query: url.search,
    injection_css_sha256: sha(Buffer.from(injection.css)),
    browser: `chromium/${browser.version()}`,
    compositor_args: args,
    height_passes: result.passes,
    off_grid_blocks: result.offGrid,
    pins: result.pins,
  }, null, 1) + '\n');
  const count = (k) => result.pins.filter((p) => p.kind === k).length;
  console.log(`${name}: ${count('line_height')} line heights, ${count('box')} buttons, ${count('width')} widths, `
    + `${count('height')} heights (${result.passes} passes), ${result.offGrid.length} blocks off the grid`);
}
await browser.close();
