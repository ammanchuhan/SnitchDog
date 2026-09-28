"""Turn a generated illustration into app-ready transparent PNGs.

The images are generated on flat magenta (#FF00FF) precisely so this can work: every pixel close
to magenta becomes transparent, edge pixels get partial alpha with the magenta spill removed, and
the result is trimmed to its content and exported at @2x and @3x.

    python3 scripts/key-illustration.py ~/Downloads/<file>.jpeg ember-scale [--width 240]
    python3 scripts/key-illustration.py ~/Downloads/<blink>.jpeg ember-happy-blink --match ember-happy

--width is the size in points the art is drawn at in the app (default 240).
--match crops an animation frame with the same box as its base image, so a blink or wave frame
lines up with the pose it swaps in for. Every crop box is recorded in assets/illustrations/boxes.json.
"""
import argparse
import json
import os

from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('name')
ap.add_argument('--width', type=int, default=240)
ap.add_argument('--strip-paper', action='store_true',
                help='Also remove the torn paper-white patch the model sheet was generated with')
ap.add_argument('--match', help='Name of the base image whose crop box this frame must reuse')
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'assets', 'snitch'))
a = ap.parse_args()

img = Image.open(os.path.expanduser(a.src)).convert('RGB')
boxes_path = os.path.join(a.out, 'boxes.json')
boxes = json.load(open(boxes_path)) if os.path.exists(boxes_path) else {}
if a.match and tuple(boxes[a.match]['size']) != img.size:
    # An edit can come back at a slightly different resolution; match the base's canvas first.
    img = img.resize(tuple(boxes[a.match]['size']), Image.LANCZOS)
w, h = img.size
px = img.load()
out = Image.new('RGBA', (w, h))
op = out.load()

# Distance from pure magenta: magenta is high red, low green, high blue. JPEG blurs it, so use a
# soft band rather than an exact match.
FULL, NONE = 110, 190
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        magenta = min(r, b) - g  # large for magenta, small for everything in the palette
        dist = 255 - magenta
        if dist <= FULL:
            op[x, y] = (0, 0, 0, 0)
        elif dist >= NONE:
            op[x, y] = (r, g, b, 255)
        else:
            # An edge pixel is a blend of the art and magenta: obs = a*art + (1-a)*magenta.
            # Solve for the art colour so edges keep the paper's colour instead of glowing pink.
            alpha = (dist - FULL) / (NONE - FULL)
            un = lambda o, m: max(0, min(255, int((o - (1 - alpha) * m) / alpha)))
            op[x, y] = (un(r, 255), un(g, 0), un(b, 255), int(alpha * 255))

# The first model sheet was generated with a torn paper patch behind each pose. The paper (and its
# faint shadow) is bright and nearly grey; Ember is saturated orange with black marker lines, so
# low-saturation light pixels can go without touching the character.
if a.strip_paper:
    for y in range(h):
        for x in range(w):
            r, g, b, al = op[x, y]
            if al == 0:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            sat = (mx - mn) / mx if mx else 0
            if sat < 0.2 and mx > 120:
                t = min(1, (0.2 - sat) / 0.08) * min(1, (mx - 120) / 50)
                op[x, y] = (r, g, b, int(al * (1 - t)))

# Shrink the matte by a couple of pixels: the outermost edge is where JPEG smeared magenta into the
# paper, and no amount of unmixing gets it all back. Losing 2px of torn paper is invisible.
r_, g_, b_, alpha_ = out.split()
out = Image.merge('RGBA', (r_, g_, b_, alpha_.filter(ImageFilter.MinFilter(5))))

if a.match:
    # A frame must share its base's box exactly, or the swap visibly jumps.
    box = tuple(boxes[a.match]['box'])
else:
    box = out.getbbox()
boxes[a.name] = {'box': list(box), 'size': list(img.size)}
out = out.crop(box)
os.makedirs(a.out, exist_ok=True)
for scale in (2, 3):
    tw = a.width * scale
    th = round(out.height * tw / out.width)
    out.resize((tw, th), Image.LANCZOS).save(os.path.join(a.out, f'{a.name}@{scale}x.png'), optimize=True)
json.dump(boxes, open(boxes_path, 'w'), indent=1)
print(f'{a.name}: {out.width}x{out.height} source -> {a.width}pt wide')
