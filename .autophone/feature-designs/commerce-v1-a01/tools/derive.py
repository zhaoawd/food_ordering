"""Derive the deterministic parts of the A01 drafts from the frozen commerce-v1 design package.

Inputs (all read-only):
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
REPO = HERE.parent.parent.parent
DESIGN = REPO / 'design' / 'commerce-v1'
MANIFEST_SHA256 = 'ec6bed1c5fbae3eb4d7cca23dbb1a78c573906b08b52a062e93812f604c174ee'
DESIGN_VERSION = 'commerce-v1-a01-430/r4'
FRAME = {'width': 430, 'height': 932}
VIEWPORT_PROFILE = {
    'profile_id': 'vphone-ios27-430x932',
    'safe_area': {'top': 59, 'right': 0, 'bottom': 37, 'left': 0},
    'safe_area_application': ['top', 'bottom'],
    'system_ui': 'separate_region',
}
# A01 scope: state -> (screen, baseline page, acceptance cases). Cases come from tests/acceptance-cases.json.
STATES = {
    'home.default.v1': {'screen': 'home', 'baseline': 'home', 'cases': ['T003']},
    'home.guest.v1': {'screen': 'home', 'baseline': 'home', 'cases': ['T001']},
    'orders.empty.v1': {'screen': 'orders', 'baseline': 'orders', 'cases': ['T004']},
}
# Shell regions present in the prototype but not in view-models.json; PRODUCT_DESIGN.md fixes the tab bar.
SHELL_SECTIONS = {'home': (['AppHeader'], ['TabBar']), 'orders': (['PageHeader'], ['TabBar'])}
TAB_BAR = ['nav.home', 'nav.menu', 'nav.coupons', 'nav.orders', 'nav.member']
# Template IDs from view-models.json resolve only where the frozen package says which items appear.
# Home ProductShelf renders DATA.catalog.products.slice(0, 2) in ui/prototype.html.
FEATURED_PRODUCT_COUNT = 2
# Exclusions must name their source; nothing here may be added to make a check pass.
CONTRACT_EXCLUSIONS = [
    {'state_id': 'orders.empty.v1', 'stable_id': 'orders.order.{orderId}.open',
     'reason': 'state_recipe=empty：订单列表为空，没有订单行可供打开',
     'source': 'fixtures/state-registry.json orders.empty.v1 state_recipe'},
]


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


def batch_contract(view_models: dict, contract: dict, catalog: dict) -> dict:
    """Required elements per A01 state, derived without reading any authored draft."""
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
            if '{productId}' in stable_id and screen == 'home':
                ids = [stable_id.replace('{productId}', pid) for pid in featured]
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


def yuan(cents: int) -> str:
    return f'¥{cents // 100}.{cents % 100:02d}'


def derive_fixture(state_id: str, registry: dict, catalog: dict, commerce: dict, view: dict) -> dict:
    entry = next(f for f in registry['fixtures'] if f['id'] == state_id)
    store = commerce['stores'][0]
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
            'featured_product_ids': [p['id'] for p in catalog['products'][:2]],
            **{f'featured_{i}_price_cents': p['base_price_cents'] for i, p in enumerate(catalog['products'][:2], 1)},
            'available_coupon_count': len(commerce['coupons']),
        },
        'view': view,
    }


def input_checks(view: dict, catalog: dict, commerce: dict) -> list[dict]:
    """Compare text shown by the prototype with the synthetic fixture data it should be bound to."""
    checks = []
    products = catalog['products'][:2]
    store = commerce['stores'][0]
    expected = {
        'product_1_name': products[0]['name'],
        'product_1_price': yuan(products[0]['base_price_cents']),
        'product_2_name': products[1]['name'],
        'product_2_price': yuan(products[1]['base_price_cents']),
        'hero_price': yuan(products[0]['base_price_cents']),
        'hero_product': products[0]['name'],
        'store_name': store['name'],
        'store_distance': store['distance_label'],
        'member_coupons': f"{len(commerce['coupons'])} 张券 ›",
    }
    for key, want in expected.items():
        if key in view:
            checks.append({'view_key': key, 'prototype_text': view[key], 'fixture_text': want,
                           'consistent': view[key] == want})
    return checks


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='fail when regenerated files differ from the tree')
    args = parser.parse_args()

    provenance = verify_design_package()
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
        layout = load(authored / 'layout.json')
        bindings = load(authored / 'bindings.json')
        tree = baselines[spec['baseline']]['tree']
        view = {key: text_of(find(tree, loc), loc) for key, loc in bindings['view'].items()}
        fixture = derive_fixture(state_id, registry, catalog, commerce, view)
        checks[state_id] = input_checks(view, catalog, commerce)
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
        relayout[state_id] = relayout_diff(originals[spec['baseline']]['tree'], tree, bindings['calibration'])
        scope['states'][state_id]['local_tokens'] = sorted(local)

    outputs[HERE / 'derived' / 'acceptance-scope.json'] = dump(scope)
    outputs[HERE / 'derived' / 'batch-contract.json'] = dump(batch_contract(view_models, contract, catalog))
    outputs[HERE / 'derived' / 'input-checks.json'] = dump(checks)
    outputs[HERE / 'derived' / 'relayout-r4.json'] = dump({
        'from': {'viewport': '390x844', 'source': 'baseline/<page>/prototype-390.json'},
        'to': {'viewport': '430x932', 'source': 'baseline/<page>/prototype-430.json'},
        'note': 'Same frozen prototype.html at two widths. Bottom-region elements follow the viewport height.',
        'states': relayout,
    })
    provenance.update({'design_version': DESIGN_VERSION, 'design_package': 'design/commerce-v1',
                       'viewport_profile': VIEWPORT_PROFILE, 'frame_size': FRAME})
    outputs[HERE / 'derived' / 'provenance.json'] = dump(provenance)

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
