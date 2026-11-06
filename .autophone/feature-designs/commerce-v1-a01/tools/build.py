"""Package every authored A01 draft, calibrate it against the 430 baseline, then run batch admission.

Each run is one round. Outputs go to new directories and are never overwritten:
  packages/<state>/round-<n>/              structured-design-package/v1 from `autophone ui-design package`
  calibration/<state>/round-<n>.json       element-by-element comparison (tools/calibrate.mjs)
  calibration/<state>/round-<n>.png        baseline (left) next to the package reference (right)
  calibration/<state>/round-<n>-inputs/    the authored files, drafts and policy this round used
  calibration/<state>/round-<n>-faces.json resolved faces per text run of the packaged page
  admission/achievability/<state>.json     text achievability against the App's target-stack profile
  calibration/round-<n>-summary.json       per-state outcome plus the admission report digest
  admission/admission-report.json          batch admission (tools/admission.py), rewritten each round

Before packaging, assets/ is re-extracted into a scratch directory and must be identical.
With --device-reference --rig-target, admitted HTML-route states are then rendered on the rig through
autophone's WKWebView reference tool (which reserves and locks the rig), the calibration and
achievability checks are re-run on that final package, and final/<state>.json binds them by hash.
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
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def check_assets_current(env: dict) -> None:
    """Re-extract the SVG assets into a scratch directory; the committed assets/ must be identical."""
    with tempfile.TemporaryDirectory(prefix='assets-check-') as scratch:
        subprocess.run(['node', 'tools/extract_assets.mjs', '../../../design/commerce-v1/ui/prototype.html', scratch,
                        'home', 'orders'], cwd=HERE, env=env, check=True, capture_output=True)
        fresh = {p.relative_to(scratch).as_posix(): p.read_bytes() for p in Path(scratch).rglob('*') if p.is_file()}
        kept = {p.relative_to(HERE / 'assets').as_posix(): p.read_bytes()
                for p in (HERE / 'assets').rglob('*') if p.is_file()}
        if fresh != kept:
            changed = sorted(set(fresh) ^ set(kept) | {k for k in set(fresh) & set(kept) if fresh[k] != kept[k]})
            sys.exit('assets/ is stale; re-run tools/extract_assets.mjs: ' + ', '.join(changed[:10]))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def device_reference_round(round_no: int, scope: dict, summary: dict, *, autophone: Path, rig_target: Path,
                           policy: Path, node_env: dict, stack_profile: Path, provenance: dict,
                           admission_report: Path) -> bool:
    """Render each admitted HTML-route state's reference on the rig, re-run the checks that apply to the
    final package, and bind them by hash in final/<state>.json. Returns True when any state failed."""
    batch = json.loads((HERE / 'batch' / 'a01-batch.json').read_text(encoding='utf-8'))
    device = batch['device_reference']
    report = json.loads(admission_report.read_text(encoding='utf-8'))
    failed = False
    for state_id, state in scope['states'].items():
        if state.get('route') != 'html' or state_id not in report['admitted_states']:
            continue
        page = state['screen_id']
        package = HERE / 'packages' / state_id / f'round-{round_no}-device'
        command = ['uv', 'run', '--group', 'platform', '--group', 'frida', 'python3', '-m',
                   'tools.design.ios_wkwebview_reference', str(HERE / state['draft']), '--out', str(package),
                   '--reference-renderer', 'ios-wkwebview', '--self-check', device['self_check'],
                   '--env-fingerprint', device['env_fingerprint'], '--device-profile', device['device_profile'],
                   '--locale', device['locale'], '--theme', device['theme'], '--dynamic-type', device['dynamic_type'],
                   '--target', str(rig_target)]
        for color in device['include_colors'][page]:
            command += ['--include-color', color]
        run = subprocess.run(command, cwd=autophone, capture_output=True, text=True)
        if run.returncode != 0:
            print(f'device reference {state_id}: refused\n{run.stderr.strip()[-600:]}')
            summary[state_id]['device_reference'] = {'status': 'refused', 'detail': run.stderr.strip()[-600:]}
            failed = True
            continue
        record = HERE / 'calibration' / state_id / f'round-{round_no}-device.json'
        calibration = subprocess.run(
            ['node', 'tools/calibrate.mjs', package.relative_to(HERE).as_posix(), f'baseline/{page}/prototype-430.json',
             f'derived/bindings/{state_id}.json', policy.relative_to(HERE).as_posix(), record.relative_to(HERE).as_posix()],
            cwd=HERE, capture_output=True, text=True,
            env={**node_env, 'EXPECT_BASELINE_SHA256': provenance['baselines'][f'{page}@430']['sha256']})
        faces = record.with_name(f'round-{round_no}-device-faces.json')
        subprocess.run(['node', 'tools/measure_text_faces.mjs', package.relative_to(HERE).as_posix(),
                        faces.relative_to(HERE).as_posix()], cwd=HERE, env=node_env, check=True, capture_output=True)
        achievability_path = HERE / 'admission' / 'achievability' / f'{state_id}.final.json'
        achievability = subprocess.run(
            [sys.executable, '-I', 'tools/achievability.py', faces.relative_to(HERE).as_posix(), str(stack_profile),
             achievability_path.relative_to(HERE).as_posix()], cwd=HERE, capture_output=True, text=True)
        manifest = json.loads((package / 'design-package.json').read_text(encoding='utf-8'))
        renderer = manifest.get('reference_renderer') or {}
        ok = calibration.returncode == 0 and achievability.returncode == 0 and renderer.get('self_check', {}).get('changed_pixels') == 0
        final = {
            'schema_version': 'commerce-v1-final-package/v1',
            'state_id': state_id, 'round': round_no, 'status': 'final_candidate' if ok else 'checks_failed',
            'package': {'path': package.relative_to(HERE).as_posix(),
                        'design_package_sha256': sha256(package / 'design-package.json'),
                        'reference_sha256': sha256(package / 'reference.png'),
                        'reference_renderer': renderer},
            'host_package': {'path': summary[state_id]['package'], 'design_package_sha256': summary[state_id]['design_package_sha256']},
            'checks': {
                'calibration': {'record': record.relative_to(HERE).as_posix(), 'sha256': sha256(record),
                                'summary': json.loads(record.read_text(encoding='utf-8'))['summary'],
                                'policy_sha256': sha256(policy)},
                'achievability': {'report': achievability_path.relative_to(HERE).as_posix(), 'sha256': sha256(achievability_path),
                                  'counts': json.loads(achievability_path.read_text(encoding='utf-8'))['counts']},
                'admission': {'report': admission_report.relative_to(HERE).as_posix(), 'sha256': sha256(admission_report),
                              'admitted': state_id in report['admitted_states']},
            },
        }
        out = HERE / 'final' / f'{state_id}.json'
        out.parent.mkdir(exist_ok=True)
        out.write_text(json.dumps(final, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        summary[state_id]['device_reference'] = {'status': final['status'], 'final': out.relative_to(HERE).as_posix()}
        print(f"device reference {state_id}: {final['status']} (self-check changed {renderer.get('self_check', {}).get('changed_pixels')}, "
              f"calibration {final['checks']['calibration']['summary']})")
        failed = failed or not ok
    summary_path = HERE / 'calibration' / f'round-{round_no}-summary.json'
    data = json.loads(summary_path.read_text(encoding='utf-8'))
    data['states'] = summary
    summary_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return failed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--autophone-root', required=True, type=Path)
    parser.add_argument('--round', required=True, type=int)
    parser.add_argument('--policy', required=True, type=Path)
    parser.add_argument('--playwright-module', type=Path,
                        help='defaults to <autophone-root>/node_modules/playwright/index.mjs')
    parser.add_argument('--stack-profile', type=Path,
                        help='defaults to <autophone-root>/apps/food_ordering_v2/target_stack/target-stack-profile.v1.json')
    parser.add_argument('--device-reference', action='store_true',
                        help='after host admission, render HTML-route references on the rig (BL-213) and bind final packages')
    parser.add_argument('--rig-target', type=Path,
                        help='rig runtime target for --device-reference (runs/<...>/runtime/target-<n>.json)')
    args = parser.parse_args()
    if args.device_reference and not args.rig_target:
        parser.error('--device-reference needs --rig-target')
    autophone = args.autophone_root.resolve()
    playwright = (args.playwright_module or autophone / 'node_modules/playwright/index.mjs').resolve()
    stack_profile = (args.stack_profile or autophone / 'apps/food_ordering_v2/target_stack/target-stack-profile.v1.json').resolve()
    node_env = {**os.environ, 'PLAYWRIGHT_MODULE': str(playwright),
                'COMPOSITOR_PROFILES': str(autophone / 'autophone/workflow/requirement/prototype_compositor.json')}
    check_assets_current(node_env)
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
        shutil.copy2(HERE / 'derived' / 'bindings' / f'{state_id}.json', inputs / 'bindings.resolved.json')
        shutil.copy2(HERE / 'decisions' / 'a01-decisions.json', inputs / 'a01-decisions.json')
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
             f'baseline/{page}/prototype-430.json', f'derived/bindings/{state_id}.json',
             policy.relative_to(HERE).as_posix(),
             record.relative_to(HERE).as_posix(), record.with_suffix('.png').relative_to(HERE).as_posix()],
            cwd=HERE, capture_output=True, text=True,
            env={**node_env, 'EXPECT_BASELINE_SHA256': provenance['baselines'][f'{page}@430']['sha256']})
        print(calibration.stdout, end='')
        if not record.is_file():
            sys.exit(f'{state_id}: calibration did not run\n{calibration.stderr}')
        calibrated = json.loads(record.read_text(encoding='utf-8'))['summary']
        faces = record.with_name(f'round-{args.round}-faces.json')
        subprocess.run(['node', 'tools/measure_text_faces.mjs', package.relative_to(HERE).as_posix(),
                        faces.relative_to(HERE).as_posix()], cwd=HERE, env=node_env, check=True,
                       capture_output=True)
        achievability = subprocess.run(
            [sys.executable, '-I', 'tools/achievability.py', faces.relative_to(HERE).as_posix(), str(stack_profile),
             f'admission/achievability/{state_id}.json'], cwd=HERE, capture_output=True, text=True)
        print(f'achievability {state_id}: {achievability.stdout.strip()}')
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
    if failed or report['blocked_states'] or not args.device_reference:
        sys.exit(1 if failed or report['blocked_states'] else 0)
    device_failed = device_reference_round(
        args.round, scope, summary, autophone=autophone, rig_target=args.rig_target.resolve(), policy=policy,
        node_env=node_env, stack_profile=stack_profile, provenance=provenance, admission_report=report_path)
    sys.exit(1 if device_failed else 0)


if __name__ == '__main__':
    main()
