"""Unit tests for the achievability judge and the controlled samples of the shared render metrics.

Run: python3 -I -B -m unittest discover -s tools -p 'test_*.py'
The render-metrics samples need PLAYWRIGHT_MODULE and COMPOSITOR_PROFILES; without them they are skipped.
"""
from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / 'tools'))

import achievability  # noqa: E402

PROFILE = {
    'faces': [
        {'match': {'postscript': '.SFNS-Regular'}, 'rn_weights': ['400', 'normal'], 'evidence': 'assumed'},
        {'match': {'postscript': '.SFNS-Medium'}, 'rn_weights': ['500'], 'evidence': 'assumed'},
        {'match': {'postscript': '.SFNS-Bold'}, 'rn_weights': ['700', 'bold'], 'evidence': 'assumed'},
        {'match': {'variable_family': '.SFNS'}, 'rn_weights': [str(w) for w in range(100, 1000, 100)],
         'evidence': 'assumed'},
        {'match': {'postscript': 'PingFangSC-Semibold'}, 'rn_weights': ['600', '700', '800', '900', 'bold'],
         'evidence': 'device_verified'},
    ],
    'not_judged': [{'text_class': 'space', 'reason': 'no ink'}],
}
SF_850 = '.SFNS-Regular_wdth_opsz1A0000_GRAD_wght3520000'
SF_800 = '.SFNS-Regular_wdth_opsz120000_GRAD_wght3200000'


def node(*runs, weight='700', unchanged=True):
    return {'wrap_unchanged': unchanged, 'css': {'fontWeight': weight},
            'runs': [{'text': text, 'class': cls, 'faces': [{'postscript': p, 'glyphs': 1} for p in faces]}
                     for text, cls, faces in runs]}


class Achievability(unittest.TestCase):
    def test_cjk_semibold_at_850_is_achievable(self):
        result = achievability.judge(node(('食刻', 'cjk', ['PingFangSC-Semibold']), weight='850'), PROFILE)
        self.assertEqual(result['outcome'], 'achievable')
        self.assertEqual(result['implement_with'], ['600', '700', '800', '900', 'bold'])
        self.assertTrue(result['css_weight_differs'])

    def test_whitespace_is_not_judged(self):
        result = achievability.judge(node(('食刻', 'cjk', ['PingFangSC-Semibold']), (' ', 'space', [SF_850]),
                                          weight='850'), PROFILE)
        self.assertEqual(result['outcome'], 'achievable')

    def test_a_visible_run_at_an_axis_value_the_stack_lacks_is_not_achievable(self):
        result = achievability.judge(node(('FRESH', 'other', [SF_850]), weight='850'), PROFILE)
        self.assertEqual(result['outcome'], 'not_achievable')

    def test_an_axis_value_the_stack_has_is_achievable(self):
        result = achievability.judge(node(('32.90', 'other', [SF_800]), weight='800'), PROFILE)
        self.assertEqual((result['outcome'], result['implement_with'], result['css_weight_differs']),
                         ('achievable', ['800'], False))

    def test_runs_needing_different_weights_in_one_text_are_not_achievable(self):
        result = achievability.judge(node(('ABC', 'other', ['.SFNS-Medium']),
                                          ('中文', 'cjk', ['PingFangSC-Semibold'])), PROFILE)
        self.assertEqual(result['outcome'], 'not_achievable')

    def test_a_face_missing_from_the_profile_is_undecidable(self):
        result = achievability.judge(node(('A', 'other', ['Menlo-Bold'])), PROFILE)
        self.assertEqual((result['outcome'], result['reason']), ('undecidable', 'face not in profile: Menlo-Bold'))

    def test_a_layout_changed_by_the_split_is_undecidable(self):
        result = achievability.judge(node(('A', 'other', ['.SFNS-Bold']), unchanged=False), PROFILE)
        self.assertEqual(result['outcome'], 'undecidable')

    def test_evidence_is_the_weakest_level_used(self):
        result = achievability.judge(node(('A', 'other', ['.SFNS-Bold']), ('中', 'cjk', ['PingFangSC-Semibold'])),
                                     PROFILE)
        self.assertEqual(result['evidence'], 'assumed')


@unittest.skipUnless(os.environ.get('PLAYWRIGHT_MODULE') and os.environ.get('COMPOSITOR_PROFILES'),
                     'needs PLAYWRIGHT_MODULE and COMPOSITOR_PROFILES')
class RenderMetricsControlledSamples(unittest.TestCase):
    def test_known_geometry_is_measured_correctly(self):
        run = subprocess.run(['node', str(HERE / 'tools' / 'check_render_metrics.mjs')], capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)


if __name__ == '__main__':
    unittest.main()
