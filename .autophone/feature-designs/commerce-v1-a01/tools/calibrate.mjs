// Compare a compiled design package against the 430 prototype baseline, element by element.
// Usage: node calibrate.mjs <package-dir> <baseline.json> <bindings.json> <out.json> [side-by-side.png]
// Box elements compare x, y, width and height; text elements compare x and vertical centre (their block
// width differs between an inline span and a DSL Text, so width is reported but not judged).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [pkgDir, baselinePath, bindingsPath, outPath, sideBySide] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: node calibrate.mjs <package-dir> <baseline.json> <bindings.json> <out.json> [side-by-side.png]');
  process.exit(2);
}
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const bindings = JSON.parse(readFileSync(bindingsPath, 'utf8'));
const { regions, tolerance_pt: tolerance, elements } = bindings.calibration;

function* walk(node) {
  yield node;
  for (const child of node.children) yield* walk(child);
}
function find(tree, locator) {
  const scope = locator.within ? find(tree, locator.within) : tree;
  const matches = [...walk(scope)].filter((n) => (
    (locator.testid === undefined || n.testid === locator.testid)
    && (locator.class === undefined || (n.class || '').split(/\s+/).includes(locator.class))
    && (locator.tag === undefined || n.tag === locator.tag)
    && (locator.full_text === undefined || n.full_text === locator.full_text)));
  const nth = locator.nth ?? 0;
  if (matches.length <= nth || (locator.nth === undefined && matches.length !== 1)) {
    throw new Error(`baseline locator matched ${matches.length} nodes: ${JSON.stringify(locator)}`);
  }
  return matches[nth];
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: baseline.viewport.width, height: baseline.viewport.height } });
const index = resolve(join(pkgDir, 'prototype/compiled/index.html'));
await page.goto(pathToFileURL(index).href);
await page.evaluate(() => document.fonts.ready);
const drafted = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
  const el = document.querySelector(`[data-stable-id="${CSS.escape(id)}"]`);
  if (!el) return [id, null];
  const r = el.getBoundingClientRect();
  return [id, [r.x, r.y, r.width, r.height]];
})), Object.keys(elements));

const round = (v) => Math.round(v * 100) / 100;
const results = [];
for (const [stableId, spec] of Object.entries(elements)) {
  const region = regions[spec.region];
  const [bx, by, bw, bh] = find(baseline.tree, spec.locator).box;
  const expected = [bx, by - region.baseline_origin_y + region.draft_origin_y, bw, bh];
  const actual = drafted[stableId];
  if (!actual) {
    results.push({ stable_id: stableId, mode: spec.mode, ok: false, reason: 'missing_in_draft' });
    continue;
  }
  const tol = tolerance[spec.mode];
  let deltas;
  let judged;
  if (spec.mode === 'box') {
    deltas = { x: actual[0] - expected[0], y: actual[1] - expected[1], width: actual[2] - expected[2], height: actual[3] - expected[3] };
    judged = ['x', 'y', 'width', 'height'];
  } else {
    deltas = {
      x: actual[0] - expected[0],
      center_y: (actual[1] + actual[3] / 2) - (expected[1] + expected[3] / 2),
      width: actual[2] - expected[2],
    };
    judged = ['x', 'center_y'];
  }
  const over = judged.filter((k) => Math.abs(deltas[k]) > tol);
  results.push({
    stable_id: stableId, mode: spec.mode, region: spec.region, ok: over.length === 0, over_tolerance: over,
    expected: expected.map(round), actual: actual.map(round),
    deltas: Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, round(v)])),
  });
}

if (sideBySide) {
  const left = readFileSync(baselinePath.replace(/\.json$/, '.png')).toString('base64');
  const right = readFileSync(join(pkgDir, 'reference.png')).toString('base64');
  const shot = await browser.newPage({ viewport: { width: 900, height: 980 } });
  await shot.setContent(`<body style="margin:0;display:flex;gap:40px;background:#888;padding:24px 0 24px 0;justify-content:center">
    <img src="data:image/png;base64,${left}" style="width:430px;height:932px">
    <img src="data:image/png;base64,${right}" style="width:430px;height:932px;background:#fff"></body>`);
  await shot.screenshot({ path: sideBySide });
}
await browser.close();

const failed = results.filter((r) => !r.ok);
writeFileSync(outPath, JSON.stringify({
  schema_version: 'commerce-v1-layout-calibration/v1',
  package: { design_package_sha256: sha(join(pkgDir, 'design-package.json')), reference_sha256: sha(join(pkgDir, 'reference.png')) },
  baseline: { path: baselinePath, sha256: sha(baselinePath) },
  bindings_sha256: sha(bindingsPath),
  regions, tolerance_pt: tolerance,
  summary: { elements: results.length, passed: results.length - failed.length, failed: failed.length },
  results,
}, null, 2) + '\n');
console.log(`calibration: ${results.length - failed.length}/${results.length} within tolerance`);
for (const r of failed) console.log(`  FAIL ${r.stable_id} ${r.reason ?? JSON.stringify(r.deltas)}`);
process.exit(failed.length ? 1 : 0);
