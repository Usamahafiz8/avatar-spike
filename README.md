# Street Blackjack — Avatar Runtime Spike

Answers one question with numbers instead of opinion: **can we run live 3D
avatars at the table on a phone, and up to how many at once?**

Nothing here touches `blackjack-pwa` or `blackjack-platform`. It is deliberately
outside both git repos.

## Run it

    node serve.mjs

Then open the LAN URL it prints **on a real phone** — desktop numbers are not
the answer (see Caveat below).

The page is a mock of the real table from Miyagi's reference screenshot: top bar,
opponent badge + turn ring, deck row, player hand. The character stands **on the
deck** at 19% of the felt height, with the identity block painted behind it and
the cards in front, exactly as in the reference.

- Tap the felt to fire a random reaction, standing in for a real game event.
- `⚙` (right edge) opens the dev overlay: perf HUD, character count, model
  switch, individual reaction triggers, and the benchmark.
- **Sweep 1→2→4→6** measures median FPS and 5% lows at each character count.

## What it demonstrates

The architecture that makes this feature affordable: **one avatar mesh per user,
one animation library shared by everybody.** Each character is a
`SkeletonUtils.clone` driven by its own `AnimationMixer`, but every mixer plays
the *same* `AnimationClip` objects. Adding a 12th dance costs ~80KB once, not
80KB per player.

Also demonstrated: one shared `WebGLRenderer` and one scene for all characters
(a canvas-per-player is the usual way this gets built wrong), idle→reaction→idle
crossfading, toon shading to approximate the house style, and render-on-demand
so a still table costs nothing.

Character size is pinned to **19% of viewport height**, measured off Miyagi's
reference screenshot. Toggle "Show 19% guide" to see the band.

## Results (Apple M1 Pro, DPR 3, 420x900, all characters animating)

| Model | Chars | FPS | 5% low | Draw calls | Triangles |
|-------|-------|-----|--------|-----------|-----------|
| Robot 453KB  | 1 | 120 | 104 |  19 |   3,237 |
| Robot 453KB  | 6 | 120 |  93 | 114 |  19,422 |
| Xbot 2.8MB   | 1 | 120 | 103 |   2 |  49,112 |
| Xbot 2.8MB   | 6 | 120 | 105 |  12 | 294,672 |

**The finding: draw calls dominate, triangles barely matter.** Xbot pushes 15x
the geometry of Robot through 1/10th the draw calls and runs no slower. Robot is
14 separate meshes (19 calls each, 114 at six characters); Xbot is a single
skinned mesh (2 calls each, 12 at six).

Ready Player Me and Avaturn both export 1–2 meshes, i.e. the Xbot shape. So the
production asset is the *good* case here — but it is worth enforcing a
**merge-meshes / atlas-materials step** in the pipeline, because an artist-built
outfit split into separate accessory meshes is exactly how you land in Robot's
column.

## Caveat — this is an upper bound, not the answer

120 FPS is vsync-capped on an M1 Pro and says little about a mid-range Android.
The transferable finding is the *shape* of the cost (draw calls over triangles),
not the absolute numbers. **The sweep still has to be run on real target
devices** before choosing live 3D over pre-rendered sprites.

## The assets: a real Ready Player Me avatar + RPM's animation library

This is the production asset shape, not an approximation:

| File | Meshes | Triangles | Animations |
|------|--------|-----------|------------|
| `models/rpm/Feminine_TPose.glb` | 1 | 11,156 | **0** — pure body |
| `models/rpm/clips/*.glb` | **0** | **0** | 1 each — pure clip |

One body per user; the clip files are downloaded once and shared by everybody.
Clips are 96-392 KB each. Miyagi's five are mapped in `CLIP_FILES`:

    Idle        F_Standing_Idle_001          neutral stand
    Dance 1     F_Dances_001                 loose two-step
    Dance 2     F_Dances_004                 bigger, leaning
    Laugh       F_Talking_Variations_001     open, animated
    Point       M_Standing_Expressions_017   arm out, points
    Celebrate   M_Standing_Expressions_010   both arms up
    Angry       M_Standing_Expressions_012   fists up, tense
    Shake head  M_Standing_Expressions_005   arms out, "no"
    Clap        M_Standing_Expressions_015   hands together
    Win         M_Standing_Expressions_016   fist raised high
    Lose        M_Standing_Expressions_007   slumped, head down

