"""Package every authored A01 draft, calibrate it against the 430 baseline, then run batch admission.

Each run is one round. Outputs go to new directories and are never overwritten:
  packages/<state>/round-<n>/              structured-design-package/v1 from `autophone ui-design package`
  calibration/<state>/round-<n>.json       element-by-element comparison (tools/calibrate.mjs)
  calibration/<state>/round-<n>.png        baseline (left) next to the package reference (right)
  calibration/<state>/round-<n>-inputs/    the authored files, drafts and policy this round used
  calibration/round-<n>-summary.json       per-state outcome plus the admission report digest
  admission/admission-report.json          batch admission (tools/admission.py), rewritten each round

Exit status 1 when a calibration fails or any required state is not admitted.

Usage: python3 tools/build.py --autophone-root ../autophone --round 3 --policy policy/calibration-policy.v2.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--autophone-root', required=True, type=Path)
    parser.add_argument('--round', required=True, type=int)
    parser.add_argument('--policy', required=True, type=Path)
    parser.add_argument('--playwright-module', type=Path,
                        help='defaults to <autophone-root>/node_modules/playwright/index.mjs')
    args = parser.parse_args()
    autophone = args.autophone_root.resolve()
    playwright = (args.playwright_module or autophone / 'node_modules/playwright/index.mjs').resolve()
    policy = (HERE / args.policy).resolve() if not args.policy.is_absolute() else args.policy
    if not policy.is_file() or policy.parent != HERE / 'policy':
        parser.error('--policy must name a file under policy/')

    subprocess.run([sys.executable, '-I', str(HERE / 'tools/derive.py'), '--check'], check=True)
    scope = json.loads((HERE / 'derived/acceptance-scope.json').read_text(encoding='utf-8'))
    provenance = json.loads((HERE / 'derived/provenance.json').read_text(encoding='utf-8'))
    summary = {}
    for state_id, state in scope['states'].items():
        if state.get('draft') == 'not_authored':
            summary[state_id] = {'status': 'not_authored'}
            continue
        package = HERE / 'packages' / state_id / f'round-{args.round}'
        record = HERE / 'calibration' / state_id / f'round-{args.round}.json'
        inputs = HERE / 'calibration' / state_id / f'round-{args.round}-inputs'
        if package.exists() or record.exists() or inputs.exists():
            parser.error(f'round {args.round} already exists for {state_id}; use a new round number')
        shutil.copytree(HERE / 'authored' / state_id, inputs / 'authored')
        shutil.copytree(HERE / state['draft'], inputs / 'draft')
        shutil.copy2(policy, inputs / policy.name)
        package.parent.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            ['uv', 'run', '--group', 'platform', 'python3', '-m', 'autophone.cli', 'ui-design', 'package',
             str(HERE / state['draft']), '--out', str(package)],
            cwd=autophone, capture_output=True, text=True)
        if result.returncode != 0:
            sys.exit(f'{state_id}: packaging refused\n{result.stdout}{result.stderr}')
        packaged = json.loads(result.stdout)
        page = state['screen_id']
        calibration = subprocess.run(
            ['node', 'tools/calibrate.mjs', package.relative_to(HERE).as_posix(),
             f'baseline/{page}/prototype-430.json', f'authored/{state_id}/bindings.json',
             policy.relative_to(HERE).as_posix(),
             record.relative_to(HERE).as_posix(), record.with_suffix('.png').relative_to(HERE).as_posix()],
            cwd=HERE, capture_output=True, text=True,
            env={**os.environ, 'PLAYWRIGHT_MODULE': str(playwright),
                 'EXPECT_BASELINE_SHA256': provenance['baselines'][f'{page}@430']['sha256']})
        print(calibration.stdout, end='')
        if not record.is_file():
            sys.exit(f'{state_id}: calibration did not run\n{calibration.stderr}')
        calibrated = json.loads(record.read_text(encoding='utf-8'))['summary']
        summary[state_id] = {
            'status': 'calibrated' if calibration.returncode == 0 else 'calibration_failed',
            'package': package.relative_to(HERE).as_posix(),
            'design_package_sha256': packaged['design_package_sha256'],
            'mapped_nodes': packaged['mapped_nodes'], 'missing_nodes': packaged['missing_nodes'],
            'calibration': calibrated,
        }
    admission = subprocess.run([sys.executable, '-I', str(HERE / 'tools/admission.py')], capture_output=True, text=True)
    print(admission.stdout, end='')
    report_path = HERE / 'admission' / 'admission-report.json'
    report = json.loads(report_path.read_text(encoding='utf-8'))
    out = HERE / 'calibration' / f'round-{args.round}-summary.json'
    out.write_text(json.dumps({
        'round': args.round,
        'policy': {'path': policy.relative_to(HERE).as_posix(),
                   'sha256': hashlib.sha256(policy.read_bytes()).hexdigest()},
        'states': summary,
        'admission': {'report_sha256': hashlib.sha256(report_path.read_bytes()).hexdigest(),
                      'admitted_states': report['admitted_states'], 'blocked_states': report['blocked_states']},
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    failed = any(s['status'] == 'calibration_failed' for s in summary.values())
    sys.exit(1 if failed or report['blocked_states'] else 0)


if __name__ == '__main__':
    main()
