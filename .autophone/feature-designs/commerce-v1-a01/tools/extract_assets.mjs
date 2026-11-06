// Extract the prototype's inline SVG icons and illustrations as standalone, delivered assets.
// Usage: node extract_assets.mjs <prototype.html> <out-dir> <page> ...
// Environment: PLAYWRIGHT_MODULE, COMPOSITOR_PROFILES.
//
// An asset counts as delivered only when the file stands on its own:
//   - presentation that came from external CSS (fill, stroke, stroke-width, line caps and joins, opacity)
//     is written onto each element, with currentColor resolved to the colour of that instance;
//   - it references nothing outside itself (no url(#...), <use>, <image> or external href);
//   - rendered alone it matches the same graphic rendered inside the prototype with the prototype's CSS,
//     both at the instance's CSS size on a white square, pixel for pixel.
// Ancestor transforms (the hero illustration is rotated by its container) are layout, not part of the
// asset, and are left out of both renders.
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [prototype, outDir, ...pages] = process.argv.slice(2);
if (!prototype || !outDir || pages.length === 0) {
  console.error('usage: node extract_assets.mjs <prototype.html> <out-dir> <page> ...');
  process.exit(2);
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const profiles = JSON.parse(readFileSync(process.env.COMPOSITOR_PROFILES, 'utf8'));
const args = profiles.profiles[profiles.packaging_profile].chromium_args;
const PRESENTATION = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule'];

const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
const blank = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
const source = resolve(prototype);
const entries = [];

const frames = (target) => target.evaluate(() => new Promise((done) => {
  requestAnimationFrame(() => requestAnimationFrame(() => done()));
}));

// A screenshot taken right after inserting the stage was not stable: the same graphic came out 2 pixels
// apart between runs. Wait two frames and take shots until two in a row are identical.
async function stableShot(target, clip) {
  let previous = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    await frames(target);
    const shot = await target.screenshot({ clip });
    if (previous && shot.equals(previous)) return { shot, attempts: attempt, stable: true };
    previous = shot;
  }
  return { shot: previous, attempts: 6, stable: false };
}

async function pixelDiff(a, b) {
  // Decode both PNGs in a page and compare RGBA values.
  return blank.evaluate(async ([left, right]) => {
    const load = (data) => new Promise((done) => { const img = new Image(); img.onload = () => done(img); img.src = data; });
    const [x, y] = await Promise.all([load(left), load(right)]);
    if (x.width !== y.width || x.height !== y.height) return { same_size: false };
    const read = (img) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height).data;
    };
    const p = read(x); const q = read(y);
    let max = 0; let differing = 0;
    for (let i = 0; i < p.length; i += 4) {
      const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]), Math.abs(p[i + 3] - q[i + 3]));
      if (d) { differing += 1; max = Math.max(max, d); }
    }
    return { same_size: true, max_channel_diff: max, differing_pixels: differing };
  }, [a, b]);
}

