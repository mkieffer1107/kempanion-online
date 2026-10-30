"""Slice a generated 6-pose sprite strip (transparent PNG) into 256x256 animation frames.

    uv run --with pillow --with numpy --with scipy python -I scripts/slice-strip.py STRIP.png OUT_DIR \
        --ref-frame path/to/idle/00.png [--frames 6] [--top 12] [--durations 180,120,120,120,120,200] [--no-loop]

Poses are found as connected alpha components and grouped into N columns by x position; every frame is
scaled by the SAME factor (so the character never changes size), matched to the reference frame's height,
and placed with the top of the head at --top px, horizontally centred on the head (grab point = top-centre).
Writes OUT_DIR/00.png … and OUT_DIR/meta.json for scripts/sync-sprites.ts.
"""
import argparse, json, os

import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256

ap = argparse.ArgumentParser()
ap.add_argument('strip')
ap.add_argument('out')
ap.add_argument('--ref-frame', required=True)
ap.add_argument('--frames', type=int, default=6)
ap.add_argument('--top', type=int, default=12)
ap.add_argument('--durations', default='180,120,120,120,120,200')
ap.add_argument('--no-loop', action='store_true')
a = ap.parse_args()

img = Image.open(a.strip).convert('RGBA')
rgba = np.array(img)
alpha = rgba[:, :, 3] > 24

# Connected components; drop specks.
labels, n = ndimage.label(alpha)
objs = ndimage.find_objects(labels)
sizes = ndimage.sum(alpha, labels, range(1, n + 1))
comps = [(i + 1, objs[i], sizes[i]) for i in range(n) if sizes[i] > 400]
if len(comps) < a.frames:
    raise SystemExit(f'found only {len(comps)} poses in {a.strip}')

# Group components into columns by x-centre (largest gaps split the row).
centers = sorted(((sl[1].start + sl[1].stop) / 2, lab, sl) for lab, sl, _ in comps)
xs = [c[0] for c in centers]
gaps = sorted(range(1, len(xs)), key=lambda i: xs[i] - xs[i - 1], reverse=True)[: a.frames - 1]
cuts = sorted(gaps)
groups, start = [], 0
for c in cuts + [len(centers)]:
    groups.append(centers[start:c])
    start = c

def group_mask(group):
    m = np.zeros_like(alpha)
    for _, lab, _ in group:
        m |= labels == lab
    return m

masks = [group_mask(g) for g in groups]
boxes = []
for m in masks:
    ys, xs_ = np.nonzero(m)
    boxes.append((ys.min(), ys.max() + 1, xs_.min(), xs_.max() + 1))

# Reference height: the standing idle frame's alpha bbox.
ref = np.array(Image.open(a.ref_frame).convert('RGBA'))[:, :, 3] > 24
rys = np.nonzero(ref)[0]
ref_h = rys.max() + 1 - rys.min()
max_h = max(b[1] - b[0] for b in boxes)
scale = min((ref_h * 1.02) / max_h, (FRAME - a.top - 4) / max_h)

os.makedirs(a.out, exist_ok=True)
for i, (m, (y0, y1, x0, x1)) in enumerate(zip(masks, boxes)):
    crop = rgba[y0:y1, x0:x1].copy()
    crop[:, :, 3] = np.where(m[y0:y1, x0:x1], crop[:, :, 3], 0)
    h, w = y1 - y0, x1 - x0
    head = m[y0:y0 + max(1, int(h * 0.3)), x0:x1]
    hx = np.nonzero(head)[1].mean() if head.any() else w / 2  # head centre (stable grab point)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    sprite = Image.fromarray(crop).resize((nw, nh), Image.LANCZOS)
    frame = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    left = round(FRAME / 2 - hx * scale)
    frame.alpha_composite(sprite, (max(0, min(FRAME - nw, left)), a.top))
    frame.save(os.path.join(a.out, f'{i:02d}.png'))

durations = [int(x) for x in a.durations.split(',')]
json.dump({'durationsMs': durations[: a.frames], 'loop': not a.no_loop}, open(os.path.join(a.out, 'meta.json'), 'w'))
print(f'{a.out}: {a.frames} frames, scale {scale:.3f} (ref height {ref_h}px)')
