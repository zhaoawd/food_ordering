"""Batch design admission for A01: check each state's drafts against the independent batch contract.

The required set comes from derived/batch-contract.json, which derive.py builds from the frozen
design package alone. This script never reads it from an authored file. Every required element
ends in exactly one class:

  covered               emitted with a stable_id and declared in acceptance targets, and calibrated
  covered_by_decision   accepted, but added by a recorded decision with no prototype baseline to calibrate
                        against (reported; does not block)
  incomplete            state not authored, element missing, or emitted but not accepted
  platform_unsupported  an icon or illustration in the prototype render the DSL cannot draw (reported,
                        never counted as covered; does not block admission on its own)
  excluded              listed in the contract with a reason and a source
  asset_preserved       an icon or illustration kept by the HTML route (reported, does not block)

Template IDs the package does not resolve are reported as incomplete for the state that needs them.
A state is admitted only when it has no incomplete entry. Exit status 1 when any state is blocked.

Usage: python3 -I tools/admission.py [--out admission/admission-report.json]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def walk(node):
    yield node
    for child in node.get('children', []):
        yield from walk(child)


def baseline_assets(screen_id: str) -> list[dict]:
    """Icons and illustrations in the frozen prototype render (SVG children), located by the nearest
    test ID or class. Read from the baseline, not the draft, so an icon the draft left out still counts."""
    tree = load(HERE / 'baseline' / screen_id / 'prototype-430.json')['tree']
    found = []

    def visit(node, owner):
        owner = node.get('testid') or owner
        if node.get('svg') and node['box'][2] > 0 and node['box'][3] > 0:
            found.append({'owner': owner, 'class': node.get('class'), 'box': node['box']})
        for child in node['children']:
            visit(child, owner)

    visit(tree, None)
    return found


def admit_state(state_id: str, spec: dict) -> dict:
    route_draft = HERE / 'drafts-html' / state_id
    html_spec = load(route_draft / 'prototype-spec.json') if (route_draft / 'prototype-spec.json').is_file() else None
    draft = HERE / 'drafts' / state_id
    entries = []
    if not (draft / 'ui-document.json').is_file() and html_spec is None:
        for stable_id, need in spec['required'].items():
            entries.append({'stable_id': stable_id, 'class': 'incomplete', 'reason': 'state_not_authored',
                            'sources': need['sources']})
    else:
        if html_spec is not None:
            # HTML route: the adapter tags exactly node_scope; packaging refuses a target it cannot map.
            emitted = set(html_spec['node_scope'])
            accepted = {t['stable_id']: t['properties'] for t in html_spec['acceptance']['targets']}
        else:
            document = load(draft / 'ui-document.json')
            emitted = {n['stable_id'] for screen in document['screens'] for n in walk(screen['root'])
                       if n.get('stable_id')}
            accepted = {t['stable_id']: t['properties'] for entry in document['acceptance']
                        for t in entry.get('targets', [])}
        bindings_path = HERE / 'derived' / 'bindings' / f'{state_id}.json'
        calibration = load(bindings_path)['calibration'] if bindings_path.is_file() else {}
        calibrated = set(calibration.get('elements', {}))
        # Elements a recorded decision added have no prototype baseline; they are reported, not calibrated.
        decided = {k: v for k, v in calibration.get('uncalibrated', {}).items()}
        # Every other accepted target must be calibrated against the baseline, or its draft geometry and
        # style were never checked against the design.
        for stable_id in sorted(set(accepted) - calibrated - set(decided)):
            entries.append({'stable_id': stable_id, 'class': 'incomplete', 'reason': 'accepted_not_calibrated',
                            'sources': ['ui-document acceptance targets']})
        for stable_id, need in spec['required'].items():
            if stable_id not in emitted:
                cls, reason = 'incomplete', 'not_emitted'
            elif stable_id not in accepted:
                cls, reason = 'incomplete', 'emitted_not_accepted'
            elif stable_id in decided:
                cls, reason = 'covered_by_decision', decided[stable_id]
            else:
                cls, reason = 'covered', None
            entries.append({'stable_id': stable_id, 'class': cls, 'sources': need['sources'],
                            **({'reason': reason} if reason else {'properties': accepted[stable_id]})})
    for item in spec['unresolved']:
        entries.append({'stable_id': item['stable_id'], 'class': 'incomplete', 'reason': 'contract_unresolved',
                        'detail': item['reason'], 'sources': [item['derived_from']]})
    for item in spec['excluded']:
        entries.append({'stable_id': item['stable_id'], 'class': 'excluded', 'reason': item['reason'],
                        'source': item['source']})
    # The HTML route renders the prototype itself, so its icons and illustrations are in the reference.
    asset_class, asset_reason = (('asset_preserved', 'rendered_from_prototype') if html_spec is not None
                                 else ('platform_unsupported', 'asset_not_representable'))
    entries += [{'owner': asset['owner'], 'element_class': asset['class'], 'box': asset['box'],
                 'class': asset_class, 'reason': asset_reason}
                for asset in baseline_assets(spec['screen_id'])]
    counts = {}
    for entry in entries:
        counts[entry['class']] = counts.get(entry['class'], 0) + 1
    return {'route': 'html' if html_spec is not None else 'dsl',
            'admitted': counts.get('incomplete', 0) == 0, 'counts': dict(sorted(counts.items())),
            'entries': entries}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--out', type=Path, default=HERE / 'admission' / 'admission-report.json')
    args = parser.parse_args()
    contract_path = HERE / 'derived' / 'batch-contract.json'
    contract = load(contract_path)
    states = {state_id: admit_state(state_id, spec) for state_id, spec in contract['states'].items()}
    report = {
        'schema_version': 'commerce-v1-batch-admission/v1',
        'batch': contract['batch'],
        'contract_sha256': hashlib.sha256(contract_path.read_bytes()).hexdigest(),
        'admitted_states': sorted(s for s, r in states.items() if r['admitted']),
        'blocked_states': sorted(s for s, r in states.items() if not r['admitted']),
        'states': states,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for state_id, result in states.items():
        print(f"{state_id}: {'admitted' if result['admitted'] else 'blocked'} {result['counts']}")
        for entry in result['entries']:
            if entry['class'] == 'incomplete':
                print(f"  incomplete {entry['stable_id']}: {entry['reason']}")
    sys.exit(1 if report['blocked_states'] else 0)


if __name__ == '__main__':
    main()