That is **Miyagi's complete 29/08 list**, all eleven. Every reaction is verified
to play and fade home at ~1.75s.

### Picking clips: use the contact sheet

The library's filenames are meaningless (`M_Standing_Expressions_012` tells you
nothing), so every assignment above was made by **rendering all 28 downloaded
clips to a contact sheet and looking at them**:

    node serve.mjs
    # open http://127.0.0.1:8088/sheet.html

`sheet.html` renders one frame per clip into a labelled grid; `contact-sheet.png`
is the current output. To swap a reaction, find a better pose on the sheet and
change its `file` in `CLIP_FILES`.

One gotcha if you regenerate it: the sheet uses a **single** `WebGLRenderer` and
copies each frame out with `toDataURL`. A canvas per cell blows past the
browser's ~16 live WebGL context limit and the earliest cells render blank.

The full library has ~20 idles, ~25 expressions, 14 dances and a large
locomotion set; 28 are downloaded, 11 wired.

**LICENSING — matters for the product decision.** The RPM animation library is
free for commercial use but is licensed **only for use with Ready Player Me
avatars**; applying these clips to a non-RPM character is expressly prohibited,
and redistribution is not permitted. So the clips and the avatar vendor are a
package: choosing RPM's free library means committing to RPM avatars. These
files are local dev assets and must not be committed to either repo.

## Getting to Miyagi's reference style

The reference is a Bitmoji/Snapchat-style character: big head, simplified
features, flat matte shading, streetwear. Three separate things, and only one of
them is solvable in code.

**1. Proportion — solved.** A `Head size` slider scales the Head bone; the
skinned vertices follow. Measured heads-per-body:

    1.0x   9.85   Ready Player Me default (realistic)
    1.75x  6.16
    2.6x   4.56
    3.2x   3.95   <- Bitmoji proportion

Clips carry scale tracks for every bone, so the mixer overwrites this each
frame; it is re-applied after `mixer.update()` in the render loop, not once at
build time.

**2. Art style — NOT solvable in code.** Scaling the head changes proportion but
not shape language. The face stays a realistic RPM face; it does not become a
simplified cartoon one. Flat matte shading is partly reachable with the toon
material toggle, but the underlying geometry and textures are realistic.

**3. Outfit and accessories — not available.** Cornrows, wraparound shades, gold
chain, black tracksuit, white low-tops. None of these exist on the default RPM
avatar (which wears a "READY PLAYER ME" branded tee, visible at large sizes).

### What this means for the vendor choice

**Avaturn is reachable from this machine; Ready Player Me is not.**

    avaturn.me           http 200
    api.avaturn.me       resolves
    avatarsdk.com        http 200
    readyplayer.me       no connection
    models.readyplayer.me  NXDOMAIN

Avaturn was the original recommendation in the 30/08 chat, and it offers
stylised avatar styles generated from a selfie — which is where the reference
look has to come from. The realistic path to Miyagi's character is an Avaturn
account, not more code. Failing that, a custom-modelled character rigged through
Mixamo.

## Game-event triggers

Reactions are bound to Miyagi's actual trigger moments, not just dev buttons.
The "Game events" section fires the mapping the real integration will use:

    Win a hand        -> Celebrate       Taunt            -> Point
    Play a BlackJack  -> Win             Opponent misses  -> Laugh
    Bring back        -> Clap            Refuse / no      -> Shake head
    Win the game      -> Dance 1         Annoyed          -> Angry
    Lose a hand       -> Lose

Your realtime layer already emits `round:result` and `action:committed`, so
wiring this for real is binding those events to `triggerAll(reaction)` — the
shape is proven here, only the event source changes.

**Auto demo** walks a plausible hand end to end (win, taunt, opponent misses,
lose, annoyed, BlackJack, bring back, refuse, win the game) so the whole system
can be watched without anyone pressing anything. Useful for showing Miyagi.

## Hand-authored moves: Middle finger, ROFL

Miyagi asked for "someone putting the middle finger up" and "laughing and
jumping on the floor". Neither exists in RPM's library — it is a corporate
animation set. Rather than wait on filming, both are **written directly in
code**: a clip is only bone rotations over time, so `authorClip()` builds
`THREE.AnimationClip` objects from keyframed pose deltas.

