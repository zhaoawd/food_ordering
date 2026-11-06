"""Judge whether the App's stack can render each text the way the packaged reference does.

Input: the faces measured by measure_text_faces.mjs for one packaged state, and the App's target-stack
profile (autophone apps/<app>/target_stack/target-stack-profile.v<n>.json). For every rendered text node:

  - each script run maps its resolved faces to the React Native weights that give that face; runs of
    a class the profile does not judge (whitespace) are skipped;
  - the node's achievable weights are the intersection over its runs; one Text gets one weight;
  - achievable      non-empty intersection; `implement_with` lists the weights, and
                    `css_weight_differs` notes when the prototype's CSS weight is not among them;
  - not_achievable  every face is known but no single weight gives them all;
  - undecidable     a face the profile does not list, or the measurement split changed the layout.

Evidence is the weakest level among the profile entries used; `assumed` entries still need device
evidence. Conclusions hold only for this profile version, its font environment and the measured texts.

Usage: python3 -I tools/achievability.py <faces.json> <profile.json> <out.json>
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

EVIDENCE_ORDER = ['assumed', 'source_code', 'device_verified']
WGHT = re.compile(r'_wght([0-9A-Fa-f]+)(?:_|$)')


def face_weights(face: dict, profile: dict) -> tuple[set[str] | None, str | None, str]:
    """RN weights that give this face, the evidence level, and how the face was matched."""
    postscript = face['postscript']
    for entry in profile['faces']:
        if entry['match'].get('postscript') == postscript:
            return set(entry['rn_weights']), entry['evidence'], f'postscript {postscript}'
    for entry in profile['faces']:
        family = entry['match'].get('variable_family')
        if family and postscript.startswith(family + '-'):
            axis = WGHT.search(postscript)
            if axis is None:
                return None, None, f'variable instance without wght axis: {postscript}'
            weight = int(axis.group(1), 16) / 65536
            label = str(int(weight)) if weight == int(weight) else f'{weight:g}'
            allowed = {label} & set(entry['rn_weights'])
            return allowed, entry['evidence'], f'{family} wght {label}'
    return None, None, f'face not in profile: {postscript}'


def judge(node: dict, profile: dict) -> dict:
    skipped = {item['text_class'] for item in profile['not_judged']}
    if not node['wrap_unchanged']:
        return {'outcome': 'undecidable', 'reason': 'measurement split changed the layout'}
    allowed: set[str] | None = None
    evidence = []
    runs = []
    for run in node['runs']:
        if run['class'] in skipped:
            runs.append({'text': run['text'], 'class': run['class'], 'judged': False})
            continue
        run_allowed: set[str] | None = None
        matched = []
        for face in run['faces']:
            weights, level, how = face_weights(face, profile)
            matched.append(how)
            if weights is None:
                return {'outcome': 'undecidable', 'reason': how, 'run': run['text']}
            evidence.append(level)
            run_allowed = weights if run_allowed is None else run_allowed & weights
        if not run['faces']:
            return {'outcome': 'undecidable', 'reason': 'run has no measured face', 'run': run['text']}
        runs.append({'text': run['text'], 'class': run['class'], 'faces': matched,
                     'rn_weights': sorted(run_allowed, key=str)})
        allowed = run_allowed if allowed is None else allowed & run_allowed
    if allowed is None:
        return {'outcome': 'not_judged', 'reason': 'only runs the profile does not judge', 'runs': runs}
    level = min(evidence, key=EVIDENCE_ORDER.index) if evidence else None
    css = str(node['css']['fontWeight'])
    if not allowed:
        return {'outcome': 'not_achievable', 'evidence': level, 'runs': runs}
    implement = sorted(allowed, key=lambda w: (not w.isdigit(), int(w) if w.isdigit() else 0, w))
    return {'outcome': 'achievable', 'evidence': level, 'implement_with': implement,
            'css_weight_differs': css not in allowed, 'runs': runs}


def main() -> None:
    faces_path, profile_path, out_path = map(Path, sys.argv[1:4])
    faces = json.loads(faces_path.read_text(encoding='utf-8'))
    profile = json.loads(profile_path.read_text(encoding='utf-8'))
    results = []
    for node in faces['nodes']:
        verdict = judge(node, profile)
        results.append({'owner': node['owner'], 'stable_id': node['stable_id'], 'text': node['text'],
                        'css_weight': str(node['css']['fontWeight']), **verdict})
    counts: dict[str, int] = {}
    for result in results:
        key = result['outcome'] + (f"/{result['evidence']}" if result.get('evidence') else '')
        counts[key] = counts.get(key, 0) + 1
    report = {
        'schema_version': 'commerce-v1-text-achievability/v1',
        'faces': {'path': faces_path.as_posix(), 'sha256': hashlib.sha256(faces_path.read_bytes()).hexdigest(),
                  'design_package_sha256': faces['package']['design_package_sha256']},
        'profile': {'path': profile_path.as_posix(), 'sha256': hashlib.sha256(profile_path.read_bytes()).hexdigest(),
                    'app': profile['app'], 'version': profile['version']},
        'counts': dict(sorted(counts.items())),
        'blocking': [r for r in results if r['outcome'] in ('not_achievable', 'undecidable')],
        'results': results,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(report['counts'], ensure_ascii=False))
    sys.exit(1 if report['blocking'] else 0)


if __name__ == '__main__':
    main()
