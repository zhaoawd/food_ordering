"""Render the 430 baseline N times and report whether the outputs repeat.

JSON (boxes, styles, fonts, metrics) is compared byte for byte; PNGs pixel by pixel (largest channel
difference and the number of differing pixels against the first render). The result is an
observation for this host and toolchain, not a guarantee for others.

Usage: python3 -I tools/check_render_determinism.py --runs 5 --out admission/render-determinism.json
Requires PLAYWRIGHT_MODULE and COMPOSITOR_PROFILES as for render_baseline.mjs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
PROTOTYPE = HERE.parent.parent.parent / 'design' / 'commerce-v1' / 'ui' / 'prototype.html'


def decode_png(data: bytes) -> tuple[int, int, int, bytes]:
    """Decode an 8-bit, non-interlaced RGB or RGBA PNG (what Chromium screenshots produce)."""
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    pos, idat, header = 8, b'', None
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            idat += body
        pos += 12 + length
    width, height, depth, color, _, _, interlace = header
    assert depth == 8 and interlace == 0 and color in (2, 6), f'unsupported PNG {header}'
    channels = 3 if color == 2 else 4
    raw = zlib.decompress(idat)
    stride = width * channels
    out = bytearray(height * stride)
    previous = bytearray(stride)
    for row in range(height):
        kind = raw[row * (stride + 1)]
        line = bytearray(raw[row * (stride + 1) + 1:(row + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b = previous[i]
            c = previous[i - channels] if i >= channels else 0
            if kind == 1:
                line[i] = (line[i] + a) & 255
            elif kind == 2:
                line[i] = (line[i] + b) & 255
            elif kind == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out[row * stride:(row + 1) * stride] = line
        previous = line
    return width, height, channels, bytes(out)


def compare(first: Path, other: Path) -> dict:
    w1, h1, c1, p1 = decode_png(first.read_bytes())
    w2, h2, c2, p2 = decode_png(other.read_bytes())
    if (w1, h1, c1) != (w2, h2, c2):
        return {'same_size': False}
    max_diff, pixels = 0, 0
    for i in range(0, len(p1), c1):
        d = max(abs(p1[i + k] - p2[i + k]) for k in range(c1))
        if d:
            pixels += 1
            max_diff = max(max_diff, d)
    return {'same_size': True, 'max_channel_diff': max_diff, 'differing_pixels': pixels}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--runs', type=int, default=5)
    parser.add_argument('--page', default='home')
    parser.add_argument('--out', type=Path, default=HERE / 'admission' / 'render-determinism.json')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='render-determinism-') as temporary:
        dirs = []
        for run in range(args.runs):
            out = Path(temporary) / f'run-{run}'
            subprocess.run(['node', str(HERE / 'tools' / 'render_baseline.mjs'), str(PROTOTYPE), str(out), args.page],
                           check=True, capture_output=True)
            dirs.append(out / args.page)
        json_hashes = [hashlib.sha256((d / 'prototype-430.json').read_bytes()).hexdigest() for d in dirs]
        png_hashes = [hashlib.sha256((d / 'prototype-430.png').read_bytes()).hexdigest() for d in dirs]
        pixels = [compare(dirs[0] / 'prototype-430.png', d / 'prototype-430.png') for d in dirs[1:]]
        meta = json.loads((dirs[0] / 'prototype-430.json').read_text(encoding='utf-8'))
    report = {
        'schema_version': 'commerce-v1-render-determinism/v1',
        'page': args.page, 'runs': args.runs,
        'browser': meta['browser'], 'host': meta['host'], 'compositor': meta['compositor'],
        'json_identical': len(set(json_hashes)) == 1,
        'png_identical': len(set(png_hashes)) == 1,
        'png_against_first': pixels,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('json_identical', 'png_identical', 'png_against_first')}))


if __name__ == '__main__':
    main()
