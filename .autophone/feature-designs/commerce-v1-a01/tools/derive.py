"""Derive the deterministic parts of the A01 drafts from the frozen commerce-v1 design package.

Inputs (all read-only):
  batch/a01-batch.json           batch definition: L0 facts with their source, or decision IDs
  decisions/a01-decisions.json   recorded design decisions (L1)
  design/commerce-v1/            frozen design package, verified against MANIFEST.json
  baseline/<page>/prototype-430.json   430x932 render of the frozen prototype (tools/render_baseline.mjs)
  authored/<state>/layout.json   AI-authored layout tree (screens, interactions, acceptance, local tokens)
  authored/<state>/bindings.json AI-authored locators from view keys and stable IDs to baseline nodes

Outputs (regenerated in full; `--check` fails when the committed files differ):
  derived/   tokens, token coverage, screen plans, fixtures, acceptance scope, input checks, provenance
  drafts/<state>/   the four prototype-design-draft/v2 files consumed by `autophone ui-design package`
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / 'tools'))
from html_adapter import build_html_draft  # noqa: E402
REPO = HERE.parent.parent.parent
DECISIONS = HERE / 'decisions' / 'a01-decisions.json'
BATCH_DEFINITION = HERE / 'batch' / 'a01-batch.json'
# Sections of the batch definition whose entries must cite a source in L0 or a recorded decision.
PROVENANCE_SECTIONS = ('design_version', 'design_package', 'frame', 'viewport_profile', 'states',
                       'shell_sections', 'tab_bar', 'featured_products', 'current_store', 'template_sources',
                       'display_bindings', 'contract_exclusions')


def batch_problems(batch: dict, decisions: dict) -> list[str]:
    """Entries that cite neither a source in L0 nor a known decision, and unknown display rules."""
    known = {d['id'] for d in decisions['decisions']}
    problems = []

    def check(where: str, entry) -> None:
        if not isinstance(entry, dict):
            problems.append(f'{where}: not an object')
            return
        source, decision = entry.get('source'), entry.get('decision')
        if decision is not None and decision not in known:
            problems.append(f'{where}: unknown decision {decision!r}')
        if not (isinstance(source, str) and source.strip()) and decision is None:
            problems.append(f'{where}: needs a source or a decision')

    for section in PROVENANCE_SECTIONS:
        value = batch.get(section)
        if value is None:
            problems.append(f'{section}: missing')
        elif section in ('states', 'shell_sections', 'display_bindings'):
            for key, entry in value.items():
                check(f'{section}.{key}', entry)
        elif section in ('template_sources', 'contract_exclusions'):
            for index, entry in enumerate(value):
                check(f'{section}[{index}]', entry)
        else:
            check(section, value)
    for key, binding in batch.get('display_bindings', {}).items():
        if binding.get('rule') not in decisions['display_rules']:
            problems.append(f'display_bindings.{key}: unknown rule {binding.get("rule")!r}')
    return problems


def load_batch_definition() -> dict:
    batch = json.loads(BATCH_DEFINITION.read_text(encoding='utf-8'))
    problems = batch_problems(batch, json.loads(DECISIONS.read_text(encoding='utf-8')))
    if problems:
        sys.exit('batch definition is invalid:\n  ' + '\n  '.join(problems))
    return batch


BATCH = load_batch_definition()
DESIGN = REPO / BATCH['design_package']['path']
MANIFEST_SHA256 = BATCH['design_package']['manifest_sha256']
DESIGN_VERSION = BATCH['design_version']['value']
FRAME = {'width': BATCH['frame']['width'], 'height': BATCH['frame']['height']}
VIEWPORT_PROFILE = BATCH['viewport_profile']['value']
STATES = {state_id: {'screen': v['screen'], 'baseline': v['baseline'], 'cases': v['cases']}
          for state_id, v in BATCH['states'].items()}
SHELL_SECTIONS = {screen: (v['head'], v['tail']) for screen, v in BATCH['shell_sections'].items()}
TAB_BAR = BATCH['tab_bar']['stable_ids']
FEATURED_PRODUCT_COUNT = BATCH['featured_products']['count']
CURRENT_STORE_ID = BATCH['current_store']['store_id']
TEMPLATE_SOURCES = BATCH['template_sources']
DISPLAY_BINDINGS = BATCH['display_bindings']
CONTRACT_EXCLUSIONS = [{k: e[k] for k in ('state_id', 'stable_id', 'reason', 'source')}
                       for e in BATCH['contract_exclusions']]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def dump(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def verify_design_package() -> dict:
    manifest_path = DESIGN / 'MANIFEST.json'
    actual = sha256(manifest_path)
    if actual != MANIFEST_SHA256:
        sys.exit(f'MANIFEST.json sha256 {actual} differs from the frozen {MANIFEST_SHA256}')
    manifest = load(manifest_path)
    bad = [f['path'] for f in manifest['files'] if sha256(DESIGN / f['path']) != f['sha256']]
    if bad:
        sys.exit(f'design files differ from MANIFEST.json: {bad}')
    return {'manifest_sha256': actual, 'files_verified': len(manifest['files'])}


def hex_color(value: str) -> str | None:
    match = re.fullmatch(r'rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)', value)
    if not match or (match.group(4) is not None and float(match.group(4)) == 0):
        return None
    return '#' + ''.join(f'{int(match.group(i)):02X}' for i in (1, 2, 3))


def derive_tokens(design_tokens: dict) -> dict:
    tokens = {}
    for name, value in design_tokens['color'].items():
        tokens[f'color.{name}'] = {'type': 'color', 'value': value.upper()}
    for value in design_tokens['space']:
        tokens[f'space.{value}'] = {'type': 'dimension', 'value': value}
    for name, value in design_tokens['radius'].items():
        tokens[f'radius.{name}'] = {'type': 'dimension', 'value': value}
    for name, value in design_tokens['type']['sizes'].items():
        tokens[f'font.{name}'] = {'type': 'dimension', 'value': value}
    tokens['size.hitTarget'] = {'type': 'dimension', 'value': design_tokens['interaction']['minimumHitTargetPt']}
    tokens['size.primaryControl'] = {'type': 'dimension', 'value': design_tokens['interaction']['primaryHeightPt']}
    return tokens


def walk(node, parents=()):
    yield node, parents
    for child in node['children']:
        yield from walk(child, parents + (node,))


def token_coverage(tokens: dict, baseline: dict) -> dict:
    """Which colors and font sizes the rendered prototype uses that design-tokens.json does not define."""
    colors = {t['value'] for k, t in tokens.items() if t['type'] == 'color'}
    sizes = {t['value'] for k, t in tokens.items() if k.startswith('font.')}
    radii = {t['value'] for k, t in tokens.items() if k.startswith('radius.')}
    used = {'color': {}, 'fontSize': {}, 'borderRadius': {}}
    for node, _ in walk(baseline['tree']):
        if node['box'][2] <= 0 or node['box'][3] <= 0:
            continue
        style = node['style']
        if node.get('text'):
            used['color'].setdefault(hex_color(style['color']), set()).add('text')
            used['fontSize'].setdefault(float(style['fontSize'].removesuffix('px')), set()).add('text')
        background = hex_color(style['backgroundColor'])
        if background:
            used['color'].setdefault(background, set()).add('background')
        if style['borderRadius'].endswith('px') and style['borderRadius'] != '0px':
            used['borderRadius'].setdefault(float(style['borderRadius'].removesuffix('px')), set()).add('box')
    report = {}
    for kind, defined in (('color', colors), ('fontSize', sizes), ('borderRadius', radii)):
        report[kind] = {
            'in_tokens': sorted((k for k in used[kind] if k in defined), key=str),
            'not_in_tokens': sorted((k for k in used[kind] if k is not None and k not in defined), key=str),
        }
    return report


def find(tree: dict, locator: dict) -> dict:
    scope = tree
    if 'within' in locator:
        scope = find(tree, locator['within'])
    matches = []
    for node, _ in walk(scope):
        if 'testid' in locator and node.get('testid') != locator['testid']:
            continue
        if 'class' in locator and locator['class'] not in (node.get('class') or '').split():
            continue
        if 'tag' in locator and node['tag'] != locator['tag']:
            continue
        if 'full_text' in locator and node.get('full_text') != locator['full_text']:
            continue
        matches.append(node)
    nth = locator.get('nth', 0)
    if len(matches) <= nth:
        sys.exit(f'baseline locator matched {len(matches)} nodes, needs index {nth}: {locator}')
    if 'nth' not in locator and len(matches) != 1:
        sys.exit(f'baseline locator is ambiguous ({len(matches)} matches): {locator}')
    return matches[nth]


def text_of(node: dict, locator: dict) -> str:
    if 'line' in locator:
        return node['lines'][locator['line']]
    text = node.get('text') if locator.get('own') else node.get('full_text')
    if not text:
        sys.exit(f'baseline node has no text: {locator}')
    return text


def relayout_diff(original: dict, target: dict, calibration: dict) -> list[dict]:
    rows = []
    for stable_id, spec in calibration['elements'].items():
        a = find(original, spec['locator'])['box']
        b = find(target, spec['locator'])['box']
        rows.append({'stable_id': stable_id, 'region': spec['region'], 'box_390': a, 'box_430': b,
                     'delta': {k: round(b[i] - a[i], 2) for i, k in enumerate(('x', 'y', 'width', 'height'))}})
    return rows


def batch_contract(view_models: dict, contract: dict, catalog: dict, decisions: dict) -> dict:
    """Required elements per A01 state from the frozen package and recorded decisions, never from a draft."""
    roles = {c['stable_id']: c for c in contract['controls']}
    featured = [p['id'] for p in catalog['products'][:FEATURED_PRODUCT_COUNT]]
    states = {}
    for state_id, spec in STATES.items():
        screen = spec['screen']
        candidates = []
        for control in contract['controls']:
            if control['screen_id'] == screen:
                candidates.append((control['stable_id'], 'ui-contract.json controls'))
        for section in view_models[screen]['sections']:
            candidates.append((section['control_or_group_id'], f"view-models.json {section['component']}"))
        candidates += [(nav, 'PRODUCT_DESIGN.md 底部导航') for nav in TAB_BAR]
        required, unresolved, excluded = {}, [], []
        for stable_id, source in candidates:
            exclusion = next((e for e in CONTRACT_EXCLUSIONS
                              if e['state_id'] == state_id and e['stable_id'] == stable_id), None)
            if exclusion:
                known = next((e for e in excluded if e['stable_id'] == stable_id), None)
                if known is None:
                    excluded.append({**exclusion, 'derived_from': [source]})
                elif source not in known['derived_from']:
                    known['derived_from'].append(source)
                continue
            decided = decisions['template_values'].get(stable_id)
            template = next((t for t in TEMPLATE_SOURCES
                             if t['template'] == stable_id and t['screen'] == screen), None)
            if template is not None:
                values = {'featured_products': featured}[template['values_from']]
                ids = [stable_id.replace(template['placeholder'], value) for value in values]
            elif decided:
                name = stable_id[stable_id.index('{'):stable_id.index('}') + 1]
                ids = [stable_id.replace(name, value) for value in decided['values']]
                source = f"{source}; values by decision {decided['decision']}"
            elif '{' in stable_id:
                unresolved.append({'stable_id': stable_id, 'derived_from': source,
                                   'reason': '设计包未给出模板参数的取值'})
                continue
            else:
                ids = [stable_id]
            for item in ids:
                entry = required.setdefault(item, {'sources': [], 'role': roles.get(stable_id, {}).get('role')})
                if source not in entry['sources']:
                    entry['sources'].append(source)
        states[state_id] = {
            'screen_id': screen, 'cases': spec['cases'],
            'required': dict(sorted(required.items())),
            'unresolved': unresolved, 'excluded': excluded,
        }
    return {'schema_version': 'commerce-v1-batch-contract/v1', 'batch': 'A01',
            'design_version': DESIGN_VERSION, 'states': states}


def current_store(commerce: dict) -> dict:
    return next(store for store in commerce['stores'] if store['id'] == CURRENT_STORE_ID)


def yuan(cents: int) -> str:
    return f'¥{cents // 100}.{cents % 100:02d}'


def derive_fixture(state_id: str, registry: dict, catalog: dict, commerce: dict, view: dict,
                   decisions: dict) -> dict:
    entry = next(f for f in registry['fixtures'] if f['id'] == state_id)
    store = current_store(commerce)
    featured = catalog['products'][:FEATURED_PRODUCT_COUNT]
    return {
        'schema_version': 'ui-prototype-fixture/v1',
        'state_id': state_id,
        'data_sources': {},
        'values': {
            'clock': entry['clock'],
            'timezone': entry['timezone'],
            'locale': entry['locale'],
            'state_recipe': entry['state_recipe'],
            'menu_revision': catalog['menu_revision'],
            'store_id': store['id'],
            'store_short_name': decisions['fixture_additions']['stores'][store['id']]['short_name'],
            'featured_product_ids': [p['id'] for p in featured],
            **{f'featured_{i}_price_cents': p['base_price_cents'] for i, p in enumerate(featured, 1)},
            'available_coupon_count': len(commerce['coupons']),
        },
        'view': view,
    }


def apply_decisions(state_id: str, extracted: dict, catalog: dict, commerce: dict,
                    decisions: dict) -> tuple[dict, list[dict]]:
    """Final view text: display rules for bound keys, recorded overrides and additions, otherwise the
    prototype text. Every key gets a record of where its text came from and how it relates to the prototype."""
    featured = catalog['products'][:FEATURED_PRODUCT_COUNT]
    rules = decisions['display_rules']
    view, records = {}, []
    for key, prototype_text in extracted.items():
        if key in DISPLAY_BINDINGS:
            rule = DISPLAY_BINDINGS[key]['rule']
            business_value = DISPLAY_BINDINGS[key]['business_value']
            if rule == 'money':
                product = featured[business_value['index']]
                value = product['base_price_cents']
                text = yuan(value)
                business = {'base_price_cents': value, 'product_id': product['id']}
            else:
                store = current_store(commerce)
                text = decisions['fixture_additions']['stores'][store['id']]['short_name']
                business = {'store_id': store['id'], 'store_name': store['name']}
            source = f"display_rule:{rule} ({rules[rule]['decision']})"
        else:
            text, business, source = prototype_text, None, 'prototype'
        override = decisions['view_overrides'].get(state_id, {}).get(key)
        if override:
            text, source = override['text'], f"override ({override['decision']})"
        view[key] = text
        records.append({'view_key': key, 'prototype_text': prototype_text, 'display_text': text,
                        'source': source, **({'business_value': business} if business else {}),
                        'relation': 'same_as_prototype' if text == prototype_text else 'decision_differs_from_prototype'})
    for key, addition in decisions['view_additions'].get(state_id, {}).items():
        view[key] = addition['text']
        records.append({'view_key': key, 'prototype_text': None, 'display_text': addition['text'],
                        'source': f"addition ({addition['decision']})", 'relation': 'no_prototype'})
    return view, records


def resolve_authored(state_id: str, name: str) -> dict:
    """Load authored/<state>/<name>.json; a file with `extends` starts from another state's file."""
    data = load(HERE / 'authored' / state_id / f'{name}.json')
    base_state = data.pop('extends', None)
    if base_state is None:
        return data
    base = resolve_authored(base_state, name)
    for key, value in data.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = {**base[key], **value}
        else:
            base[key] = value
    return base


