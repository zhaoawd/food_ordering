"""使用本地 autophone 编译器生成新的设计包目录，不覆盖既有产物。"""
import argparse
import hashlib
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--autophone-root', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    destination = args.out.resolve()
    if destination.exists():
        parser.error('输出目录已存在，请指定新的目录。')
    sys.path.insert(0, str(args.autophone_root.resolve()))
    from autophone.workflow.requirement.prototype_design_package import package_prototype_design
    suite = json.loads((source / 'suite.json').read_text())
    destination.mkdir(parents=True)
    reports = []
    for feature in suite['features']:
        for state in feature['states']:
            key = Path(state['design_package']).name
            target = destination / key
            package_prototype_design(source / state['draft'], target)
            manifest = json.loads((target / 'design-package.json').read_text())
            assert not manifest['mapping_gaps'], manifest['mapping_gaps']
            reports.append({
                'state_id': state['state_id'],
                'package': key,
                'element_count': len(manifest['elements']),
                'property_count': sum(len(e['properties']) for e in manifest['elements']),
                'mapping_gaps': manifest['mapping_gaps'],
                'manifest_sha256': hashlib.sha256((target / 'design-package.json').read_bytes()).hexdigest(),
                'reference_sha256': hashlib.sha256((target / 'reference.png').read_bytes()).hexdigest(),
                'toolchain': manifest['toolchain'],
            })
            print(f"{key}: {len(manifest['elements'])} elements, 0 mapping gaps", flush=True)
    (destination / 'validation-report.json').write_text(json.dumps({
        'scope': 'design_schema_binding_compile_render_mapping',
        'app_implementation_verified': False,
        'device_behavior_verified': False,
        'states': reports,
    }, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