Poses are deltas against the captured bind pose, not absolute quaternions, so
they compose with whatever rest orientation the rig happens to have.

**Rig axes were measured, not guessed.** The first attempt pointed at the floor
with an open hand because both assumptions were wrong:

    RightArm  rotate X -90  ->  hand rises 1.53   <- correct
    RightArm  rotate Z -90  ->  hand rises 1.11, swings sideways
    finger    rotate X +80  ->  71% shorter (curled)  <- correct
    finger    rotate Z -80  ->  58% shorter

**ROFL cannot be a floor-roll, and that is a composition fact, not a limitation
of the technique.** The character stands ON the deck and the deck row paints
OVER the canvas, so anything moving downward vanishes behind the cards — the
first version showed only two hands above the deck. It now plays *upward*: head
thrown back, body folding and rocking, knees snapping up alternately, arms
flailing. Same energy, entirely above the deck line. Both verified in frame.

### Portrait cannot show a hand gesture — the camera pulls back instead

Portrait is a FACE framing. The character's resting right hand sits at world
x=-0.97 against a half-frame of 0.93, so **the hands are outside it entirely**.
The first middle finger looked broken for exactly this reason: correct pose,
invisible hands.

**Only the middle finger needs this.** Measured with the pull-back disabled, as
the share of frames where the hands stay inside the portrait frame:

    Laugh/Angry/Win/Lose 100%   ROFL 97%   Dance 1 95%   Clap 95%
    Celebrate 89%   Point 84%   Dance 2 78%   Shake head 60%
    Middle finger 57% — and its FINGERTIP, the entire point, 1%

An earlier version pulled back for nine of the eleven moves, which threw away
the big face for no reason — the thing the portrait framing existed to give.
`NEEDS_ROOM` is now just the middle finger: head stays 158-179px on every other
reaction, and drops to 60px only for that one. There is a **Pull back for big
gestures** toggle in the dev panel to turn it off entirely.

Sizing that pull-back needed care: feet stay at `FOOT_LINE` (46.5% from the
top), so only ~46% of the screen exists above them. Lerping to a 62%-tall
character put the head above the viewport and the hand 230px off-screen; 0.34
leaves room for both.

### Two other things the measurements caught

The middle finger held one pose for 1.3s — a frozen frame, not a gesture. It now
thrusts three times through 24 degrees with the torso following. And ROFL was a
2.6s clip cut off at 1.77s by the 2.2s hold, so its last two beats never played;
it is 2.0s now and completes.

These are crude next to mocap, and they are meant to be — they prove the route
and give Miyagi something to react to. The production versions come from
filming the real move and running it through DeepMotion.

## Equipped moves (the loadout)

Miyagi: *"maybe in profile user can choose from 3 moves to bring to table. Or 4."*

Step 3 of the setup sheet is a grid of the 10 reactions; tap to equip up to
**4**. Equipped moves appear as a quick bar on the felt, and tapping one sends
that reaction. Choice is saved in `localStorage` and survives a reload
(wrapped in try/catch — private mode and blocked storage fall back to defaults).

**The loadout limits only PLAYER-SENT reactions.** Game events — win a hand,
play a BlackJack, lose — still fire their own animation regardless of what is
equipped, because that is the game reacting, not the player choosing. Mixing
those two up would mean a player who did not equip "Lose" never reacts to
losing.

This costs nothing per user: clips are shared files, so a loadout is just a
list of names on the profile. It is also the natural shape for a premium
unlock — more slots, or moves that have to be earned.

## Character editor

Two bodies and per-part colour, in the setup sheet.

| Body | Materials | Expressions | Editable |
|------|-----------|-------------|----------|
| **Male** (`RPM_Template_Mesh_XR`) | 9 separate | 52 ARKit | skin, hair, beard, eyes, top, bottom, shoes |
| **Female** (`Feminine_TPose`) | **1 merged** | none | overall tint only |

The male body is the only free RPM asset that separates its materials, so it is
the only one an editor can actually drive. The female ships as a single
`Wolf3D_Avatar` material — tinting her hair would tint her skin and clothes with
it — and carries no morph targets, so she has no facial expressions either. The
sheet says so rather than hiding it.