def generate() -> dict[Path, str]:
    """Every output file and its text, computed from L0, L1, the batch definition and authored inputs."""
    provenance = verify_design_package()
    decisions = load(DECISIONS)
    provenance['decisions'] = {'path': DECISIONS.relative_to(HERE).as_posix(), 'sha256': sha256(DECISIONS)}
    design_tokens = load(DESIGN / 'spec' / 'design-tokens.json')
    view_models = {v['screen_id']: v for v in load(DESIGN / 'spec' / 'view-models.json')['views']}
    contract = load(DESIGN / 'spec' / 'ui-contract.json')
    registry = load(DESIGN / 'fixtures' / 'state-registry.json')
    catalog = load(DESIGN / 'fixtures' / 'catalog.json')
    commerce = load(DESIGN / 'fixtures' / 'commerce.json')
    cases = {c['id']: c for c in load(DESIGN / 'tests' / 'acceptance-cases.json')['cases']}

    outputs: dict[Path, str] = {}
    tokens = derive_tokens(design_tokens)
    outputs[HERE / 'derived' / 'tokens.json'] = dump(tokens)

    baselines = {}
    originals = {}
    for page in sorted({s['baseline'] for s in STATES.values()}):
        for width in (390, 430):
            path = HERE / 'baseline' / page / f'prototype-{width}.json'
            data = load(path)
            if data['source_sha256'] != sha256(DESIGN / 'ui' / 'prototype.html'):
                sys.exit(f'{path} was rendered from a different prototype.html')
            if width == 430:
                baselines[page] = data
            else:
                originals[page] = data
            provenance.setdefault('baselines', {})[f'{page}@{width}'] = {
                'path': path.relative_to(HERE).as_posix(), 'sha256': sha256(path),
                'png_sha256': sha256(path.with_suffix('.png')), 'viewport': data['viewport'],
                'browser': data['browser'],
            }
    outputs[HERE / 'derived' / 'token-coverage.json'] = dump(
        {page: token_coverage(tokens, baseline) for page, baseline in baselines.items()})

    scope = {'design_version': DESIGN_VERSION, 'states': {}}
    checks = {}
    relayout = {}
    for state_id, spec in STATES.items():
        screen = spec['screen']
        head, tail = SHELL_SECTIONS[screen]
        sections = head + [s['component'] for s in view_models[screen]['sections']] + tail
        plan = {
            'schema_version': 'ui-prototype-plan/v1',
            'product_type': 'food-ordering',
            'platform': 'mobile',
            'screens': [{'id': screen, 'purpose': next(
                s['name'] for s in load(DESIGN / 'spec' / 'screens.json')['screens'] if s['id'] == screen),
                'sections': sections}],
            'flows': [],
        }
        outputs[HERE / 'derived' / f'screen-plan.{screen}.json'] = dump(plan)
        controls = [c for c in contract['controls'] if c['screen_id'] == screen and '{' not in c['stable_id']]
        scope['states'][state_id] = {
            'screen_id': screen,
            'cases': {cid: {k: cases[cid][k] for k in ('title', 'state_id', 'when', 'then', 'layer')}
                      for cid in spec['cases']},
            'contract_controls': controls,
            'tab_bar': TAB_BAR,
            'deprecated_aliases': [a for a in contract['deprecated_aliases'] if a['to'] in TAB_BAR],
        }

        authored = HERE / 'authored' / state_id
        if not (authored / 'layout.json').exists():
            scope['states'][state_id]['draft'] = 'not_authored'
            continue
        layout = resolve_authored(state_id, 'layout')
        bindings = resolve_authored(state_id, 'bindings')
        bindings['calibration']['state_id'] = state_id
        tree = baselines[spec['baseline']]['tree']
        extracted = {key: text_of(find(tree, loc), loc) for key, loc in bindings['view'].items()}
        view, checks[state_id] = apply_decisions(state_id, extracted, catalog, commerce, decisions)
        fixture = derive_fixture(state_id, registry, catalog, commerce, view, decisions)
        html_spec = resolve_authored(state_id, 'html') if (authored / 'html.json').exists() else None
        if html_spec is not None:
            # The DSL draft stays as a cross-check; its bindings are kept for the calibrator self-test.
            outputs[HERE / 'derived' / 'bindings' / f'{state_id}.dsl.json'] = dump(bindings)
            bindings = json.loads(json.dumps(bindings))
            elements = bindings['calibration']['elements']
            for stable_id in html_spec['calibration'].get('remove', []):
                del elements[stable_id]
            elements.update(html_spec['calibration'].get('add', {}))
        outputs[HERE / 'derived' / 'bindings' / f'{state_id}.json'] = dump(bindings)
        local = layout.get('local_tokens', {})
        clash = sorted(set(local) & set(tokens))
        if clash:
            sys.exit(f'{state_id}: local tokens redefine design tokens: {clash}')
        document = {
            'schema_version': 'ui-prototype-document/v1',
            'name': layout['name'],
            'tokens': {**tokens, **local},
            'screens': layout['screens'],
            'interactions': layout.get('interactions', []),
            'prototype': {'start_screen_id': screen},
            'acceptance': layout['acceptance'],
        }
        prototype_spec = {
            'schema_version': 'prototype-design-draft/v2',
            'adapter': 'ai-prototype-dsl/v2',
            'screen_id': screen,
            'state_id': state_id,
            'frame_size': FRAME,
            'scale': 3,
            'plan': 'screen-plan.json',
            'source': 'ui-document.json',
            'fixture': 'state-fixture.json',
            'viewport_profile': VIEWPORT_PROFILE,
        }
        prototype_spec['ai_provenance'] = {
            'provider': 'claude', 'model': layout['ai_model'],
            'prompt_sha256': sha256(HERE / 'authored' / 'AUTHORING.md'),
        }
        draft = HERE / 'drafts' / state_id
        outputs[draft / 'screen-plan.json'] = dump(plan)
        outputs[draft / 'state-fixture.json'] = dump(fixture)
        outputs[draft / 'ui-document.json'] = dump(document)
        outputs[draft / 'prototype-spec.json'] = dump(prototype_spec)
        scope['states'][state_id]['draft'] = f'drafts/{state_id}'
        scope['states'][state_id]['route'] = 'dsl'
        if html_spec is not None:
            html_files = build_html_draft(
                prototype=DESIGN / 'ui' / 'prototype.html', state_id=state_id, screen_id=screen,
                html_spec=html_spec, bindings=bindings, fixture=fixture, checks=checks[state_id],
                viewport_profile=VIEWPORT_PROFILE, adapter_source=HERE / 'tools' / 'html_adapter.py')
            for name, text in html_files.items():
                outputs[HERE / 'drafts-html' / state_id / name] = text
            scope['states'][state_id].update({'draft': f'drafts-html/{state_id}', 'route': 'html',
                                              'dsl_draft': f'drafts/{state_id}'})
        relayout[state_id] = relayout_diff(originals[spec['baseline']]['tree'], tree, bindings['calibration'])
        scope['states'][state_id]['local_tokens'] = sorted(local)

    outputs[HERE / 'derived' / 'acceptance-scope.json'] = dump(scope)
    outputs[HERE / 'derived' / 'batch-contract.json'] = dump(batch_contract(view_models, contract, catalog, decisions))
    outputs[HERE / 'derived' / 'input-checks.json'] = dump(checks)
    outputs[HERE / 'derived' / 'relayout-r4.json'] = dump({
        'from': {'viewport': '390x844', 'source': 'baseline/<page>/prototype-390.json'},
        'to': {'viewport': '430x932', 'source': 'baseline/<page>/prototype-430.json'},
        'note': 'Same frozen prototype.html at two widths. Bottom-region elements follow the viewport height.',
        'states': relayout,
    })
    provenance.update({'design_version': DESIGN_VERSION, 'design_package': BATCH['design_package']['path'],
                       'viewport_profile': VIEWPORT_PROFILE, 'frame_size': FRAME})
    outputs[HERE / 'derived' / 'provenance.json'] = dump(provenance)
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='fail when regenerated files differ from the tree')
    args = parser.parse_args()
    outputs = generate()
    stale = [p for p, text in outputs.items() if not p.exists() or p.read_text(encoding='utf-8') != text]
    if args.check:
        if stale:
            sys.exit('derived files are stale: ' + ', '.join(str(p.relative_to(HERE)) for p in stale))
        print(f'{len(outputs)} derived files up to date')
        return
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
    print(f'{len(outputs)} files written, {len(stale)} changed')


if __name__ == '__main__':
    main()
