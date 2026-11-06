"""Package every authored A01 draft with autophone and calibrate it against the 430 prototype baseline.

Each run is one calibration round. Outputs go to new directories and are never overwritten:
  packages/<state>/round-<n>/          structured-design-package/v1 from `autophone ui-design package`
  calibration/<state>/round-<n>.json   element-by-element geometry comparison (tools/calibrate.mjs)
  calibration/<state>/round-<n>.png    baseline (left) next to the package reference (right)

Usage: python3 tools/build.py --autophone-root ../autophone --round 2 [--playwright-module <index.mjs>]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--autophone-root', required=True, type=Path)
    parser.add_argument('--round', required=True, type=int)
    parser.add_argument('--playwright-module', type=Path,
                        help='defaults to <autophone-root>/node_modules/playwright/index.mjs')
    args = parser.parse_args()
    autophone = args.autophone_root.resolve()
    playwright = (args.playwright_module or autophone / 'node_modules/playwright/index.mjs').resolve()

    subprocess.run([sys.executable, '-I', str(HERE / 'tools/derive.py'), '--check'], check=True)
    scope = json.loads((HERE / 'derived/acceptance-scope.json').read_text(encoding='utf-8'))
    summary = {}
    for state_id, state in scope['states'].items():
        if state.get('draft') == 'not_authored':
            summary[state_id] = {'status': 'not_authored'}
            continue
        package = HERE / 'packages' / state_id / f'round-{args.round}'
        record = HERE / 'calibration' / state_id / f'round-{args.round}.json'
        if package.exists() or record.exists():
            parser.error(f'round {args.round} already exists for {state_id}; use a new round number')
        package.parent.mkdir(parents=True, exist_ok=True)
        record.parent.mkdir(parents=True, exist_ok=True)
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
             record.relative_to(HERE).as_posix(), record.with_suffix('.png').relative_to(HERE).as_posix()],
            cwd=HERE, env={**os.environ, 'PLAYWRIGHT_MODULE': str(playwright)}, capture_output=True, text=True)
        print(calibration.stdout, end='')
        calibrated = json.loads(record.read_text(encoding='utf-8'))['summary']
        summary[state_id] = {
            'status': 'calibrated' if calibration.returncode == 0 else 'calibration_failed',
            'package': package.relative_to(HERE).as_posix(),
            'design_package_sha256': packaged['design_package_sha256'],
            'mapped_nodes': packaged['mapped_nodes'], 'missing_nodes': packaged['missing_nodes'],
            'calibration': calibrated,
        }
    out = HERE / 'calibration' / f'round-{args.round}-summary.json'
    out.write_text(json.dumps({'round': args.round, 'states': summary}, ensure_ascii=False, indent=2) + '\n',
                   encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if any(s['status'] == 'calibration_failed' for s in summary.values()):
        sys.exit(1)


if __name__ == '__main__':
    main()
