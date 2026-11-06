"""Check that the calibrator catches known errors: each controlled mutation must fail, the control must pass.

A passing calibration only means something if the calibrator would have failed on a wrong draft.
Every sample starts from the current drafts/<state> copy, applies one change, packages it with
autophone and calibrates it with the given policy. A sample counts as detected when calibration
exits non-zero; the failing checks are recorded so a detection for the wrong reason is visible.

Usage: python3 tools/calibration_selftest.py --autophone-root <autophone> --policy <policy> [--route dsl|html]
Writes admission/calibration-selftest.<route>.json; exit status 1 when a sample is not detected.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
STATE = 'home.default.v1'


def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def dump(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def walk(node, parent=None):
    yield node, parent
    for child in node.get('children', []):
        yield from walk(child, node)


def node_by_id(document: dict, node_id: str):
    for node, parent in walk(document['screens'][0]['root']):
        if node['id'] == node_id:
            return node, parent
    raise KeyError(node_id)


def text_changed(draft: Path, work: Path) -> str:
    fixture = load(draft / 'state-fixture.json')
    fixture['view']['greeting'] = '晚餐时间，把好心情吃回来。'
    dump(draft / 'state-fixture.json', fixture)
    return 'home.greeting text differs from the prototype'


def element_missing(draft: Path, work: Path) -> str:
    document = load(draft / 'ui-document.json')
    node, parent = node_by_id(document, 'home.mode.pickup.title')
    parent['children'].remove(node)
    for entry in document['acceptance']:
        entry['targets'] = [t for t in entry['targets'] if t['stable_id'] != 'home.mode.pickup.title']
    dump(draft / 'ui-document.json', document)
    return 'home.mode.pickup.title removed from the layout'


def shifted(draft: Path, work: Path) -> str:
    document = load(draft / 'ui-document.json')
    node, _ = node_by_id(document, 'home.modes')
    node['layout']['margin'] = [19, 0, 0, 0]
    dump(draft / 'ui-document.json', document)
    return 'mode cards and everything below moved down 5pt'


def occluded(draft: Path, work: Path) -> str:
    document = load(draft / 'ui-document.json')
    node, _ = node_by_id(document, 'home.mode.pickup')
    node['children'].append({'id': 'selftest.cover', 'component': 'Decoration',
                             'layout': {'position': 'absolute', 'inset': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}},
                             'style': {'backgroundColor': '$color.surface'}})
    dump(draft / 'ui-document.json', document)
    return 'an opaque layer covers the pickup card content'


def deviation_masking(draft: Path, work: Path) -> str:
    fixture = load(draft / 'state-fixture.json')
    fixture['view']['hero_price'] = '¥99.90'
    dump(draft / 'state-fixture.json', fixture)
    return 'hero price changed although its text check carries a recorded deviation (D3)'


def wrong_state(draft: Path, work: Path) -> str:
    return 'home draft calibrated against the orders baseline'


def stale_evidence(draft: Path, work: Path) -> str:
    return 'baseline file differs from the digest recorded by derive.py'


def _html(draft: Path) -> str:
    return (draft / 'index.html').read_text(encoding='utf-8')


def _write_html(draft: Path, html: str) -> None:
    (draft / 'index.html').write_text(html, encoding='utf-8')


def _inject_style(draft: Path, css: str) -> None:
    html = _html(draft)
    _write_html(draft, html.replace('</head>', f'<style>{css}</style></head>', 1))


def html_text_changed(draft: Path, work: Path) -> str:
    _write_html(draft, _html(draft).replace('午餐时间，把好心情吃回来。', '晚餐时间，把好心情吃回来。'))
    text_changed(draft, work)
    return 'greeting changed in the prototype and the fixture alike'


def html_element_missing(draft: Path, work: Path) -> str:
    html = _html(draft)
    assert '<strong>到店自取</strong>' in html
    _write_html(draft, html.replace('<strong>到店自取</strong>', '', 1))
    return 'pickup title removed from the prototype markup'


def html_shifted(draft: Path, work: Path) -> str:
    _inject_style(draft, '.modegrid{margin-top:19px!important}')
    return 'mode cards and everything below moved down 5pt'


def html_occluded(draft: Path, work: Path) -> str:
    _inject_style(draft, '[data-testid="home.mode.pickup"]{position:relative}'
                         '[data-testid="home.mode.pickup"]::after{content:"";position:absolute;inset:0;background:#fff}')
    return 'an opaque layer covers the pickup card content'


def html_deviation_masking(draft: Path, work: Path) -> str:
    html = _html(draft)
    assert '"home.hero.price": "¥32.90"' in html
    _write_html(draft, html.replace('"home.hero.price": "¥32.90"', '"home.hero.price": "¥99.90"', 1))
    deviation_masking(draft, work)
    return 'hero price changed although its text check carries a recorded deviation (D3)'


HTML_SAMPLES = {
    'control': (lambda draft, work: 'unchanged draft', False),
    'text_changed': (html_text_changed, True),
    'element_missing': (html_element_missing, True),
    'shifted': (html_shifted, True),
    'occluded': (html_occluded, True),
    'deviation_masking': (html_deviation_masking, True),
    'wrong_state': (wrong_state, True),
    'stale_evidence': (stale_evidence, True),
}

SAMPLES = {
    'control': (lambda draft, work: 'unchanged draft', False),
    'text_changed': (text_changed, True),
    'element_missing': (element_missing, True),
    'shifted': (shifted, True),
    'occluded': (occluded, True),
    'deviation_masking': (deviation_masking, True),
    'wrong_state': (wrong_state, True),
    'stale_evidence': (stale_evidence, True),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--autophone-root', required=True, type=Path)
    parser.add_argument('--policy', required=True, type=Path)
    parser.add_argument('--route', choices=('dsl', 'html'), default='dsl')
    args = parser.parse_args()
    samples = HTML_SAMPLES if args.route == 'html' else SAMPLES
    source = HERE / ('drafts-html' if args.route == 'html' else 'drafts') / STATE
    bindings_path = HERE / 'derived' / 'bindings' / f'{STATE}.json'
    if args.route == 'dsl' and (HERE / 'derived' / 'bindings' / f'{STATE}.dsl.json').is_file():
        bindings_path = HERE / 'derived' / 'bindings' / f'{STATE}.dsl.json'
    autophone = args.autophone_root.resolve()
    policy = (HERE / args.policy).resolve()
    provenance = load(HERE / 'derived' / 'provenance.json')
    env = {**os.environ, 'PLAYWRIGHT_MODULE': str(autophone / 'node_modules/playwright/index.mjs')}
    results = {}
    with tempfile.TemporaryDirectory(prefix='calibration-selftest-') as temporary:
        root = Path(temporary)
        for name, (mutate, must_fail) in samples.items():
            work = root / name
            draft = work / 'draft'
            shutil.copytree(source, draft)
            description = mutate(draft, work)
            package = work / 'package'
            packaged = subprocess.run(
                ['uv', 'run', '--group', 'platform', 'python3', '-m', 'autophone.cli', 'ui-design', 'package',
                 str(draft), '--out', str(package)], cwd=autophone, capture_output=True, text=True)
            if packaged.returncode != 0:
                results[name] = {'description': description, 'must_fail': must_fail, 'detected': must_fail,
                                 'stage': 'packaging', 'detail': (packaged.stdout + packaged.stderr)[-400:]}
                continue
            page = 'orders' if name == 'wrong_state' else 'home'
            baseline = HERE / 'baseline' / page / 'prototype-430.json'
            expected_sha = provenance['baselines'][f'{page}@430']['sha256']
            if name == 'stale_evidence':
                stale = work / 'prototype-430.json'
                stale.write_bytes(baseline.read_bytes().replace(b'"box"', b'"box" ', 1))
                (work / 'prototype-430.png').write_bytes(baseline.with_suffix('.png').read_bytes())
                baseline = stale
            out = work / 'calibration.json'
            run = subprocess.run(
                ['node', str(HERE / 'tools' / 'calibrate.mjs'), str(package), str(baseline),
                 str(bindings_path), str(policy), str(out)],
                capture_output=True, text=True, env={**env, 'EXPECT_BASELINE_SHA256': expected_sha})
            failing = []
            if out.is_file():
                failing = sorted({f'{r["stable_id"]}:{k}' for r in load(out)['results']
                                  for k, v in r['checks'].items() if v == 'fail'})
            results[name] = {
                'description': description, 'must_fail': must_fail,
                'exit_code': run.returncode, 'detected': run.returncode != 0,
                'stage': 'calibration', 'failing_checks': failing[:12],
                **({'refusal': run.stderr.strip()[-300:]} if run.returncode == 2 else {}),
            }
    ok = all(r['detected'] == r['must_fail'] for r in results.values())
    report = {
        'schema_version': 'commerce-v1-calibration-selftest/v1',
        'state_id': STATE,
        'route': args.route,
        'policy': {'path': policy.relative_to(HERE).as_posix(), 'sha256': hashlib.sha256(policy.read_bytes()).hexdigest()},
        'all_as_expected': ok,
        'samples': results,
    }
    out = HERE / 'admission' / f'calibration-selftest.{args.route}.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for name, result in results.items():
        verdict = 'ok' if result['detected'] == result['must_fail'] else 'UNEXPECTED'
        print(f"{verdict:10} {name:16} detected={result['detected']} {result.get('failing_checks', result.get('stage'))}")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
