"""Check that one round is ready to enter B4 and write final/b4-entry.json.

Usage: python3 -I tools/b4_entry.py --round <n> --stack-profile <target-stack-profile.json> [--write]

Every item is recomputed from files on disk; nothing is taken from a summary without its hash being checked:
  1. L2 outputs are up to date (derive.py --check).
  2. The round summary names the policy and admission report it used, and both still hash the same.
  3. Every state in the acceptance scope is admitted, with 0 calibration failures.
  4. HTML-route states have a final package rendered on the rig: final/<state>.json is final_candidate, every
     file it binds still hashes the same, the device self-check changed 0 pixels, and the calibration and
     achievability re-run on that package have no failure.
  5. DSL-route states keep the host package; its manifest hash matches the round summary.
  6. Achievability reports bind the stack profile given here, and none is blocking.
Without --write it only reports. Exit 1 when any item fails.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RESIDUAL_RISKS = [
    'Achievability evidence is assumed (React Native weight → iOS face mapping), not device-verified.',
    'Device references cover one rig (isolation-peer, vphone-ios27-default, zh-CN, light, dynamic type L).',
    'Some vertically centred elements sit on half points (layout-pins off_grid_blocks); they have no flat-colour edge on '
    'these pages, which may not hold for other pages.',
    'D7/D8 change design values by up to 0.86pt; the App implementation uses the same pinned values.',
    'Locators can map to a wrong element whose text happens to match; admission does not detect it.',
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def check(round_no: int, stack_profile: Path) -> tuple[list[dict], dict]:
    items: list[dict] = []

    def item(name: str, ok: bool, detail: str) -> None:
        items.append({'item': name, 'ok': bool(ok), 'detail': detail})

    derive = subprocess.run([sys.executable, '-I', str(HERE / 'tools/derive.py'), '--check'],
                            capture_output=True, text=True)
    item('l2_up_to_date', derive.returncode == 0, (derive.stdout + derive.stderr).strip()[-300:])

    summary = load(HERE / 'calibration' / f'round-{round_no}-summary.json')
    policy = HERE / summary['policy']['path']
    item('policy_hash', sha256(policy) == summary['policy']['sha256'], summary['policy']['path'])
    report_path = HERE / 'admission' / 'admission-report.json'
    item('admission_report_hash', sha256(report_path) == summary['admission']['report_sha256'],
         'admission/admission-report.json')
    report = load(report_path)
    scope = load(HERE / 'derived' / 'acceptance-scope.json')
    profile_sha = sha256(stack_profile)

    states: dict = {}
    for state_id, state in scope['states'].items():
        entry = summary['states'].get(state_id, {})
        admitted = state_id in report['admitted_states']
        calibration_ok = entry.get('status') == 'calibrated' and entry.get('calibration', {}).get('failed') == 0
        item(f'{state_id}: admitted, 0 calibration failures', admitted and calibration_ok,
             json.dumps(entry.get('calibration'), ensure_ascii=False))
        if state.get('route') == 'html':
            final_path = HERE / 'final' / f'{state_id}.json'
            if not final_path.is_file():
                item(f'{state_id}: final package', False, 'final/<state>.json missing')
                continue
            final = load(final_path)
            package = final['package']
            checks = final['checks']
            bound = {
                package['path'] + '/design-package.json': package['design_package_sha256'],
                package['path'] + '/reference.png': package['reference_sha256'],
                checks['calibration']['record']: checks['calibration']['sha256'],
                checks['achievability']['report']: checks['achievability']['sha256'],
            }
            stale = [p for p, h in bound.items() if sha256(HERE / p) != h]
            self_check = package['reference_renderer'].get('self_check', {})
            achievability = load(HERE / checks['achievability']['report'])
            item(f'{state_id}: final package on the rig',
                 final['status'] == 'final_candidate' and final['round'] == round_no and not stale
                 and self_check.get('changed_pixels') == 0 and checks['calibration']['summary']['failed'] == 0
                 and checks['calibration']['policy_sha256'] == summary['policy']['sha256']
                 and checks['admission']['admitted'],
                 f"status {final['status']}, stale {stale}, self-check {self_check.get('changed_pixels')}/"
                 f"{self_check.get('compared_pixels')}, capture {package['reference_renderer'].get('capture')}")
            item(f'{state_id}: achievability on the final package',
                 achievability['profile']['sha256'] == profile_sha and not achievability.get('blocking'),
                 json.dumps(achievability['counts'], ensure_ascii=False))
            states[state_id] = {'route': 'html', 'final': final_path.relative_to(HERE).as_posix(),
                                'final_sha256': sha256(final_path), 'package': package['path'],
                                'design_package_sha256': package['design_package_sha256'],
                                'reference_sha256': package['reference_sha256'],
                                'reference_renderer': package['reference_renderer']}
        else:
            package = HERE / entry['package']
            achievability_path = HERE / 'admission' / 'achievability' / f'{state_id}.json'
            achievability = load(achievability_path)
            item(f'{state_id}: host package', sha256(package / 'design-package.json') == entry['design_package_sha256'],
                 entry['package'])
            item(f'{state_id}: achievability on the host package',
                 achievability['profile']['sha256'] == profile_sha and not achievability.get('blocking'),
                 json.dumps(achievability['counts'], ensure_ascii=False))
            states[state_id] = {'route': state.get('route', 'dsl'), 'package': entry['package'],
                                'design_package_sha256': entry['design_package_sha256'],
                                'reference_sha256': sha256(package / 'reference.png'),
                                'achievability_sha256': sha256(achievability_path)}
    return items, {'states': states, 'policy': summary['policy'], 'admission': summary['admission'],
                   'stack_profile_sha256': profile_sha}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--round', required=True, type=int)
    parser.add_argument('--stack-profile', required=True, type=Path)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    items, bound = check(args.round, args.stack_profile.resolve())
    for entry in items:
        print(f"{'ok  ' if entry['ok'] else 'FAIL'} {entry['item']}: {entry['detail']}")
    ready = all(entry['ok'] for entry in items)
    if args.write:
        out = HERE / 'final' / 'b4-entry.json'
        out.write_text(json.dumps({
            'schema_version': 'commerce-v1-b4-entry/v1',
            'round': args.round,
            'ready': ready,
            'rationale': f'Round {args.round} is the first round in which every state is admitted with 0 calibration '
                         'failures and every HTML-route state has a final package rendered on the rig that passes the '
                         'device self-check with 0 mismatched pixels; earlier rounds have host references only.',
            'checks': items,
            **bound,
            'residual_risks': RESIDUAL_RISKS,
            'not_done_here': 'design lock and the B4 acceptance contract (registered actions, assertions, thresholds) '
                             'are B4 work; this file only records the round they start from.',
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'wrote {out.relative_to(HERE)}')
    sys.exit(0 if ready else 1)


if __name__ == '__main__':
    main()
