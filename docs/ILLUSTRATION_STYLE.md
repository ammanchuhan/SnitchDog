# SnitchDog — illustration style

**Snitch** is the coach and the app's only character: a muscular German Shepherd in a white tank
top and khaki trousers, with a whistle on an orange cord. Cut paper and felt-tip marker, on flat
magenta so it can be keyed out. The model sheet is the source of truth for every new picture:

`~/Downloads/German_Shepherd_character_model_…_2K_20260927141454.jpg` (four body views, four faces)

## Rules

- Snitch reacts to **showing up**, never to the number on the scale.
- Blunt or kind, never cruel, never disgusted. The witnesses are the consequence; Snitch is on your side.
- One picture per mood (see `src/components/Snitch.tsx`). A new pose is a new picture generated
  from the model sheet, not a rig.

## Workflow for a new pose

1. Upload the model sheet as the reference image.
2. Build the prompt from the blocks below, **word for word**, with a scene written fresh.
   Paraphrasing a block is how a character drifts between images.
3. Generate at 1024×1024 (or larger), on magenta.
4. Add a box for it to `scripts/cut-sheet.py` (or key a single image the same way), which keys out
   the magenta, un-mixes the edges and writes a transparent PNG at 3× into `assets/snitch/`.
5. Add it to `ART` and a mood in `src/components/Snitch.tsx`.

`scripts/make-icon.py` builds the app icon, splash and favicon from the sheet.

## The blocks

1. **Style**: `A handmade cut-paper illustration with felt-tip marker details: every shape is cut from matte coloured paper with slightly uneven scissor edges and visible paper fibre texture, layers cast small soft paper shadows on each other, and faces, hands and fine details are drawn in loose black felt-tip marker, printed slightly off-register.`
2. **Character**: `The character is Snitch, exactly as in the reference sheet: a muscular cartoon German Shepherd standing upright like a person, with orange and black-saddle fur cut from matte paper, tall black-edged ears, a black muzzle, a white fitted tank top, khaki trousers rolled at the ankle, and a yellow whistle on an orange cord around his neck. Same proportions, same paper colours and same marker line weight as the reference.`
3. **Scene** and **Composition**: written fresh per image.
4. **Background**: `Place the scene directly on a perfectly flat, solid magenta #FF00FF background with no gradient, no floor and no shadow on the background, with generous padding on every side, so the magenta can be cleanly removed. Nothing in the scene is magenta.`
5. **No text**: `No text, no letters, no numbers, no logos anywhere.`
6. **Closer**: `Warm picture-book charm with grown-up restraint. Not 3D, not glossy, not flat vector art.`

## Poses to make next

For each workout's confirmation message ("Workout verified"), one per kind of session.

**Curls**
```
[Style] [Character] Snitch stands facing three-quarters to the left, doing a dumbbell bicep curl with his right arm: the dumbbell (a small hexagonal dumbbell of deep green paper with black marker grips) raised to his shoulder, elbow tucked in, left arm relaxed at his side, a focused, slightly smug expression. Full body, centered, filling about 80% of the frame height. [Background] [No text] [Closer]
```

**Chest press**
```
[Style] [Character] Snitch lies on his back on a flat workout bench of warm grey paper, seen from the side, pressing a barbell (a black marker bar with deep green paper plates) straight up above his chest, arms fully extended, jaw set, determined. The bench and Snitch together fill about 80% of the frame width, centered. [Background] [No text] [Closer]
```

**Running**
```
[Style] [Character] Snitch running to the right mid-stride, one foot off the ground, arms pumping, whistle swinging out on its cord, ears back, a determined grin. Full body, centered, filling about 80% of the frame height. [Background] [No text] [Closer]
```

**Asleep (rest days)**
```
[Style] [Character] Snitch sitting slumped against nothing, fast asleep, head tipped to one side, eyes closed as two curved marker lines, a small bubble of warm paper white at his nose, whistle resting on his chest. Full body, centered, filling about 70% of the frame height. [Background] [No text] [Closer]
```
