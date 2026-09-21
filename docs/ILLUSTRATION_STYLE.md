# Accountable — illustration style

Every illustration in the app is generated from one style, the same house style as ammanchuhan.com
(`~/Developer/portfolio-website/docs/IMAGE_STYLE.md`). **Prompts are assembled from the blocks below,
word for word.** Paraphrasing a block is how the style drifts.

## Before generating

1. Upload **`~/Developer/portfolio-website/public/portrait.jpg`** as the style reference. Every
   prompt says "in exactly the same style as the reference image" and means that file.
2. Generate each image at **1024×1024** (square).
3. Save to Downloads as **`accountable-<name>.png`** (the name is in each heading below).

## Why stickers

The app has a light and a dark theme. Ink-outlined art on a transparent background disappears on
dark. A die-cut sticker (cream edge, thin ink line around it) reads on both, and it's what gives the
app a hand-made, collected feel rather than flat icons.

## The blocks

1. **Style** (first): `A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading.`
2. **Subject** and **Composition**: written fresh per asset.
3. **Palette**: `Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE.`
4. **Sticker**: `Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed.`
5. **No text**: `No text, no letters, no numbers, no logos anywhere.` plus the asset-specific ban.
6. **Closer** (last): `Flat editorial magazine illustration, not 3D, not photorealistic.`

Tomato red is the app's ember, and mint green is its "done" green, so the art sits in the same
colour family as the interface.

## After generating

The white background is keyed out, the image trimmed and exported as a transparent PNG at @2x and
@3x, and placed in `assets/illustrations/`.

---

## Prompts

### 1. `accountable-scale.png`

*Where it goes:* Home › “Step on the scale” card, and the top of the weigh-in screen

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A flat bathroom scale seen from a slightly high three-quarter angle, with two bare feet standing on it, cropped at the ankles. The scale body is cream with a tomato red rim; the display window is a blank sunflower yellow rectangle. The scale and feet fill about 70% of the sticker, centered, feet slightly to one side so it feels candid. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The scale display is completely blank: no digits, no numbers. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 2. `accountable-camera.png`

*Where it goes:* Weigh-in screen, “Photograph the scale” step

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A hand holding a smartphone, pointing it down at a bathroom scale on the floor. The phone is ink black with a cobalt blue case; the scale is cream with a tomato red rim and a blank sunflower yellow display; a small mint green corner-bracket viewfinder frame floats between phone and scale. Phone in the upper right, scale in the lower left, a diagonal between them. Compact, fills about 70% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The phone screen and the scale display are blank: no digits, no interface, no icons. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 3. `accountable-workout.png`

*Where it goes:* Home › workout session cards, and the “Your plan” step

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A single hexagonal dumbbell lying next to a laced running sneaker. Dumbbell in ink black with cobalt blue plates; sneaker in tomato red with a cream sole and sunflower yellow laces. The two objects overlap slightly, side by side, filling about 70% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The sneaker has no brand marks or logos. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 4. `accountable-witness.png`

*Where it goes:* The witness screen, the “Nobody is watching yet” banner, and the sign-up witness step

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. Two friends side by side seen from the waist up, generic featureless faces. One looks at a phone in their hand with a small speech-bubble shape floating above it; the other has a hand on their shoulder, leaning in to look too. One wears a cobalt blue sweater, the other a mint green jacket; the speech bubble is tomato red and empty. Both figures fill about 75% of the sticker, close together, warm and friendly body language. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The speech bubble and phone screen are empty: no words, no emoji. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 5. `accountable-invite.png`

*Where it goes:* After “Send the invite” is tapped, and the invite section of the witness screen

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A paper airplane folded from cream paper, mid-flight, with a short dotted tomato red trail curling behind it and a small sunflower yellow sparkle at its nose. The plane angled upward to the right in the upper half, trail sweeping from the lower left. Fills about 65% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 6. `accountable-wake.png`

*Where it goes:* Sign-up › “When do you get up?”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A classic twin-bell alarm clock with a half sun rising behind it. Clock body tomato red with a cream face and ink black hands; the sun is sunflower yellow with short rays. Clock centered, sun peeking from behind its upper left. Fills about 70% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The clock face has no numerals: only two hands and small tick marks. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 7. `accountable-week.png`

