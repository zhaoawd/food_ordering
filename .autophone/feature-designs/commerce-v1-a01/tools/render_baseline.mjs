// Render the frozen commerce-v1 prototype at a viewport and record each element's box and style.
// Usage: node render_baseline.mjs <prototype.html> <out-dir> <page>[:<state>] ...
// The Playwright module is resolved from PLAYWRIGHT_MODULE when set (the repo has no own dependency on it).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [prototype, outDir, ...targets] = process.argv.slice(2);
if (!prototype || !outDir || targets.length === 0) {
  console.error('usage: node render_baseline.mjs <prototype.html> <out-dir> <page>[:<state>] ...');
  process.exit(2);
}
// BASELINE_VIEWPORT=390x844 reproduces the original design frame; the default is the target frame.
const [WIDTH, HEIGHT] = (process.env.BASELINE_VIEWPORT ?? '430x932').split('x').map(Number);
const SCALE = 3;
const STYLE_KEYS = ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'padding', 'margin',
  'position', 'overflow', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor',
  'borderRadius', 'borderTopWidth', 'borderTopColor', 'borderBottomWidth', 'borderBottomColor', 'textAlign',
  'gridTemplateColumns'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: SCALE });
const source = resolve(prototype);
const sourceSha = createHash('sha256').update(readFileSync(source)).digest('hex');
for (const target of targets) {
  const [name, state] = target.split(':');
  const url = new URL(pathToFileURL(source));
  url.search = `embed&width=${WIDTH}&page=${name}${state ? `&state=${state}` : ''}`;
  await page.goto(url.href);
  await page.evaluate(() => document.fonts.ready);
  const tree = await page.evaluate((styleKeys) => {
    const visit = (el) => {
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const style = Object.fromEntries(styleKeys.map((k) => [k, cs[k]]));
      const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
      return {
        tag: el.tagName.toLowerCase(),
        class: el.getAttribute('class') || undefined,
        testid: el.dataset.testid || undefined,
        text: ownText || undefined,
        full_text: el.textContent.replace(/\s+/g, ' ').trim() || undefined,
        lines: el.querySelector(':scope > br') ? el.innerText.split('\n').map((l) => l.trim()) : undefined,
        box: [box.x, box.y, box.width, box.height].map((v) => Math.round(v * 100) / 100),
        style,
        children: [...el.children].filter((c) => c.tagName.toLowerCase() !== 'svg').map(visit),
        svg: [...el.children].some((c) => c.tagName.toLowerCase() === 'svg') || undefined,
      };
    };
    return visit(document.getElementById('device'));
  }, STYLE_KEYS);
  const key = state ? `${name}.${state}` : name;
  const dir = join(outDir, key);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `prototype-${WIDTH}.png`) });
  writeFileSync(join(dir, `prototype-${WIDTH}.json`), JSON.stringify({
    schema_version: 'commerce-v1-prototype-baseline/v1',
    source: 'design/commerce-v1/ui/prototype.html',
    source_sha256: sourceSha,
    url_query: url.search,
    viewport: { width: WIDTH, height: HEIGHT, scale: SCALE },
    browser: `chromium/${browser.version()}`,
    tree,
  }, null, 1) + '\n');
  console.log(`${key}: rendered`);
}
await browser.close();
