# Mechanical packing only: generated pixels and alpha are never masked or redrawn.
from PIL import Image
from pathlib import Path
import numpy as np
import argparse
import hashlib
import json

parser = argparse.ArgumentParser(description='Pack owl-only poses and one fixed generated branch.')
parser.add_argument('--source-dir', required=True, type=Path)
parser.add_argument('--output-dir', required=True, type=Path)
args = parser.parse_args()
src, out = args.source_dir, args.output_dir
out.mkdir(parents=True, exist_ok=True)
# First-pose claw anchors measured in the accepted source strips.
rows = [('idle', 4, 260, 500, 110), ('thinking', 4, 286, 525, 112),
        ('speaking', 4, 299, 500, 112), ('greeting', 6, 182, 445, 213),
        ('error', 4, 299, 490, 163), ('curious', 4, 244, 515, 96),
        ('playful', 4, 255, 528, 104)]
pixel_ratio = 2
cell = (384 * pixel_ratio, 352 * pixel_ratio)
atlas = Image.new('RGBA', (cell[0] * 6, cell[1] * len(rows)))
report = []


def pose_groups(im):
    # Alpha threshold measures geometry only; it never changes alpha pixels.
    columns = np.where((np.asarray(im.getchannel('A')) > 32).any(axis=0))[0]
    groups = []
    for x in columns:
        if not groups or x > groups[-1][-1] + 1:
            groups.append([int(x)])
        else:
            groups[-1].append(int(x))
    return [(g[0], g[-1] + 1) for g in groups if len(g) > 50]


for row, (state, count, anchor_x, foot, top) in enumerate(rows):
    source = src / (state + '.png')
    im = Image.open(source).convert('RGBA')
    groups = pose_groups(im)
    assert len(groups) == count, (state, groups)
    boundaries = [0] + [(groups[i-1][1] + groups[i][0]) // 2 for i in range(1, count)] + [im.width]
    logical_scale = 210 / (foot - top)
    factor = logical_scale * pixel_ratio  # One scale per state; never fit individual poses.
    pixels = np.asarray(im, dtype=np.float32)
    pixels = pixels[:, :, :3] * (pixels[:, :, 3:4] / 255)
    half_width = round(55 / logical_scale)
    roi = (round(anchor_x-half_width), foot-15, round(anchor_x+half_width), foot+45)
    l, t, r, b = roi
    reference = pixels[t:b, l:r]
    frames = []
    for col, (left, right) in enumerate(groups):
        approx = left - groups[0][0]
        scores = []
        for dx in range(-20, 21):
            for dy in range(-5, 6):
                sample = pixels[t+dy:b+dy, l+approx+dx:r+approx+dx]
                if sample.shape == reference.shape:
                    scores.append((float(np.mean((sample-reference)**2)), dx, dy))
        _, dx, dy = min(scores)
        crop = im.crop((boundaries[col], 0, boundaries[col+1], im.height))
        crop = crop.resize((round(crop.width*factor), round(crop.height*factor)), Image.Resampling.LANCZOS)
        x = round(170 * pixel_ratio - (anchor_x+approx+dx-boundaries[col])*factor)
        y = round(262 * pixel_ratio - (foot+dy)*factor)
        frame = Image.new('RGBA', cell)
        frame.alpha_composite(crop, (x, y))
        bbox = frame.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
        assert bbox and bbox[0] > 70*pixel_ratio and bbox[1] > 40*pixel_ratio and bbox[2] < 374*pixel_ratio and bbox[3] < 340*pixel_ratio, (state, col, bbox)
        atlas.alpha_composite(frame, (col*cell[0], row*cell[1]))
        frames.append({'column': col, 'bounds': [round(value/pixel_ratio, 2) for value in bbox], 'registrationOffset': [dx, dy]})
    report.append({'state': state, 'row': row, 'frameCount': count,
                   'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                   'sharedScale': logical_scale, 'clawAnchor': [anchor_x, foot], 'frames': frames})

branch_source = src / 'branch.png'
branch = Image.open(branch_source).convert('RGBA')
# Remove only blank outside margins, retaining generated alpha and artwork.
branch = branch.crop(branch.getbbox())
branch = branch.resize((278*pixel_ratio, round(branch.height*278*pixel_ratio/branch.width)), Image.Resampling.LANCZOS)
perch = Image.new('RGBA', cell)
perch.alpha_composite(branch, (60*pixel_ratio, 208*pixel_ratio))
perch.save(out / 'advisor-branch-v1.webp', quality=90, method=6, exact=True)
atlas.save(out / 'advisor-sprites-v1.webp', quality=90, method=6, exact=True)
layout = {'version': 1, 'pixelRatio': pixel_ratio, 'cellWidth': 384, 'cellHeight': 352, 'columns': 6, 'rows': len(rows),
          'imageWidth': atlas.width, 'imageHeight': atlas.height,
          'alpha': 'Generated directly; no chroma key or background removal',
          'branch': {'file': 'advisor-branch-v1.webp', 'position': [60, 208], 'size': [round(value/pixel_ratio, 2) for value in branch.size],
                     'sourceSha256': hashlib.sha256(branch_source.read_bytes()).hexdigest()}, 'states': report}
(out / 'sprite-layout.json').write_text(json.dumps(layout, ensure_ascii=False, indent=2)+'\n')
print('saved', atlas.size, (out / 'advisor-sprites-v1.webp').stat().st_size, 'bytes; branch', branch.size)
print([(r['state'], [f['registrationOffset'] for f in r['frames']]) for r in report])
