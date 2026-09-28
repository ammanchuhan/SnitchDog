"""Cut Snitch's model sheet into transparent PNGs, one per pose and face.

The sheet is generated on flat magenta so it can be keyed: how magenta a pixel is (min(R, B) - G)
sets its alpha, and edge pixels are un-mixed from the magenta so no pink fringe is left.

    python3 scripts/cut-sheet.py ~/Downloads/German_Shepherd_character_model_*.jpg

Boxes are in the sheet's own pixels (2752 x 1536), roughly around each figure; each cut is
trimmed to its content, padded a little, and saved at 3x the size it's drawn at in the app.
"""
import os
import sys

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'snitch')

# name: (left, top, right, bottom, height in points)
BOXES = {
    'stand':      (80, 80, 690, 1060, 220),
    'stand-turn': (720, 80, 1290, 1060, 220),
    'side':       (1390, 80, 1930, 1060, 220),
    'flex':       (1950, 80, 2720, 1060, 220),
    'face-happy': (220, 1060, 560, 1480, 96),
    'face-grin':  (880, 1060, 1220, 1480, 96),
    'face-worried': (1470, 1060, 1940, 1480, 96),
    'face-sly':   (2160, 1060, 2540, 1480, 96),
}

src = np.asarray(Image.open(os.path.expanduser(sys.argv[1])).convert('RGB')).astype(np.float32)
if src.shape[:2] != (1536, 2752):
    src = np.asarray(Image.fromarray(src.astype(np.uint8)).resize((2752, 1536), Image.LANCZOS)).astype(np.float32)

r, g, b = src[..., 0], src[..., 1], src[..., 2]
magenta = np.minimum(r, b) - g
# Fully magenta above HI, fully character below LO.
LO, HI = 60.0, 170.0
alpha = np.clip((HI - magenta) / (HI - LO), 0, 1)

# Un-mix the magenta from edge pixels: p = a*c + (1-a)*M  =>  c = (p - (1-a)*M) / a
M = np.array([255, 0, 255], np.float32)
a3 = alpha[..., None]
colour = np.where(a3 > 0.02, (src - (1 - a3) * M) / np.maximum(a3, 0.02), 0)
rgba = np.dstack([np.clip(colour, 0, 255), alpha * 255]).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
for name, (l, t, rr, bb, pt) in BOXES.items():
    crop = Image.fromarray(rgba[t:bb, l:rr])
    box = crop.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    crop = crop.crop(box)
    pad = 12
    canvas = Image.new('RGBA', (crop.width + pad * 2, crop.height + pad * 2))
    canvas.paste(crop, (pad, pad))
    h = pt * 3
    w = round(canvas.width * h / canvas.height)
    canvas.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, f'{name}.png'), optimize=True)
    print(f'{name}: {w // 3}x{pt} pt')
