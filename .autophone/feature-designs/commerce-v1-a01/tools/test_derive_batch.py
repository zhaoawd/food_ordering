"""Regression tests for moving derive.py's rules into the batch definition.

Run: python3 -I -m unittest discover -s .autophone/feature-designs/commerce-v1-a01/tools -p 'test_*.py'

1. Outputs: with the recorded L0 and L1 inputs, every generated file matches batch/l2-digest.json, which
   was produced by the code before the move (4c39a70). A change of business meaning must update the
   digest on purpose, with the reason in the commit message.
2. Provenance: every batch entry cites a source in L0 or a recorded decision; a missing or unknown
   reference is refused.
3. No business literal that the move took out of derive.py has come back.
"""
from __future__ import annotations

import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / 'tools'))

import derive  # noqa: E402


def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


class OutputsMatchTheRecordedDigest(unittest.TestCase):
    def test_inputs_are_the_ones_the_digest_was_made_from(self):
        digest = load(HERE / 'batch' / 'l2-digest.json')
        self.assertEqual(derive.sha256(derive.DESIGN / 'MANIFEST.json'), digest['inputs']['manifest_sha256'])
        self.assertEqual(derive.sha256(derive.DECISIONS), digest['inputs']['decisions_sha256'])

    def test_every_generated_file_matches_the_digest(self):
        digest = load(HERE / 'batch' / 'l2-digest.json')['files']
        generated = {path.relative_to(HERE).as_posix(): hashlib.sha256(text.encode('utf-8')).hexdigest()
                     for path, text in derive.generate().items()}
        self.assertEqual(sorted(generated), sorted(digest), 'the set of generated files changed')
        changed = sorted(name for name in generated if generated[name] != digest[name])
        self.assertEqual(changed, [], 'generated files differ from the recorded digest')


class BatchEntriesCiteTheirProvenance(unittest.TestCase):
    def setUp(self):
        self.batch = load(derive.BATCH_DEFINITION)
        self.decisions = load(derive.DECISIONS)

    def test_the_committed_batch_definition_is_valid(self):
        self.assertEqual(derive.batch_problems(self.batch, self.decisions), [])

    def test_every_moved_constant_is_backed_by_the_definition(self):
        for section in derive.PROVENANCE_SECTIONS:
            self.assertIn(section, self.batch)

    def test_an_entry_without_source_or_decision_is_refused(self):
        batch = copy.deepcopy(self.batch)
        del batch['featured_products']['source']
        self.assertEqual(derive.batch_problems(batch, self.decisions),
                         ['featured_products: needs a source or a decision'])

    def test_a_list_entry_without_provenance_is_refused(self):
        batch = copy.deepcopy(self.batch)
        del batch['contract_exclusions'][0]['source']
        self.assertEqual(derive.batch_problems(batch, self.decisions),
                         ['contract_exclusions[0]: needs a source or a decision'])

    def test_an_unknown_decision_is_refused(self):
        batch = copy.deepcopy(self.batch)
        batch['display_bindings']['hero_price']['decision'] = 'D99'
        self.assertEqual(derive.batch_problems(batch, self.decisions),
                         ["display_bindings.hero_price: unknown decision 'D99'"])

    def test_an_unknown_display_rule_is_refused(self):
        batch = copy.deepcopy(self.batch)
        batch['display_bindings']['store_name']['rule'] = 'store_full_name'
        self.assertEqual(derive.batch_problems(batch, self.decisions),
                         ["display_bindings.store_name: unknown rule 'store_full_name'"])

    def test_a_missing_section_is_refused(self):
        batch = copy.deepcopy(self.batch)
        del batch['tab_bar']
        self.assertEqual(derive.batch_problems(batch, self.decisions), ['tab_bar: missing'])


class NoBusinessLiteralReturnsToTheScript(unittest.TestCase):
    MOVED = ('ec6bed1c5fbae3eb', 'commerce-v1-a01-430', 'vphone-ios27-430x932', "'nav.home'",
             "'AppHeader'", "'T003'", 'store-demo-001', "[:2]", "stores'][0]", "== 'home'",
             'orders.order.{orderId}.open')

    def test_moved_literals_are_absent_from_derive(self):
        source = (HERE / 'tools' / 'derive.py').read_text(encoding='utf-8')
        self.assertEqual([literal for literal in self.MOVED if literal in source], [])


if __name__ == '__main__':
    unittest.main()
