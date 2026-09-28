"""Build the app icon and splash mark from Snitch's model sheet (V6).

    python3 scripts/make-icon.py ~/Downloads/German_Shepherd_character_model_*.jpg

Keys the magenta out at the sheet's full resolution (the cut PNGs in assets/snitch are sized for
the app, too small for a 1024 icon), then places Snitch's grin on the app's warm paper.
"""
import os
import sys

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
PAPER = (250, 247, 242)  # theme bg, light

src = np.asarray(Image.open(os.path.expanduser(sys.argv[1])).convert('RGB')).astype(np.float32)
if src.shape[:2] != (1536, 2752):
    src = np.asarray(Image.fromarray(src.astype(np.uint8)).resize((2752, 1536), Image.LANCZOS)).astype(np.float32)


def cut(box):
    l, t, r, b = box
    px = src[t:b, l:r]
    magenta = np.minimum(px[..., 0], px[..., 2]) - px[..., 1]
    alpha = np.clip((170.0 - magenta) / 110.0, 0, 1)
    a3 = alpha[..., None]
    colour = np.where(a3 > 0.02, (px - (1 - a3) * np.array([255, 0, 255], np.float32)) / np.maximum(a3, 0.02), 0)
    im = Image.fromarray(np.dstack([np.clip(colour, 0, 255), alpha * 255]).astype(np.uint8))
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())


def place(art, size, fill, bg):
    canvas = Image.new('RGBA', (size, size), bg)
    scale = fill * size / max(art.size)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2 + round(size * 0.03)))
    return canvas


face = cut((880, 1060, 1220, 1480))  # the grin
stand = cut((720, 80, 1290, 1060))  # turned towards you

# App icon: opaque, no transparency allowed by the App Store.
place(face, 1024, 0.74, PAPER + (255,)).convert('RGB').save(os.path.join(OUT, 'icon.png'))
# Splash mark: transparent; app.json puts it on the paper (and the dark paper in dark mode).
place(stand, 1024, 0.9, (0, 0, 0, 0)).save(os.path.join(OUT, 'splash-icon.png'))
# Android adaptive icon foreground (Android isn't shipped in v1, but keep it consistent).
place(face, 1024, 0.55, (0, 0, 0, 0)).save(os.path.join(OUT, 'android-icon-foreground.png'))
Image.new('RGB', (1024, 1024), PAPER).save(os.path.join(OUT, 'android-icon-background.png'))
place(face, 48, 0.9, PAPER + (255,)).save(os.path.join(OUT, 'favicon.png'))
print('icon, splash, android and favicon written')