for (const name of pages) {
  const url = new URL(pathToFileURL(source));
  url.search = `embed&width=430&page=${name}`;
  await page.goto(url.href);
  const found = await page.evaluate((presentation) => {
    const owner = (el) => {
      for (let n = el; n; n = n.parentElement) if (n.dataset?.testid) return n.dataset.testid;
      return null;
    };
    const rendered = (el) => {
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).visibility === 'visible' && r.width > 0 && r.height > 0
        && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    };
    const svgs = [...document.querySelectorAll('#device svg')].filter(rendered);
    return svgs.map((svg, index) => {
      svg.setAttribute('data-asset-index', String(index));
      const cs = getComputedStyle(svg);
      const width = parseFloat(cs.width);
      const height = parseFloat(cs.height);
      const clone = svg.cloneNode(true);
      const originals = [svg, ...svg.querySelectorAll('*')];
      const copies = [clone, ...clone.querySelectorAll('*')];
      originals.forEach((el, i) => {
        const style = getComputedStyle(el);
        for (const prop of presentation) copies[i].setAttribute(prop, style.getPropertyValue(prop));
        copies[i].removeAttribute('class');
        copies[i].removeAttribute('style');
      });
      clone.removeAttribute('data-asset-index');
      clone.removeAttribute('aria-hidden');
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
      const markup = clone.outerHTML;
      // Negative control: the same element as authored, without the presentation written onto it.
      const raw = svg.cloneNode(true);
      raw.removeAttribute('data-asset-index');
      raw.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      raw.setAttribute('width', String(width));
      raw.setAttribute('height', String(height));
      const dependencies = [];
      if (/url\(#/.test(markup)) dependencies.push('url(#...)');
      if (clone.querySelector('use, image, foreignObject')) dependencies.push('use/image/foreignObject');
      if (/href=/.test(markup)) dependencies.push('href');
      return {
        index, owner: owner(svg), host_class: svg.parentElement.getAttribute('class') || null, host_tag: svg.parentElement.tagName.toLowerCase(),
        svg_class: svg.getAttribute('class'), color: cs.color, width, height, markup, raw: raw.outerHTML, dependencies,
      };
    });
  }, PRESENTATION);

  const counts = {};
  for (const asset of found) {
    const base = `${asset.owner || 'unowned'}.${(asset.host_class || asset.host_tag).split(/\s+/)[0]}`;
    counts[base] = (counts[base] || 0) + 1;
    const file = `${name}/${base}-${counts[base]}.svg`;
    mkdirSync(join(outDir, name), { recursive: true });
    const text = `${asset.markup}\n`;
    writeFileSync(join(outDir, file), text);
    const box = { width: Math.ceil(asset.width), height: Math.ceil(asset.height) };
    // In-prototype render: the original element, prototype CSS applied, no ancestor transform.
    const inPrototype = await page.evaluate(({ index, box, color }) => {
      const original = document.querySelector(`[data-asset-index="${index}"]`);
      const stage = document.createElement('div');
      stage.id = 'asset-stage';
      stage.style.cssText = `position:fixed;left:0;top:0;width:${box.width}px;height:${box.height}px;background:#fff;z-index:2147483647;color:${color};margin:0;padding:0;transform:none`;
      const clone = original.cloneNode(true);
      clone.style.cssText += ';position:absolute;left:0;top:0;margin:0';
      stage.appendChild(clone);
      document.body.appendChild(stage);
      return true;
    }, { index: asset.index, box, color: asset.color });
    const clip = { x: 0, y: 0, width: box.width, height: box.height };
    const shotA = await stableShot(page, clip);
    const a = shotA.shot;
    await page.evaluate(() => document.getElementById('asset-stage').remove());
    await blank.setContent(`<!doctype html><body style="margin:0"><div style="position:fixed;left:0;top:0;width:${box.width}px;height:${box.height}px;background:#fff">${asset.markup.replace('<svg', '<svg style="position:absolute;left:0;top:0"')}</div></body>`);
    const shotB = await stableShot(blank, clip);
    const b = shotB.shot;
    const diff = inPrototype ? await pixelDiff(`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`) : null;
    await blank.setContent(`<!doctype html><body style="margin:0"><div style="position:fixed;left:0;top:0;width:${box.width}px;height:${box.height}px;background:#fff">${asset.raw.replace('<svg', '<svg style="position:absolute;left:0;top:0"')}</div></body>`);
    const shotC = await stableShot(blank, clip);
    const c = shotC.shot;
    const rawDiff = await pixelDiff(`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${c.toString('base64')}`);
    entries.push({
      page: name, file, sha256: sha(Buffer.from(text)), owner: asset.owner, host_class: asset.host_class, host_tag: asset.host_tag,
      svg_class: asset.svg_class, size: { width: asset.width, height: asset.height }, color: asset.color,
      dependencies: asset.dependencies,
      standalone_check: { ...diff, ok: !!diff && diff.same_size && diff.differing_pixels === 0 && shotA.stable && shotB.stable,
        stable_after: { in_prototype: shotA.attempts, standalone: shotB.attempts } },
      // true: the authored markup alone renders differently, so it depended on the prototype's CSS.
      css_dependent: !(rawDiff.same_size && rawDiff.differing_pixels === 0),
      raw_render: rawDiff,
      delivered: asset.dependencies.length === 0 && !!diff && diff.same_size && diff.differing_pixels === 0
        && shotA.stable && shotB.stable,
    });
  }
}
await browser.close();
writeFileSync(join(outDir, 'asset-manifest.json'), JSON.stringify({
  schema_version: 'commerce-v1-asset-manifest/v1',
  source: { path: 'design/commerce-v1/ui/prototype.html', sha256: sha(readFileSync(source)) },
  compositor_args: args,
  assets: entries,
}, null, 1) + '\n');
const delivered = entries.filter((e) => e.delivered).length;
console.log(`${entries.length} assets, ${delivered} delivered, ${entries.filter((e) => e.css_dependent).length} needed the prototype's CSS written in`);
for (const e of entries.filter((x) => !x.delivered)) console.log(`  NOT DELIVERED ${e.file} ${JSON.stringify(e.standalone_check)} ${e.dependencies}`);
