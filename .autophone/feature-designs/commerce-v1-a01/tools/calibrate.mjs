// Compare a compiled design package against the 430 prototype baseline, element by element.
// Usage: node calibrate.mjs <package-dir> <baseline.json> <bindings.json> <policy.json> <out.json> [side-by-side.png]
// Environment: PLAYWRIGHT_MODULE; EXPECT_BASELINE_SHA256 (refuse a baseline other than the derived one).
//
// The policy fixes region shifts, tolerances, which checks are judged, and the known deviations; it is
// versioned separately from the AI-authored bindings, which only map stable IDs to baseline nodes.
// Checks per element (mode `box`, `text`, or `content` = text and style without geometry):
//   geometry    box: x, y, width, height; text: x and vertical centre (width recorded, not judged)
//   text        rendered text equals the baseline text (text/content modes)
//   style       color, fontSize, fontWeight (text/content); backgroundColor (box)
//   lines       line count (text/content); truncated; occluded
//   visibility  visible fraction inside the viewport and clipping ancestors
//   font        primary resolved font family on both sides (recorded only)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { collectFonts, elementMetrics } from './render_metrics.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [pkgDir, baselinePath, bindingsPath, policyPath, outPath, sideBySide] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: node calibrate.mjs <package-dir> <baseline.json> <bindings.json> <policy.json> <out.json> [png]');
  process.exit(2);
}
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
if (process.env.EXPECT_BASELINE_SHA256 && sha(baselinePath) !== process.env.EXPECT_BASELINE_SHA256) {
  console.error(`baseline ${baselinePath} differs from the derived baseline; re-run derive.py`);
  process.exit(2);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const bindings = JSON.parse(readFileSync(bindingsPath, 'utf8'));
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const elements = bindings.calibration.elements;
const regions = policy.regions[bindings.calibration.screen_id];
const deviations = policy.known_deviations.filter((d) => d.state_id === bindings.calibration.state_id);

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
function textOf(node, locator) {
  if (locator.line !== undefined) return node.lines[locator.line];
  return locator.own ? node.text : node.full_text;
}
const weight = (v) => Number(v);
const px = (v) => Number(String(v).replace('px', ''));
const primaryFont = (fonts) => (fonts && fonts.length
  ? [...fonts].sort((a, b) => b.glyphs - a.glyphs)[0].family : null);

const browser = await chromium.launch({ args: baseline.compositor.chromium_args });
const page = await browser.newPage({ viewport: { width: baseline.viewport.width, height: baseline.viewport.height } });
const cdp = await page.context().newCDPSession(page);
await page.goto(pathToFileURL(resolve(join(pkgDir, 'prototype/compiled/index.html'))).href);
await page.evaluate(() => document.fonts.ready);
const drafted = await page.evaluate(({ ids, metricsSource }) => {
  const metrics = new Function(`return (${metricsSource})`)();
  return Object.fromEntries(ids.map((id, index) => {
    const el = document.querySelector(`[data-stable-id="${CSS.escape(id)}"]`);
    if (!el) return [id, null];
    el.setAttribute('data-calibration-index', String(index));
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return [id, {
      index,
      box: [r.x, r.y, r.width, r.height],
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      style: { color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, backgroundColor: cs.backgroundColor },
      ...metrics(el),
    }];
  }));
}, { ids: Object.keys(elements), metricsSource: elementMetrics.toString() });
const draftFonts = await collectFonts(cdp, '[data-calibration-index]');
const indexed = Object.values(drafted).filter(Boolean).sort((a, b) => a.index - b.index);
indexed.forEach((item, i) => { item.fonts = draftFonts[i]; });

const round = (v) => Math.round(v * 100) / 100;
const results = [];
for (const [stableId, spec] of Object.entries(elements)) {
  const actual = drafted[stableId];
  if (!actual) {
    results.push({ stable_id: stableId, mode: spec.mode, outcome: 'fail', checks: { presence: 'fail' } });
    continue;
  }
  let node;
  try {
    node = find(baseline.tree, spec.locator);
  } catch (error) {
    results.push({ stable_id: stableId, mode: spec.mode, outcome: 'fail', checks: { locator: 'fail' },
      detail: { locator: String(error.message) } });
    continue;
  }
  const region = regions[spec.region];
  const expectedBox = [node.box[0], node.box[1] - region.baseline_origin_y + region.draft_origin_y, node.box[2], node.box[3]];
  const checks = {};
  const detail = {};
  const judged = policy.checks;
  if (spec.mode === 'box' && judged.geometry) {
    const d = { x: actual.box[0] - expectedBox[0], y: actual.box[1] - expectedBox[1],
      width: actual.box[2] - expectedBox[2], height: actual.box[3] - expectedBox[3] };
    checks.geometry = Object.values(d).every((v) => Math.abs(v) <= policy.tolerance_pt.box) ? 'pass' : 'fail';
    detail.geometry = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, round(v)]));
  } else if (spec.mode === 'text' && judged.geometry) {
    const d = { x: actual.box[0] - expectedBox[0],
      center_y: (actual.box[1] + actual.box[3] / 2) - (expectedBox[1] + expectedBox[3] / 2),
      width: actual.box[2] - expectedBox[2] };
    checks.geometry = Math.abs(d.x) <= policy.tolerance_pt.text && Math.abs(d.center_y) <= policy.tolerance_pt.text
      ? 'pass' : 'fail';
    detail.geometry = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, round(v)]));
  }
  if (spec.mode !== 'box') {
    const expectedText = textOf(node, spec.locator);
    if (judged.text) checks.text = actual.text === expectedText ? 'pass' : 'fail';
    detail.text = { expected: expectedText, actual: actual.text };
    if (judged.style) {
      checks.color = actual.style.color === node.style.color ? 'pass' : 'fail';
      checks.fontSize = px(actual.style.fontSize) === px(node.style.fontSize) ? 'pass' : 'fail';
      checks.fontWeight = weight(actual.style.fontWeight) === weight(node.style.fontWeight) ? 'pass' : 'fail';
      detail.style = { expected: { color: node.style.color, fontSize: node.style.fontSize, fontWeight: node.style.fontWeight },
        actual: actual.style };
    }
    if (judged.lines) {
      const expectedLines = spec.locator.line !== undefined ? 1 : node.line_count;
      checks.line_count = actual.line_count === expectedLines ? 'pass' : 'fail';
      detail.line_count = { expected: expectedLines, actual: actual.line_count };
    }
  } else if (judged.style) {
    checks.backgroundColor = actual.style.backgroundColor === node.style.backgroundColor ? 'pass' : 'fail';
    detail.backgroundColor = { expected: node.style.backgroundColor, actual: actual.style.backgroundColor };
  }
  if (judged.lines) {
    checks.truncated = actual.truncated === node.truncated ? 'pass' : 'fail';
    checks.occluded = actual.occluded === node.occluded ? 'pass' : 'fail';
    detail.truncated = { expected: node.truncated, actual: actual.truncated };
    detail.occluded = { expected: node.occluded, actual: actual.occluded };
  }
  if (judged.visibility) {
    const delta = actual.visible_fraction - node.visible_fraction;
    checks.visibility = Math.abs(delta) <= policy.tolerance_pt.visible_fraction ? 'pass' : 'fail';
    detail.visibility = { expected: node.visible_fraction, actual: actual.visible_fraction };
  }
  detail.font = { expected: primaryFont(node.fonts), actual: primaryFont(actual.fonts) };
  for (const deviation of deviations.filter((d) => d.stable_id === stableId)) {
    if (checks[deviation.check] === 'fail') checks[deviation.check] = `deviation:${deviation.gap}`;
  }
  const values = Object.values(checks);
  const outcome = values.includes('fail') ? 'fail' : values.some((v) => v.startsWith('deviation:')) ? 'deviation' : 'pass';
  results.push({ stable_id: stableId, mode: spec.mode, region: spec.region, outcome, checks, detail,
    expected_box: expectedBox.map(round), actual_box: actual.box.map(round) });
}