Colours live in one map (material name -> hex) that both the selfie and the
editor write to, so the two can never disagree. Saved per device.

### What cannot be edited, and why

**Nose, lips, face shape and body are not adjustable.** Checked across every
free RPM asset — PreviewMesh, both Unity avatars, both TPose bodies, and the XR
template. The XR template has 240 morph targets, but all 52 distinct names are
**ARKit expressions** (`browDownLeft`, `jawForward`, `noseSneerLeft`,
`mouthPucker`…). There is not one shape morph — no `noseWidth`, no `jawWidth`.

The data simply is not in the files. RPM's own creator does that work and
exports a finished character. Face-shape control is exactly what an avatar
vendor sells, and no amount of engineering substitutes for it.

## Selfie personalisation — no vendor account

The selfie step is **live**, and needs no avatar vendor. MediaPipe
FaceLandmarker (lazy-loaded from CDN on first use) finds the face in the photo,
then the skin tone and hair colour are sampled and tinted onto the avatar's
materials.

    cheeks + forehead centre  ->  Wolf3D_Skin, Wolf3D_Body
    ~40% of face height above the brow  ->  Wolf3D_Hair

**Why colour rather than face shape.** Measured against Miyagi's reference, the
character is 19% of the felt and its head is ~15px. Facial likeness is
physically invisible at that size — what reads as "that's me" is colouring. So
this captures most of the perceived personalisation for none of the vendor
cost, and it still applies on top of a real Avaturn avatar later.

The result is shown **beside the photo** in the sheet. Without that the step has
no feedback loop at all: you pick a photo, get two colour swatches, and the
character is behind the sheet *and* faded out at rest — so nothing visibly
happens. The preview renders the current avatar with the photo's colouring
applied, on the same throwaway-renderer trick as the picker tiles.

Details that matter:

- **Median, not mean.** A highlight or a stray hair across the cheek drags an
  average badly, and skin patches are small.
- **Tint = wanted / texture average**, not a flat colour. Setting
  `material.color` directly would flatten the texture's own shading, so the
  target is divided by the texture's measured average and clamped.
- **Nothing is uploaded.** The photo is read into a canvas on the device.
- Verified end-to-end by feeding the same face at three tones: the avatar's own
  render returns a 1.0 tint (correct null result), a darkened variant returns
  skin #c4c5c0 / body #a9aba7 and visibly changes the render.

**Gotcha that cost time:** `applyToon` replaces each material with a fresh
`MeshToonMaterial`, which has no `name`. Personalisation matches on
`Wolf3D_Skin` etc, so with toon shading on — the default — it silently never
matched. The toon material now carries the original name.

## Avatar setup sheet ("MY CHARACTER")

Tap **MY CHARACTER** on the felt. Three steps, matching Miyagi's flow:

1. **Upload a selfie** — picks a photo and previews it locally. It does **not**
   generate a character, and deliberately says so: that needs an avatar vendor
   account. A mock that pretended to work would look finished and do nothing,
   and would have to be rewritten against Avaturn's real API anyway.
2. **Or pick a character** — the fallback picker from the spec (A / B / C).
3. **Load a .glb avatar** — **this one works right now.** Export a GLB from
   Avaturn and load it straight from disk; it renders at the table with all 11
   animations, and the panel reports whether it carries facial blendshapes and
   how many triangles it has.

Step 3 is the unblock path: nobody has to wait on a code change to try a real
avatar.

Nothing leaves the device — the selfie is held in an object URL for preview only.

## Fallback avatar picker

Each tile **renders its own avatar** rather than showing a letter — "A / B / C"
told you nothing, and you cannot choose a character from a letter. They render
once on first open, on a dedicated throwaway renderer (`preserveDrawingBuffer`,
so `toDataURL` works), which is then disposed.

Framing note: the first version centred the body and produced three pictures of
t-shirts. Tiles now put the **head centre** on the camera axis.



Miyagi's spec calls for a premade picker when a selfie fails. Three avatars are
wired (A / B / C); all animate identically because they share the RPM rig.

