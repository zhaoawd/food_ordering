// Measurements shared by render_baseline.mjs (prototype) and calibrate.mjs (compiled package), so both
// sides of a calibration are measured by the same code.

// Runs in the page. Serialized with toString(), so it must not reference anything outside itself.
export function elementMetrics(el) {
  const round = (v) => Math.round(v * 100) / 100;
  const box = el.getBoundingClientRect();
  // Visible part: the box clipped by the viewport and every ancestor that does not overflow visibly.
  let [left, top, right, bottom] = [box.left, box.top, box.right, box.bottom];
  left = Math.max(left, 0); top = Math.max(top, 0);
  right = Math.min(right, window.innerWidth); bottom = Math.min(bottom, window.innerHeight);
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const cs = getComputedStyle(parent);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const clip = parent.getBoundingClientRect();
      left = Math.max(left, clip.left); top = Math.max(top, clip.top);
      right = Math.min(right, clip.right); bottom = Math.min(bottom, clip.bottom);
    }
  }
  const visibleArea = Math.max(0, right - left) * Math.max(0, bottom - top);
  const area = box.width * box.height;
  // Line count: distinct line tops over this element's own text nodes.
  const tops = new Set();
  for (const child of el.childNodes) {
    if (child.nodeType !== 3 || !child.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(child);
    for (const rect of range.getClientRects()) if (rect.width > 0) tops.add(Math.round(rect.top));
  }
  // Occlusion: whether the centre of the visible part hits this element or one of its descendants.
  let occluded = null;
  if (visibleArea > 0) {
    const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
    occluded = !(hit && (hit === el || el.contains(hit)));
  }
  return {
    visible_fraction: area > 0 ? round(visibleArea / area) : 0,
    line_count: tops.size || undefined,
    truncated: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
    occluded,
  };
}

// Platform fonts actually used for each element matching selector, in document order.
export async function collectFonts(cdp, selector) {
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  const fonts = [];
  for (const nodeId of nodeIds) {
    const { fonts: used } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    fonts.push(used.map((f) => ({ family: f.familyName, postscript: f.postScriptName, glyphs: f.glyphCount })));
  }
  return fonts;
}
