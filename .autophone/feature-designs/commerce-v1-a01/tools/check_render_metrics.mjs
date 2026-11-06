// Independent controlled samples for render_metrics.mjs.
// The baseline renderer and the calibrator share elementMetrics, so an error in it would appear on both
// sides and cancel out in calibration. Here it is measured against a fixed page whose answers are known.
// Usage: node check_render_metrics.mjs   (PLAYWRIGHT_MODULE, COMPOSITOR_PROFILES)
import { readFileSync } from 'node:fs';

import { elementMetrics } from './render_metrics.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const profiles = JSON.parse(readFileSync(process.env.COMPOSITOR_PROFILES, 'utf8'));
const args = profiles.profiles[profiles.packaging_profile].chromium_args;

const PAGE = `<!doctype html><body style="margin:0;font:16px/20px sans-serif">
<div id="plain" style="position:absolute;left:10px;top:20px;width:100px;height:50px">one line</div>
<div style="position:absolute;left:0;top:100px;width:200px;height:30px;overflow:hidden">
  <div id="half" style="width:200px;height:60px;background:#00f"></div></div>
<div id="covered" style="position:absolute;left:0;top:200px;width:100px;height:40px">covered</div>
<div style="position:absolute;left:0;top:200px;width:100px;height:40px;background:#fff"></div>
<div id="lines" style="position:absolute;left:0;top:300px;width:400px">first<br>second</div>
<div id="wrapped" style="position:absolute;left:0;top:360px;width:60px">wrap these words please</div>
<div id="trunc" style="position:absolute;left:0;top:500px;width:50px;height:20px;overflow:hidden;white-space:nowrap">a much longer text</div>
<div id="below" style="position:absolute;left:0;top:950px;width:10px;height:10px">x</div>
<div id="partial" style="position:absolute;left:0;top:912px;width:10px;height:40px">x</div>
</body>`;

const EXPECTED = {
  plain: { visible_fraction: 1, line_count: 1, truncated: false, occluded: false },
  half: { visible_fraction: 0.5, truncated: false, occluded: false },
  covered: { visible_fraction: 1, line_count: 1, occluded: true },
  lines: { line_count: 2, truncated: false, occluded: false },
  wrapped: { line_count: 4, occluded: false },
  trunc: { line_count: 1, truncated: true },
  below: { visible_fraction: 0, occluded: null },
  partial: { visible_fraction: 0.5 },
};

const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
await page.setContent(PAGE);
const measured = await page.evaluate(({ ids, source }) => {
  const metrics = new Function(`return (${source})`)();
  return Object.fromEntries(ids.map((id) => [id, metrics(document.getElementById(id))]));
}, { ids: Object.keys(EXPECTED), source: elementMetrics.toString() });
await browser.close();

const failures = [];
for (const [id, expected] of Object.entries(EXPECTED)) {
  for (const [key, value] of Object.entries(expected)) {
    if (measured[id][key] !== value) failures.push(`${id}.${key}: expected ${value}, measured ${measured[id][key]}`);
  }
}
console.log(JSON.stringify({ samples: Object.keys(EXPECTED).length, failures }));
process.exit(failures.length ? 1 : 0);
