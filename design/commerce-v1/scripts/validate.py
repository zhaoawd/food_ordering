#!/usr/bin/env python3
"""Validate this design package, not the application implementation."""
from __future__ import annotations
import csv
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
results: list[dict] = []
def load(name: str):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))
def check(name: str, condition: bool, detail: str = ''):
    results.append({'name': name, 'passed': bool(condition), 'detail': detail})
def unique(items: list[dict], key: str = 'id') -> bool:
    return len(items) == len({x[key] for x in items})

def main() -> int:
    files = sorted(ROOT.rglob('*.json'))
    errors=[]
    for f in files:
        try: json.loads(f.read_text(encoding='utf-8'))
        except (ValueError, OSError) as e: errors.append(f'{f.relative_to(ROOT)}: {e}')
    check('all_json_parse', not errors, '; '.join(errors))
    features=load('spec/features.json')['features']; screens=load('spec/screens.json')['screens']
    rules=load('spec/business-rules.json')['rules']; fixtures=load('fixtures/state-registry.json')['fixtures']
    tests=load('tests/acceptance-cases.json')['cases']; tasks=load('agent/tasks.json')['tasks']
    controls=load('spec/ui-contract.json')['controls']
    F={x['id'] for x in features}; S={x['id'] for x in screens}; R={x['id'] for x in rules}
    X={x['id'] for x in fixtures}; T={x['id'] for x in tests}; A={x['id'] for x in tasks}
    states={s['id'] for page in screens for s in page['states']}
    for label,items,key in [('features',features,'id'),('screens',screens,'id'),('rules',rules,'id'),('fixtures',fixtures,'id'),('tests',tests,'id'),('tasks',tasks,'id'),('controls',controls,'stable_id')]:
        check(f'unique_{label}',unique(items,key))
    check('expected_design_counts',(len(F),len(S),len(states),len(T),len(A))==(24,13,71,60,11))
    check('screen_feature_refs',all(set(x['feature_ids'])<=F for x in screens))
    check('feature_screen_test_refs',all(set(x['screen_ids'])<=S and set(x['test_ids'])<=T for x in features))
    check('state_fixture_bijection',states==X)
    check('test_refs',all(x['feature_id'] in F and x['screen_id'] in S and x['state_id'] in states and x['fixture_id'] in X and set(x['rule_ids'])<=R for x in tests))
    screen_states={x['id']:{v['id'] for v in x['states']} for x in screens}
    check('test_states_belong_to_screen',all(x['state_id'] in screen_states[x['screen_id']] for x in tests))
    check('each_feature_has_tests',all(x['test_ids'] and all(next(t for t in tests if t['id']==tid)['feature_id']==x['id'] for tid in x['test_ids']) for x in features))
    check('all_native_cases_unexecuted',all(x['status']=='specified_not_executed' for x in tests))
    check('control_refs_and_hit_targets',all(x['screen_id'] in S and (x['min_hit_target_pt'] is None or x['min_hit_target_pt']>=44) for x in controls))
    task_validator=Draft202012Validator(load('spec/task.schema.json'))
    task_errors=[f"{x['id']}: {e.message}" for x in tasks for e in task_validator.iter_errors(x)]
    check('task_schema',not task_errors,'; '.join(task_errors))
    check('task_refs_and_input_files',all(set(x['depends_on'])<=A and set(x['feature_ids'])<=F and set(x['acceptance_test_ids'])<=T and all((ROOT/v).is_file() for v in x['inputs']) for x in tasks))
    edges={x['id']:x['depends_on'] for x in tasks}; visiting=set(); visited=set()
    def visit(a):
        if a in visiting: return False
        if a in visited: return True
        visiting.add(a)
        for dep in edges[a]:
            if dep not in edges or not visit(dep): return False
        visiting.remove(a);visited.add(a);return True
    check('task_dag_acyclic',all(visit(a) for a in edges))
    check('fixtures_seed_files',all(all((ROOT/f).exists() for f in x['seed_files']) for x in fixtures))
    machines=load('spec/state-machines.json')['machines']
    check('machine_states_valid',all(m['initial'] in m['states'] and all(t['from'] in m['states'] and t['to'] in m['states'] for t in m['transitions']) for m in machines))
    commerce=load('fixtures/commerce.json'); q=commerce['golden_quote']; old=commerce['legacy_fixture_policy']
    check('pickup_golden_independent',3290*2+200*2-1000==q['payable_cents']==5980)
    check('delivery_golden_independent',q['payable_cents']+300==6280)
    check('legacy_golden_independent',3200*2+200*2+300-1000==old['two_units_save10_payable_cents']==6100)
    check('money_arithmetic',q['goods_cents']+q['packaging_cents']+q['delivery_cents']-q['discount_cents']==q['payable_cents'])
    draft=load('fixtures/quote-response.json'); qv=Draft202012Validator(load('spec/quote.schema.json'),format_checker=FormatChecker())
    err=[e.message for e in qv.iter_errors(draft)];check('quote_example_schema',not err,'; '.join(err))
    api=load('api/openapi.json');ref_errors=[]
    def walk(x):
        if isinstance(x,dict):
            if '$ref' in x:
                ref=x['$ref']
                try:
                    assert ref.startswith('#/')
                    v=api
                    for part in ref[2:].split('/'): v=v[part.replace('~1','/').replace('~0','~')]
                except (KeyError,AssertionError,TypeError): ref_errors.append(ref)
            for v in x.values():walk(v)
        elif isinstance(x,list):
            for v in x:walk(v)
    walk(api);check('openapi_internal_references',not ref_errors,'; '.join(ref_errors))
    check('openapi_is_proposal',api['openapi'].startswith('3.1') and all('.invalid' in s['url'] for s in api['servers']))
    entity=load('spec/domain-model.json')['entities'];en={x['name'] for x in entity}
    check('entity_references',all(set(x['references'])<=en for x in entity))
    check('required_handoff_files',all((ROOT/p).exists() for p in ['README.md','docs/PRODUCT_DESIGN.md','agent/START_HERE.md','ui/prototype.html','ui/overview.html','ui/figma-manifest.json']))
    with (ROOT/'spec/traceability.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f);writer.writerow(['test_id','feature_id','feature_name','screen_id','state_id','fixture_id','rule_ids','layer','implementation_task_ids','status'])
        names={x['id']:x['name'] for x in features}
        for t in tests:
            writer.writerow([t['id'],t['feature_id'],names[t['feature_id']],t['screen_id'],t['state_id'],t['fixture_id'],';'.join(t['rule_ids']),t['layer'],';'.join(a['id'] for a in tasks if t['id'] in a['acceptance_test_ids']),t['status']])
    report={'scope':'design-package static checks only; NOT app/native acceptance','checked_at_utc':datetime.now(timezone.utc).isoformat(),'passed':sum(x['passed'] for x in results),'total':len(results),'checks':results,'native_execution':'not_run','existing_repository_tests':'not_run','known_limitations':['No complete OpenAPI semantic validator; only JSON parsing and local $ref resolution.','Fixtures describe recipes; native adapters are not implemented.','Specification schemas constrain selected objects; not every domain object has a formal JSONSchema.']}
    (ROOT/'evidence').mkdir(exist_ok=True)
    (ROOT/'evidence/package-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if all(x['passed'] for x in results) else 1
if __name__=='__main__':raise SystemExit(main())
