"""Spike for decision D4: turn the frozen prototype.html into a prototype-design-draft/v1 for one state.

The draft keeps the prototype's own HTML/CSS (icons, illustrations, line breaks, mixed text styles)
and only injects three things before packaging with autophone's existing v1 path:
  1. a script that sets the query the prototype reads (embed, width=430, page) before it renders;
  2. the R4 shell rules: a 59pt top spacer instead of the 44pt simulated status bar and a 37pt bottom
     inset under the tab bar (same values as the DSL drafts' viewport profile);
  3. a script that, after render, gives each calibrated element an id and data-stable-id using the
     same locators as derived/bindings/<state>.json (an element's own text is wrapped in a span when it
     also holds child elements), and applies the D3 display text.

Usage: python3 -I spike/html_adapter.py <state_id> <out-dir>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
PROTOTYPE = HERE.parent.parent.parent / 'design' / 'commerce-v1' / 'ui' / 'prototype.html'

R4_STYLE = """<style id="r4-adapter">
.statusbar{height:59px!important;padding:0!important;visibility:hidden}
.phoneapp{height:calc(100% - 59px)!important}
.nav{height:96px!important;padding-bottom:37px!important}
</style>"""

MAPPING_SCRIPT = """<script id="stable-id-adapter">
(() => {
  const elements = __ELEMENTS__;
  const texts = __TEXTS__;
  const kids = (el) => [...el.children].filter((c) => c.tagName.toLowerCase() !== 'svg');
  const walk = (el, out = []) => { out.push(el); kids(el).forEach((c) => walk(c, out)); return out; };
  const fullText = (el) => el.textContent.replace(/\\s+/g, ' ').trim();
  const find = (root, loc) => {
    const scope = loc.within ? find(root, loc.within) : root;
    const hits = walk(scope).filter((n) => (loc.testid === undefined || n.dataset.testid === loc.testid)
      && (loc.class === undefined || n.classList.contains(loc.class))
      && (loc.tag === undefined || n.tagName.toLowerCase() === loc.tag)
      && (loc.full_text === undefined || fullText(n) === loc.full_text));
    const nth = loc.nth ?? 0;
    if (hits.length <= nth || (loc.nth === undefined && hits.length !== 1)) throw new Error('locator ' + JSON.stringify(loc));
    return hits[nth];
  };
  const root = document.getElementById('device');
  const gaps = [];
  for (const [stableId, spec] of Object.entries(elements)) {
    if (spec.locator.line !== undefined) { gaps.push(stableId + ': line of a <br> heading has no element'); continue; }
    try {
      let el = find(root, spec.locator);
      if (spec.locator.own) {
        // The element also holds child elements; its own text needs its own node to be measured alone.
        const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
        const span = document.createElement('span');
        own[0].before(span);
        own.forEach((n) => span.appendChild(n));
        el = span;
      }
      el.id = stableId;
      el.dataset.stableId = stableId;
    } catch (e) { gaps.push(stableId + ': ' + e.message); }
  }
  for (const [stableId, text] of Object.entries(texts)) {
    const el = document.getElementById(stableId);
    if (el) el.textContent = text;
  }
  document.documentElement.dataset.adapterGaps = JSON.stringify(gaps);
})();
</script>"""


def main() -> None:
    state_id, out = sys.argv[1], Path(sys.argv[2])
    bindings = json.loads((HERE / 'derived' / 'bindings' / f'{state_id}.json').read_text(encoding='utf-8'))
    fixture = json.loads((HERE / 'drafts' / state_id / 'state-fixture.json').read_text(encoding='utf-8'))
    checks = json.loads((HERE / 'derived' / 'input-checks.json').read_text(encoding='utf-8'))[state_id]
    screen = bindings['calibration']['screen_id']
    elements = bindings['calibration']['elements']
    # Text the decisions changed: apply to the element whose calibration locator is the view key's locator.
    texts = {}
    for record in checks:
        if record['relation'] != 'decision_differs_from_prototype':
            continue
        locator = bindings['view'][record['view_key']]
        for stable_id, spec in elements.items():
            if {k: v for k, v in spec['locator'].items() if k != 'own'} == {k: v for k, v in locator.items() if k != 'own'}:
                texts[stable_id] = record['display_text']
    html = PROTOTYPE.read_text(encoding='utf-8')
    query = f"<script>history.replaceState(null,'','?embed&width=430&page={screen}')</script>"
    head = html.index('<head>') + len('<head>')
    html = html[:head] + query + R4_STYLE + html[head:]
    script = MAPPING_SCRIPT.replace('__ELEMENTS__', json.dumps(elements, ensure_ascii=False)).replace(
        '__TEXTS__', json.dumps(texts, ensure_ascii=False))
    end = html.rindex('</body>')
    html = html[:end] + script + html[end:]
    out.mkdir(parents=True)
    (out / 'index.html').write_text(html, encoding='utf-8')
    (out / 'state-fixture.json').write_text(json.dumps(fixture, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    node_scope = [sid for sid, spec in elements.items() if spec['locator'].get('line') is None]
    (out / 'prototype-spec.json').write_text(json.dumps({
        'schema_version': 'prototype-design-draft/v1',
        'adapter': 'commerce-v1-html-adapter/spike-1',
        'screen_id': screen,
        'state_id': state_id,
        'frame_size': {'width': 430, 'height': 932},
        'scale': 3,
        'entry': 'index.html',
        'fixture': 'state-fixture.json',
        'node_scope': node_scope,
    }, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps({'state_id': state_id, 'node_scope': len(node_scope), 'text_overrides': texts}, ensure_ascii=False))


if __name__ == '__main__':
    main()
