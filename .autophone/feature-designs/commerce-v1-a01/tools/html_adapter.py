"""Build a prototype-design-draft/v1 from the frozen prototype.html for one state (HTML route, decision D4).

The prototype keeps its own HTML/CSS: icons, illustrations, line breaks and mixed text styles survive.
Only three things are injected:
  1. the query the prototype reads (embed, width=430, page) before it renders;
  2. the R4 shell rules: a 59pt top spacer instead of the 44pt simulated status bar and a 37pt bottom
     inset under the tab bar, matching VIEWPORT_PROFILE;
  3. after render, `id` and `data-stable-id` on each target and each calibrated element, found with
     the same locators as the calibration bindings (an element's own text is wrapped in a span when it also holds child
     elements), plus the display text that recorded decisions changed. A decision text may only
     replace an element that has no child elements, so no prototype styling is dropped silently.

The draft declares the viewport profile and the acceptance targets, so autophone (>= 1ad4866b1)
makes the safe area transparent and scopes each element to its declared properties.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

R4_STYLE = """<style id="r4-adapter">
.statusbar{height:59px!important;padding:0!important;visibility:hidden}
.phoneapp{height:calc(100% - 59px)!important}
.nav{height:96px!important;padding-bottom:37px!important}
</style>"""

MAPPING_SCRIPT = """<script id="stable-id-adapter">
(() => {
  const locators = __LOCATORS__;
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
    if (hits.length <= nth || (loc.nth === undefined && hits.length !== 1)) {
      throw new Error('locator matched ' + hits.length + ': ' + JSON.stringify(loc));
    }
    return hits[nth];
  };
  const root = document.getElementById('device');
  for (const [stableId, loc] of Object.entries(locators)) {
    let el = find(root, loc);
    if (loc.own) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      const span = document.createElement('span');
      own[0].before(span);
      own.forEach((n) => span.appendChild(n));
      el = span;
    }
    el.id = stableId;
    el.dataset.stableId = stableId;
  }
  for (const [stableId, text] of Object.entries(texts)) {
    const el = document.getElementById(stableId);
    if (el.children.length) throw new Error('decision text would drop child elements of ' + stableId);
    el.textContent = text;
  }
})();
</script>"""


def _plain(locator: dict) -> dict:
    return {k: v for k, v in locator.items() if k != 'own'}


def build_html_draft(*, prototype: Path, state_id: str, screen_id: str, html_spec: dict, bindings: dict,
                     fixture: dict, checks: list[dict], viewport_profile: dict, adapter_source: Path) -> dict:
    """Return {file name: text} for drafts-html/<state>/. Pure function of its inputs."""
    calibration = bindings['calibration']['elements']
    targets = html_spec['targets']
    locators = {}
    for target in targets:
        stable_id = target['stable_id']
        if stable_id in html_spec.get('locators', {}):
            locators[stable_id] = html_spec['locators'][stable_id]
        elif stable_id in calibration and calibration[stable_id]['locator'].get('line') is None:
            locators[stable_id] = calibration[stable_id]['locator']
        else:
            raise ValueError(f'{state_id}: HTML target {stable_id} has no locator')
    # Calibrated elements outside the acceptance targets are tagged too, so calibration can find them;
    # only node_scope (the targets) enters the design package.
    for stable_id, spec in calibration.items():
        if stable_id not in locators and spec['locator'].get('line') is None:
            locators[stable_id] = spec['locator']
    texts = {}
    for record in checks:
        if record['relation'] != 'decision_differs_from_prototype':
            continue
        view_locator = _plain(bindings['view'][record['view_key']])
        owners = [sid for sid, loc in locators.items() if _plain(loc) == view_locator]
        if len(owners) != 1:
            raise ValueError(f"{state_id}: decision text for {record['view_key']} maps to {owners}")
        texts[owners[0]] = record['display_text']
    html = prototype.read_text(encoding='utf-8')
    query = f"<script>history.replaceState(null,'','?embed&width=430&page={screen_id}')</script>"
    head = html.index('<head>') + len('<head>')
    html = html[:head] + query + R4_STYLE + html[head:]
    script = MAPPING_SCRIPT.replace('__LOCATORS__', json.dumps(locators, ensure_ascii=False)).replace(
        '__TEXTS__', json.dumps(texts, ensure_ascii=False))
    end = html.rindex('</body>')
    html = html[:end] + script + html[end:]
    spec = {
        'schema_version': 'prototype-design-draft/v1',
        'adapter': 'commerce-v1-html-adapter/v1',
        'screen_id': screen_id,
        'state_id': state_id,
        'frame_size': {'width': 430, 'height': 932},
        'scale': 3,
        'entry': 'index.html',
        'fixture': 'state-fixture.json',
        'node_scope': [t['stable_id'] for t in targets],
        'viewport_profile': viewport_profile,
        'acceptance': {'targets': targets},
    }
    provenance = {
        'schema_version': 'commerce-v1-html-draft-provenance/v1',
        'prototype_sha256': hashlib.sha256(prototype.read_bytes()).hexdigest(),
        'adapter_sha256': hashlib.sha256(adapter_source.read_bytes()).hexdigest(),
        'decision_texts': texts,
    }
    dump = lambda value: json.dumps(value, ensure_ascii=False, indent=1) + '\n'  # noqa: E731
    return {
        'index.html': html,
        'state-fixture.json': dump(fixture),
        'prototype-spec.json': dump(spec),
        'adapter-provenance.json': dump(provenance),
    }