// A recorded deviation that no longer fails is stale: the policy must be revised, not silently kept.
const stale = deviations.filter((d) => {
  const r = results.find((x) => x.stable_id === d.stable_id);
  return !r || r.checks[d.check] !== `deviation:${d.gap}`;
}).map((d) => ({ stable_id: d.stable_id, check: d.check, gap: d.gap }));

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

const count = (o) => results.filter((r) => r.outcome === o).length;
const summary = { elements: results.length, passed: count('pass'), deviations: count('deviation'),
  failed: count('fail'), stale_deviations: stale.length };
writeFileSync(outPath, JSON.stringify({
  schema_version: 'commerce-v1-layout-calibration/v2',
  package: { design_package_sha256: sha(join(pkgDir, 'design-package.json')), reference_sha256: sha(join(pkgDir, 'reference.png')) },
  baseline: { path: baselinePath, sha256: sha(baselinePath) },
  bindings_sha256: sha(bindingsPath),
  policy: { path: policyPath, sha256: sha(policyPath), version: policy.version },
  summary, stale_deviations: stale, results,
}, null, 2) + '\n');
console.log(`calibration: ${summary.passed} pass, ${summary.deviations} recorded deviation, ${summary.failed} fail of ${summary.elements}`);
for (const r of results.filter((x) => x.outcome === 'fail')) {
  const failing = Object.entries(r.checks).filter(([, v]) => v === 'fail').map(([k]) => k);
  console.log(`  FAIL ${r.stable_id}: ${failing.join(', ')}`);
}
for (const s of stale) console.log(`  STALE deviation ${s.stable_id}.${s.check} (${s.gap})`);
process.exit(summary.failed || stale.length ? 1 : 0);
