"""Draw every Ember mood (and each blink) on one sheet, laid out exactly as the app lays it out,
so proportions can be checked in one look instead of screen by screen.

    python3 scripts/proof-rig.py out.png
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(__file__)
RIG = os.path.join(HERE, '..', 'assets', 'illustrations', 'rig')
parts = json.load(open(os.path.join(RIG, 'parts.json')))
layout = json.load(open(os.path.join(HERE, '..', 'src', 'components', 'emberLayout.json')))

# Mirrors MOODS in src/components/Ember.tsx: eyes, mouth, (screen-left arm, flip), (right arm, flip).
DOWN = (('arm-down', False), ('arm-down', True))
UP = (('arm-up', True), ('arm-up', False))
MOODS = {
    'hello': ('eyes-open', 'mouth-smile', (('arm-down', False), ('arm-wave', False))),
    'happy': ('eyes-open', 'mouth-smile', DOWN),
    'proud': ('eyes-open', 'mouth-laugh', UP),
    'laugh': ('eyes-happy', 'mouth-laugh', UP),
    'worried': ('eyes-worried', 'mouth-frown', DOWN),
    'sleepy': ('eyes-sleepy', 'mouth-yawn', DOWN),
    'determined': ('eyes-determined', 'mouth-half', (('arm-hip', False), ('arm-hip', True))),
}

body = Image.open(os.path.join(RIG, 'body@3x.png'))
bw, bh = parts['body']['w'], parts['body']['h']
body = body.resize((bw, bh))


def feature(canvas, name, anchor_y, align):
    p = parts[name]
    sc = layout['scale'][name]
    img = Image.open(os.path.join(RIG, f'{name}@3x.png')).resize((round(p['w'] * sc), round(p['h'] * sc)))
    ink = {k: v * sc for k, v in p['ink'].items()}
    x = layout['centerX'] * bw - (ink['x'] + ink['w'] / 2)
    y = anchor_y * bh - (ink['y'] + ink['h'] if align == 'bottom' else ink['y'])
    canvas.alpha_composite(img, (round(x), round(y)))


CW, CH = round(bw * layout['canvas']['w']), round(bh * layout['canvas']['h'])
OX = (CW - bw) // 2


def arm(canvas, name, flip, side):
    p = parts[name]
    k = layout['limbScale']
    img = Image.open(os.path.join(RIG, f'{name}@3x.png')).resize((round(p['w'] * k), round(p['h'] * k)))
    px, py = p['pivot']['x'] * k, p['pivot']['y'] * k
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        px = img.width - px
    sh = layout['shoulders'][side]
    canvas.alpha_composite(img, (round(OX + sh['x'] * bw - px), round(sh['y'] * bh - py)))


tiles = []
for mood, (eyes, mouth, arms) in MOODS.items():
    for blink in ([False, True] if eyes == 'eyes-open' and mood != 'hello' else [False]):
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        arm(c, *arms[0], 0)
        arm(c, *arms[1], 1)
        face = body.copy()
        feature(face, 'eyes-blink' if blink else eyes, layout['eyesBottom'], 'bottom')
        feature(face, mouth, layout['mouthTop'], 'top')
        c.alpha_composite(face, (OX, 0))
        tiles.append(c)
cols = 3
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGBA', (CW * cols, CH * rows), (251, 250, 248, 255))
for i, t in enumerate(tiles):
    sheet.alpha_composite(t, ((i % cols) * CW, (i // cols) * CH))
sheet.convert('RGB').resize((CW * cols // 5, CH * rows // 5)).save(sys.argv[1] if len(sys.argv) > 1 else 'proof.jpg')
