// Render the frozen commerce-v1 prototype at a viewport and record each element's box, style and text metrics.
// Usage: node render_baseline.mjs <prototype.html> <out-dir> <page>[:<state>] ...
// Environment:
//   PLAYWRIGHT_MODULE     Playwright module to import (the repo has no own dependency on it)
//   COMPOSITOR_PROFILES   autophone prototype_compositor.json; its packaging profile's Chromium args are used,
//                         so the baseline and the platform reference are rendered with the same compositor
//   BASELINE_VIEWPORT     e.g. 390x844 to reproduce the original design frame; default 430x932
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { collectFonts, elementMetrics } from './render_metrics.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [prototype, outDir, ...targets] = process.argv.slice(2);
if (!prototype || !outDir || targets.length === 0) {
  console.error('usage: node render_baseline.mjs <prototype.html> <out-dir> <page>[:<state>] ...');
  process.exit(2);
}
const [WIDTH, HEIGHT] = (process.env.BASELINE_VIEWPORT ?? '430x932').split('x').map(Number);
const SCALE = 3;
const STYLE_KEYS = ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'padding', 'margin',
  'position', 'overflow', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor',
  'borderRadius', 'borderTopWidth', 'borderTopColor', 'borderBottomWidth', 'borderBottomColor', 'textAlign',
  'gridTemplateColumns', 'fontFamily'];

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const profilesPath = process.env.COMPOSITOR_PROFILES;
if (!profilesPath) {
  console.error('COMPOSITOR_PROFILES must name autophone prototype_compositor.json');
  process.exit(2);
}
const profilesRaw = readFileSync(profilesPath);
const profiles = JSON.parse(profilesRaw);
const compositor = {
  profile: profiles.packaging_profile,
  chromium_args: profiles.profiles[profiles.packaging_profile].chromium_args,
  profiles_sha256: sha(profilesRaw),
};

const browser = await chromium.launch({ args: compositor.chromium_args });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: SCALE });
const cdp = await page.context().newCDPSession(page);
const source = resolve(prototype);
const sourceSha = sha(readFileSync(source));
for (const target of targets) {
  const [name, state] = target.split(':');
  const url = new URL(pathToFileURL(source));
  url.search = `embed&width=${WIDTH}&page=${name}${state ? `&state=${state}` : ''}`;
  await page.goto(url.href);
  await page.evaluate(() => document.fonts.ready);
  const tree = await page.evaluate(({ styleKeys, metricsSource }) => {
    const metrics = new Function(`return (${metricsSource})`)();
    let index = 0;
    const visit = (el) => {
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const style = Object.fromEntries(styleKeys.map((k) => [k, cs[k]]));
      const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
      const node = {
        tag: el.tagName.toLowerCase(),
        class: el.getAttribute('class') || undefined,
        testid: el.dataset.testid || undefined,
        text: ownText || undefined,
        full_text: el.textContent.replace(/\s+/g, ' ').trim() || undefined,
        lines: el.querySelector(':scope > br') ? el.innerText.split('\n').map((l) => l.trim()) : undefined,
        box: [box.x, box.y, box.width, box.height].map((v) => Math.round(v * 100) / 100),
        style,
        ...metrics(el),
      };
      if (ownText) {
        el.setAttribute('data-baseline-text-index', String(index));
        node.text_index = index;
        index += 1;
      }
      node.children = [...el.children].filter((c) => c.tagName.toLowerCase() !== 'svg').map(visit);
      node.svg = [...el.children].some((c) => c.tagName.toLowerCase() === 'svg') || undefined;
      return node;
    };
    return visit(document.getElementById('device'));
  }, { styleKeys: STYLE_KEYS, metricsSource: elementMetrics.toString() });
  const fonts = await collectFonts(cdp, '[data-baseline-text-index]');
  const attach = (node) => {
    if (node.text_index !== undefined) node.fonts = fonts[node.text_index];
    node.children.forEach(attach);
  };
  attach(tree);
  const key = state ? `${name}.${state}` : name;
  const dir = join(outDir, key);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `prototype-${WIDTH}.png`) });
  writeFileSync(join(dir, `prototype-${WIDTH}.json`), JSON.stringify({
    schema_version: 'commerce-v1-prototype-baseline/v2',
    source: 'design/commerce-v1/ui/prototype.html',
    source_sha256: sourceSha,
    url_query: url.search,
    viewport: { width: WIDTH, height: HEIGHT, scale: SCALE },
    browser: `chromium/${browser.version()}`,
    host: { platform: process.platform, arch: process.arch, node: process.version },
    compositor,
    tree,
  }, null, 1) + '\n');
  console.log(`${key}: rendered`);
}
await browser.close();