**Only A has facial blendshapes.** B and C are RPM sample avatars with 0 morph
targets, so they animate body-only — which is exactly the trade the real picker
will face, and the reason to demand morph targets from the vendor.

## Framing: Full body vs Portrait

Two framings, toggled in the dev panel. **Portrait is the default.**

- **Full body** — the reference layout: whole character, feet planted on the
  deck, `Character size` slider sets body height (14-55% of felt). Feet stay on
  the deck at every size; verified at 19% / 33% / 47%, foot line held to 3-4px.
- **Portrait** — anchors the HEAD rather than the feet, so the `Face size`
  slider controls how big the **face** is. The body runs off the bottom of the
  felt and is covered by the deck row and the hand.

Portrait exists because a full-body character has a head roughly **1/7.5** of
its height — at the reference 19% body size the head is about 20px, and no
amount of body scaling makes a face readable without the character swallowing
the table. Anchoring the head decouples the two.

Defaults: face 14% of felt = an 87px head on a 390x844 phone, which reads
clearly while leaving the deck and hand usable. 26% fills the screen with head
and is too much — the slider goes there so the limit is visible.

The `MA` badge and `MASTER` label sit behind the character, so they fade out
automatically as she grows (fully hidden in portrait, where the character is
the identity).

## Facial expressions — working

Reactions drive the face, not just the body. The avatar exposes `mouthSmile`,
`mouthOpen`, `eyesClosed` (plus `eyesLookUp/Down`) as morph targets across four
meshes (head, teeth, both eyes). Each reaction has a target expression in
`FACES`; the face eases toward it and back, with an involuntary blink running on
top — without the blink a face reads as a mannequin even while it smiles.

Measured influences 0.7s after firing each reaction:

    Laugh   smile 0.94   mouthOpen 0.44   eyesClosed 0.58
    Win     smile 0.99   mouthOpen 0.35   eyesClosed 0.15
    Lose    smile 0.00   mouthOpen 0.08   eyesClosed 0.49
    Angry   smile 0.00   mouthOpen 0.15   eyesClosed 0.44

### Finding the right avatar took some hunting

An earlier version of this README said facial expressions were impossible. That
was true of the asset in use then, not in general. Measured across every RPM
asset reachable from here:

    Feminine_TPose.glb (was using)        0 morph targets   full body
    Unity-Loadtest avatars (x2)           0 morph targets   full body
    RPM_Template_Mesh.glb                15 visemes only    full body
    visage/public/half-body.glb          72 morph targets   HALF body, 38 bones
    PreviewMesh.glb  <- now using         5 expressions     full body, 67 bones

`PreviewMesh.glb` (from `readyplayerme/rpm-unity-sdk-core`) is the only reachable
asset that is **both** full-body **and** carries usable expression blendshapes.
It also matches the clip library better than the old avatar: **58/58 bone
targets** against 52/58, valid bind pose (1.838), and it is lighter — 11,129
triangles, 1 draw call.

**For the real build:** request avatars exported with morph targets. RPM's API
supports it; their default exports mostly do not. `mouthSmile` / `mouthOpen` /
`eyesClosed` alone are enough for readable reactions — the full ARKit set is not
required.

## 2D cartoon effects

Miyagi's reference GIFs — steam from the ears, rolling on the floor laughing —
are **cartoon exaggeration**. A realistic 3D avatar cannot produce that on its
own, no matter how good the body animation is. But 2D effects painted over the
top get the same energy for almost nothing:

    Angry   steam puffs venting from both ears   <- the anger tell, Angry only
    Win     stars bursting above the head
    Lose    a sweat drop running down the temple
    Laugh   the same drop, lighter
    ROFL    the same drop, faster

Every other reaction — Middle finger, Dance, Point, Celebrate, Clap, Shake head
— plays with **no effect**. Steam is the anger tell; putting it on a second
reaction dilutes it and reads as a bug.

They are DOM elements driven by CSS keyframes, positioned from the **head bone
projected to screen space**, so they follow the character as it moves and scale
with it. Doing this inside the 3D scene would mean billboards, shaders and
sort-order headaches; in the DOM it is a div and an animation.

Every offset is expressed in **head-heights**, not pixels, so the effects stay
correctly placed at any character size or framing. The head height is measured
exactly, from the `Head` bone to `HeadTop_End` — roughly 194px in portrait,
27px in full-body view.

