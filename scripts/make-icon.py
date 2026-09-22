"""Build the app icon and splash mark from the Ember rig, so they always match the character.

    python3 scripts/make-icon.py
"""
import json
import os

from PIL import Image

HERE = os.path.dirname(__file__)
RIG = os.path.join(HERE, '..', 'assets', 'illustrations', 'rig')
OUT = os.path.join(HERE, '..', 'assets')
parts = json.load(open(os.path.join(RIG, 'parts.json')))
layout = json.load(open(os.path.join(HERE, '..', 'src', 'components', 'emberLayout.json')))

bw, bh = parts['body']['w'], parts['body']['h']


def feature(canvas, name, anchor_y, align):
    p = parts[name]
    sc = layout['scale'][name]
    img = Image.open(os.path.join(RIG, f'{name}@3x.png')).resize((round(p['w'] * sc), round(p['h'] * sc)))
    ink = {k: v * sc for k, v in p['ink'].items()}
    x = layout['centerX'] * bw - (ink['x'] + ink['w'] / 2)
    y = anchor_y * bh - (ink['y'] + ink['h'] if align == 'bottom' else ink['y'])
    canvas.alpha_composite(img, (round(x), round(y)))


# Happy Ember, face only: limbs turn to noise at icon size.
face = Image.open(os.path.join(RIG, 'body@3x.png')).resize((bw, bh))
feature(face, 'eyes-open', layout['eyesBottom'], 'bottom')
feature(face, 'mouth-smile', layout['mouthTop'], 'top')
face = face.crop(face.getbbox())


def place(size, fill, bg):
    canvas = Image.new('RGBA', (size, size), bg)
    k = fill * size / max(face.size)
    f = face.resize((round(face.width * k), round(face.height * k)), Image.LANCZOS)
    # Sit slightly low: the flame tip carries visual weight upward.
    canvas.alpha_composite(f, ((size - f.width) // 2, round((size - f.height) / 2 + size * 0.03)))
    return canvas


place(1024, 0.74, (253, 232, 225, 255)).convert('RGB').save(os.path.join(OUT, 'icon.png'))
place(1024, 0.9, (0, 0, 0, 0)).save(os.path.join(OUT, 'splash-icon.png'))
print('icon.png, splash-icon.png')
