"""Cut Ember's rig parts out of the generated part sheets.

Each part is cut from a fixed box centred on a chosen point (the middle of the eye line, the
shoulder end of an arm), not trimmed to its own edges. That keeps the anchor where the rig expects
it: open eyes and closed eyes share a centre, so a blink swaps in place instead of jumping.

    python3 scripts/cut-rig.py

Writes assets/illustrations/rig/<part>@2x.png, @3x.png and rig/parts.json (each part's size in
source pixels, which is the unit src/components/EmberRig.tsx lays the rig out in).
"""
import colorsys
import json
import os
import subprocess
import sys

from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'illustrations')
OUT = os.path.join(ROOT, 'rig')

# sheet -> {part: (centre x, centre y, half width, half height)} in the sheet's own pixels.
# Preview coordinates were read at 1400 px wide; SCALE converts them to the 2752 px source.
SCALE = 2752 / 1400
SHEETS = {
    # The body is trimmed to its own edges; everything else is placed relative to it.
    'ember-body.jpeg': {'body': 'trim'},
    'ember-faces.jpeg': {
        'eyes-open': (278, 162, 175, 115),
        'eyes-blink': (705, 165, 175, 115),
        'eyes-happy': (1135, 160, 175, 115),
        'eyes-worried': (280, 345, 175, 115),
        'eyes-determined': (712, 345, 175, 115),
        'eyes-sleepy': (1135, 355, 175, 115),
        'mouth-smile': (182, 568, 70, 75),
        'mouth-laugh': (400, 568, 105, 75),
        'mouth-frown': (622, 568, 75, 75),
        'mouth-yawn': (818, 568, 60, 75),
        'mouth-half': (1025, 558, 100, 75),
        'mouth-o': (1218, 568, 45, 75),
    },
    # Arms: the fifth item gives the shoulder pivot (in the same preview coordinates), which is
    # where the arm attaches and what it rotates around when it waves.
    'ember-limbs.jpeg': {
        'arm-down': (285, 248, 75, 180, {'pivot': (300, 100)}),
        'arm-wave': (555, 210, 105, 175, {'pivot': (495, 355)}),
        'arm-hip': (807, 232, 100, 135, {'pivot': (840, 125), 'recolor': True}),
        'arm-up': (1132, 200, 145, 140, {'pivot': (1030, 305)}),
    },
    'ember-props.jpeg': {
        'prop-scale': (295, 215, 180, 165, 'trim'),
        'prop-phone': (700, 212, 110, 165, 'trim'),
        'prop-dumbbell': (1087, 210, 205, 105, 'trim'),
        'prop-plane': (275, 570, 205, 145, 'trim'),
        'prop-clock': (700, 572, 145, 155, 'trim'),
        'prop-sparks': (1120, 557, 180, 155, 'trim'),
    },
}
SHEETS.update(json.load(open(os.path.join(OUT, 'sheets.json'))) if os.path.exists(os.path.join(OUT, 'sheets.json')) else {})


def key(img):
    """Magenta to transparent, with edges unmixed and the matte pulled in slightly."""
    img = img.convert('RGB')
    w, h = img.size
    px = img.load()
    out = Image.new('RGBA', (w, h))
    op = out.load()
    FULL, NONE = 110, 190
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            dist = 255 - (min(r, b) - g)
            if dist <= FULL:
                op[x, y] = (0, 0, 0, 0)
            elif dist >= NONE:
                op[x, y] = (r, g, b, 255)
            else:
                a = (dist - FULL) / (NONE - FULL)
                un = lambda o, m: max(0, min(255, int((o - (1 - a) * m) / a)))
                op[x, y] = (un(r, 255), un(g, 0), un(b, 255), int(a * 255))
    r, g, b, al = out.split()
    return Image.merge('RGBA', (r, g, b, al.filter(ImageFilter.MinFilter(3))))


def recolor_to_tangerine(part):
    """One arm came back yellow; move yellow paper to the tangerine the others use, keeping its
    light and shade so the paper texture survives."""
    th, tl, ts = colorsys.rgb_to_hls(255 / 255, 138 / 255, 92 / 255)
    px = part.load()
    for y in range(part.height):
        for x in range(part.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if 0.09 < h < 0.19 and sat > 0.35 and l > 0.4:
                nr, ng, nb = colorsys.hls_to_rgb(th, min(0.95, tl * (l / 0.66)), ts)
                px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)


parts = json.load(open(os.path.join(OUT, 'parts.json'))) if os.path.exists(os.path.join(OUT, 'parts.json')) else {}
os.makedirs(OUT, exist_ok=True)
for sheet, boxes in SHEETS.items():
    src = os.path.join(ROOT, 'source', sheet)
    if not os.path.exists(src):
        print('missing', sheet, file=sys.stderr)
        continue
    keyed = key(Image.open(src))
    for name, spec in boxes.items():
        if spec == 'trim':
            part = keyed.crop(keyed.getbbox())
        else:
            cx, cy, hw, hh = spec[:4]
            box = tuple(round(v * SCALE) for v in (cx - hw, cy - hh, cx + hw, cy + hh))
            part = keyed.crop(box)
            opts = spec[4] if len(spec) > 4 else None
            if opts == 'trim':
                # Props aren't anchored to each other, so they can lose their padding.
                part = part.crop(part.getbbox())
            elif isinstance(opts, dict):
                if opts.get('recolor'):
                    recolor_to_tangerine(part)
                px, py = opts['pivot']
                pivot = {'x': round((px - (cx - hw)) * SCALE), 'y': round((py - (cy - hh)) * SCALE)}
        parts[name] = {'w': part.width, 'h': part.height}
        if spec != 'trim' and isinstance(spec[4] if len(spec) > 4 else None, dict):
            parts[name]['pivot'] = pivot
        # Parts are laid out in source pixels; @3x is the source size, @2x two thirds of it.
        part.save(os.path.join(OUT, f'{name}@3x.png'), optimize=True)
        part.resize((round(part.width * 2 / 3), round(part.height * 2 / 3)), Image.LANCZOS).save(
            os.path.join(OUT, f'{name}@2x.png'), optimize=True
        )
        print(name, part.size)
json.dump(parts, open(os.path.join(OUT, 'parts.json'), 'w'), indent=1)

# The app's manifest: every part's size and its require(), so the rig can't reference a part
# that wasn't cut.
ts = ['/* Generated by scripts/cut-rig.py. Sizes are source pixels, the rig\'s layout unit. */']
ts.append('export const PART_SIZE = ' + json.dumps(parts, indent=2) + ' as const;')
ts.append('')
ts.append('export const PART_SRC = {')
for n in sorted(parts):
    ts.append(f"  '{n}': require('../../assets/illustrations/rig/{n}.png'),")
ts.append('} as const;')
ts.append('')
ts.append('export type PartName = keyof typeof PART_SRC;')
open(os.path.join(os.path.dirname(__file__), '..', 'src', 'components', 'emberParts.ts'), 'w').write('\n'.join(ts) + '\n')