Particles remove themselves on `animationend`; peak counts are ~32 for steam,
12 for stars, 4 for drops, and the layer returns to 0 between reactions
(verified — no leak). Toggle with **Cartoon effects** in the dev panel.

**This is the cheapest route to the look Miyagi wants.** New effects are a CSS
keyframe plus one line in `EFFECTS` — no vendor, no rig, no art budget.

## Fade out after the reaction

The character is **not permanently on the table**. It eases in when a reaction
fires, holds through it, then fades away — so the felt is clear between events.
Measured alpha after firing "Win a hand":

    at rest   0.00   mesh.visible = false, costs nothing to render
    0.4s      1.00   eased in
    1.6s      1.00   holding through the reaction
    1.9s      0.66   fade begins, at the hold point
    2.5s      0.17   perceptually gone
    4.3s      0.00   mesh switched off

In is fast (~7/s) and out is slower, tied to the `Fade out` slider — a reaction
should arrive promptly and linger on the way out, not the reverse.

Two controls: **Fade out after reaction** (off = the character stays solid, the
old behaviour) and **Resting opacity** (0% = vanishes; raise it to leave a faint
presence between reactions).

Implementation note: `SkeletonUtils.clone` **shares materials** between clones,
so fading one character faded all of them. Each avatar now gets its own material
copies at build time.

## Reaction timing (founder note, 31/08)

Miyagi's review of the first sample: *"probably timing... is the best for this
not suppose to maybe so long. Also fade away."* He was right — the library clips
are far too long for a card-game beat:

    Laugh      F_Talking_Variations_001      9.75s
    Point      M_Standing_Expressions_001    6.08s
    Celebrate  F_Dances_001                  4.29s
    Lose       M_Standing_Expressions_005    3.21s
    Idle       F_Standing_Idle_001          16.21s  (loops, fine)

So a reaction now plays only the **front** of its clip and crossfades home
*before* the clip ends — which both shortens it and makes it fade away rather
than cut. Defaults: 2.2s hold, 0.45s fade, so the fade starts at 1.75s.
Measured: all four reactions return to idle at ~1.75s and settle by 2.2s.

Both values are **live sliders in the dev panel** ("Reaction length" / "Fade
out"), so the exact feel can be dialled in on a real device and the chosen
numbers reported back, rather than guessed here.

## Why the earlier sample characters were abandoned

Michelle and Xbot (three.js Mixamo samples) were tried first. They share
`mixamorig:` bone names 100%, which made it look like clips would interchange —
they loaded and played without error. Measuring the rendered mesh showed
otherwise:

    Michelle bind pose               0.002   collapsed
    SambaDance (her own clip)        0.676   correct
    idle (borrowed from Xbot)        0.131   wrong size
    borrowed, rotation-only          0.002   collapsed
    borrowed, scale-compensated      mangled, inverted

**Michelle's GLB has a degenerate bind pose** — her rest skeleton collapses to
nothing and all her bone placement lives inside her own animation tracks. She
can only ever play her own clip. The RPM avatar's bind pose measures 1.793 and
every clip drives it at a consistent 1.75-1.79.

Two rules follow, and both are worth writing into the vendor requirements:

- Make **"valid bind pose"** an explicit acceptance check on the avatar vendor.
- Matching bone names is necessary but **not sufficient**. Always verify a
  borrowed clip by measuring the rendered mesh — never by checking it plays.

## Two traps worth remembering

1. `Box3.setFromObject` on a **SkinnedMesh** returns bind-pose bounds — 149
   units for RobotExpressive against a true 4.79, a box that is ~97% empty air.
   Normalising against it renders the character ~20x too small.
   `SkinnedMesh.computeBoundingBox()` skins the vertices first and is correct.
2. A `SkeletonUtils` clone reports the same wrong bounds, so the measurement has
   to happen on the source scene before any cloning. `loadModel` does it once
   and caches it.

## Files

    index.html   the spike (three.js r160 via importmap, no build step)
    serve.mjs    static server bound to 0.0.0.0 for device testing
    bench.mjs    headless sweep, forces the real GPU (Metal) over SwiftShader
    verify.mjs   headless smoke test: no console errors, all characters on screen