*Where it goes:* Sign-up › “What does your week look like?”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A tear-off desk calendar page next to a folded work shirt and a coffee mug. Calendar page cream with a tomato red header strip and a grid of empty squares, three of them filled in mint green; shirt cobalt blue; mug sunflower yellow. Calendar in the center, shirt tucked behind on the left, mug in front on the right. Fills about 70% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The calendar has no dates, no numbers, no day names: only empty squares. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 8. `accountable-pace-steady.png`

*Where it goes:* Sign-up › pace option “Steady”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A cosy slipper with a small curl of steam from a mug beside it, suggesting an easy pace. Slipper cobalt blue with a cream lining; mug mint green. Slipper centered, mug small at its side. Fills about 65% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 9. `accountable-pace-moderate.png`

*Where it goes:* Sign-up › pace option “Moderate”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A laced running sneaker mid-stride with three short motion lines behind the heel. Sneaker mint green with a cream sole and sunflower yellow laces; motion lines ink black. Sneaker centered, tilted slightly forward. Fills about 65% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The sneaker has no brand marks or logos. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 10. `accountable-pace-fast.png`

*Where it goes:* Sign-up › pace option “Fast”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A sprinting spiked track shoe with bold speed lines and a small burst of sunflower yellow flame at the heel. Shoe tomato red with a cream sole; speed lines ink black. Shoe angled steeply forward, speed lines trailing left. Fills about 65% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. The shoe has no brand marks or logos. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 11. `accountable-commit-easing.png`

*Where it goes:* Sign-up › commitment option “Easing in”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A small seedling with two leaves sprouting from a little terracotta pot. Leaves mint green, pot tomato red, a single sunflower yellow sparkle above. Pot centered at the bottom, seedling rising. Fills about 60% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 12. `accountable-commit-serious.png`

*Where it goes:* Sign-up › commitment option “Serious”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A steady campfire of three crossed logs with a medium flame. Flame tomato red with a sunflower yellow core; logs warm kraft-paper brown with ink black outlines. Fire centered. Fills about 65% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 13. `accountable-commit-all-in.png`

*Where it goes:* Sign-up › commitment option “All in”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A big roaring bonfire with tall licking flames and a few flying sparks. Flames tomato red and sunflower yellow; logs warm kraft-paper brown; sparks sunflower yellow. Bonfire centered, flames rising high. Fills about 75% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 14. `accountable-done.png`

*Where it goes:* Home › “That’s today. Nothing else is due.”

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. Two hands meeting in a high five, with a small starburst where the palms touch. One sleeve cobalt blue, the other mint green; starburst sunflower yellow with tomato red accents. The high five centered, hands entering from lower left and lower right. Fills about 70% of the sticker. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```

### 15. `accountable-arrows.png`

*Where it goes:* Hand-drawn arrows used around the app to point at the one thing to do

```
A flat risograph print spot illustration in exactly the same style as the reference image: thick black ink outlines, subtle grain, halftone shading. A sheet of six separate hand-drawn marker arrows, each a different gesture: a loose curve pointing down, a curve pointing right, a looping arrow, a short straight arrow, a zigzag arrow, and a curved arrow pointing up. All arrows tomato red with slightly uneven, confident brush strokes. The six arrows arranged in a loose 3×2 grid with clear space between each so they can be cut apart. Each arrow gets its own die-cut sticker edge. Palette strictly limited to: ink black #1B1A17 for outlines, tomato red #D9482B, cobalt blue #2A4BD7, sunflower yellow #F2B705, mint green #1E7F59, cream #FAF6EE. Present it as a single die-cut sticker: the whole illustration is surrounded by a thick, even cream #FAF6EE border that follows its outer silhouette, with a thin black ink line around the outside of that cream border. Place the sticker on a plain, perfectly flat pure white #FFFFFF background with no drop shadow and generous padding on every side, so the white can be cleanly removed. No text, no letters, no numbers, no logos anywhere. Flat editorial magazine illustration, not 3D, not photorealistic.
```
