# ARI Painting & Construction Corp. — 3D Logo Animation (v3)

A 9-second, 1920×1080, 30 fps cinematic logo animation. It was built in Blender 5.2 (Cycles) from the supplied logo artwork and storyboard.

## Deliverables (`output/`)

| File | What it is |
|---|---|
| `ari-logo-animation_1080p_sfx.mp4` | H.264 High, 1920×1080, 30 fps, BT.709, with directional motion SFX (AAC 48 kHz stereo) |
| `ari-logo-animation_1080p_silent.mp4` | Same picture, no audio track |
| `ari-logo-final-frame.png` | Final brand frame, 1920×1080 |
| `frames-overview.jpg` | One frame per second, for review |
| `v2/`, `v1/` | Earlier versions (archived) |

## Sequence

| Time | Scene |
|---|---|
| 0–2.3 s | Five letter parts float apart in space: A flourish, A leg, A thick stroke and tail, r, i. Each travels a curved path with its own 3D rotation and depth move, arriving staggered and decelerating precisely into place. |
| 2.4–3.0 s | The subtitle rises in word by word, below the lettering. |
| 2.8–4.1 s | The worker rises from below the frame, passing behind the subtitle and lettering (real occlusion, fully opaque), and decelerates into the logo position with head and hat follow-through. |
| 4.1–5.0 s | He settles with a breathing idle. The shoulder prepares and he glances. |
| 5.0–5.6 s | **Raise.** The elbow swings out and the bare upper arm slides out of the sleeve. The forearm swings up toward the camera, foreshortened, so the hand rises beside the face, and the wrist turns the open fingers onto the brim. |
| 5.6–6.5 s | **Contact and tip.** The fingers close over the brim, with the thumb under it. The hat tips about 9° forward on the head and the head nods about 3°, about 12° in total. The hand stays locked to the brim. |
| 6.5–7.3 s | **Release and return.** The fingers open, and the arm lowers along the same path in reverse, ending exactly in the original logo pose. The camera dollies back. |
| 7.6–9.0 s | Near-stationary hold on the complete logo, about 39% of frame width and centred. |

## Revision summary (v2 → v3)

| Issue | Root cause in v2 | Fix |
|---|---|---|
| Arm looked thin and disconnected, and the sleeve changed shape | The original sleeve pixels dissolved into a redrawn sleeve over 3 frames; the bare forearm was a long, thin white shape | The **original sleeve artwork is used for the whole gesture**, with no swap and no dissolve. A thick bare upper arm emerges from its opening, then elbow, forearm, wrist, hand, fingers and thumb, drawn in the face's treatment: white fill, the uniform's 5.6 px black ink outline, and graphic black shading. No skin tone was taken from the hand reference. |
| Missing controls | The hand was one rigid piece | Separate controls for shoulder lift, upper arm, extension out of the sleeve, elbow, forearm (with axial foreshortening), wrist, finger curl (index and middle about the knuckles) and thumb. |
| Hand swept across the face during raise and lower; the lower snapped | The forearm rotated about a low elbow, and the return used a different, faster curve | The raise and lower follow one path, and the lower is the raise run backwards. Phase 1 swings the elbow out while the forearm stays tucked behind the torso. Phase 2 swings the forearm up toward the camera, foreshortened, so the hand rises beside the face. A path check measures **0 px of arm over the face** outside the grip. The lower ends exactly in the logo pose. |
| Tip not convincing | The fingertips only touched the brim; the tip was about 11° | The fingers open on approach, close on contact, stay locked to the hat through a ~12° tip (hat −9°, head −3°), and open on release before the arm moves away. Contact error is 0 px. |
| Entrance relied on a fade | Started behind the letters with a 2-frame fade | **No opacity on the character at all.** He rises from below the frame on a smootherstep curve with peak speed mid-rise (2.35 m/s, reduced from about 4.6), passing behind the subtitle and letters. |
| Clipping risk | — | `tools/check_framing.py` projects the hat, brim, fingertips and elbow through the animated camera every frame. Result: the worker is never visible before his entrance, nothing clips, and the hat keeps at least a 13.6% margin to the frame edge. |

Reference handling: `assets/source/reference-hand-gesture.png` was used only for arm and hand anatomy and the helmet-tip motion (elbow out to the side, fingers over the brim, thumb under it). The face, helmet, uniform, colours, lighting, background, lettering and pedestal in that image were not used.

## Earlier revision (v1 → v2)

| Issue | Root cause in v1 | Fix |
|---|---|---|
| Arm looked disconnected, white tube, hat barely tipped | The raised arm was the original foreshortened sleeve rotated about 100°, attached to a long flat white forearm. The hat tilted 7° with the fingertips only touching. | The arm was redrawn as one limb of the uniform: a yellow sleeve with the black shadowed shoulder, fold strokes, hem and cuff tab, and a shaded forearm emerging from the cuff. The hand grips the brim. Two-bone IK solves the elbow from the wrist. During contact the hand is rigidly attached to the hat, so there is no sliding. The tip is about 11°. The original sleeve pixels are used at rest and dissolve into the drawn sleeve in the first 3 frames of motion, so the logo pose stays pixel-identical. |
| Subtitle overlapped the swash | It used the original logo's position, which crosses the tail. | Moved 30 px (logo scale) below the lowest point of the swash and centred on the lettering. Still black, Montserrat ExtraBold. The knock-out backer was removed. |
| Assembly not readable | Macro camera 0.4 m from a single part | Separated parts are framed together. Each has a quadratic-Bézier path with a mid-flight arc, 3D rotation that settles slightly before the position, and staggered arrivals 0.14 s apart. The crossing of the A leg and flourish was rebuilt geometrically so each part is a clean shape in flight. |
| Entrance abrupt, opacity-led | Hinge pop-up plus fade | Pure vertical rise of 0.62 m from behind the letters, with real occlusion and a slight lean that straightens. The only opacity change is a 2-frame fade-in as the rise begins behind the lettering. |
| Final logo too small | Camera 3.9 m away with the subtitle inside the tail | The subtitle now sits below. The camera stops at 3.68 m: the logo measures 38.8% of frame width with a 7% top and 6% bottom margin, centred to within 4 px. Going wider would crop the composition vertically. |
| Flat depth | 40 mm letters, wall 1.1 m back | 50 mm extrusion with a 6-segment bevel, the backdrop 0.72 m behind for readable soft contact shadows, and the worker 65 mm behind the letters (letter shadows fall on him; parallax). |
| Camera | Catmull-Rom on raw positions, with a fast macro-to-wide pull | A spherical rig (target, azimuth, elevation, distance) with smooth tangents. Rest-to-rest moves use quintic easing, so acceleration is continuous at both ends. |
| SFX | Assembly passes overlapped heavily | Air passes cover only the fast part of each flight, and the clicks are timed from the actual easing curve. Distinct tonal ticks mark the subtitle. Plastic taps mark brim contact and release. The track is silent from 7.0 s. |

## Quality checks performed

- Both MP4s decode all 270 frames. The SFX version is H.264 + AAC, 1920×1080, 30 fps, 9.00 s. The silent version has a video stream only.
- A frame-to-frame difference scan found no pops or flicker spikes, including at re-rendered frame boundaries. The final hold (frames 230–270) has a mean change of 0.07/255.
- Rest pose: the rig's 2D composite before 4.9 s and after 7.25 s differs from the original worker art by zero pixels.
- Lettering: the assembled vectors match the original strokes with IoU 0.983.
- Subtitle: the measured gap below the lowest point of the swash is 30 logo px. Spelling is `Painting & Construction Corp.`
- Camera: speed and acceleration curves have no discontinuities. Rest-to-rest moves are quintic.
- Audio: true peak −1.4 dBTP, −21.3 LUFS integrated, no clipping, silent from 7.1 s to the end.

## Known limitations

- The A leg shows a 1–2 px swell where it passes the crossing. It's visible only very close, in the first 1.5 s of flight.
- The original sleeve pixels dissolve into the drawn sleeve over 3 frames as the arm starts moving, and back as it returns. Motion blur hides most of the dissolve.
- While the worker rises (about 3.1–3.4 s), his lower body passes behind the subtitle words, which briefly reduces their contrast.
- No transparent version was rendered for v2 (not requested). `--alpha` in the scene builder still supports it.

## Fidelity notes

- **"Ari" lettering** is vectorised directly from the supplied logo (`tools/segment_letters.py`); no font is substituted. The assembled parts match the original letter strokes with IoU 0.983; the differences are anti-aliased edges.
- **Swash tail:** the section hidden under the subtitle in the original artwork was rebuilt by fitting the stroke's edges from above and below.
- **Subtitle:** reads exactly `Painting & Construction Corp.` (with the period the brief specifies), in black Montserrat ExtraBold. Words are laid out with Blender's own glyph metrics.
- **Worker:** the original illustration, cleaned to the logo palette and cut into rig layers. Hidden areas were painted in: hair under the hat, the neck under the collar, and the side of the chest under the sleeve. The pose before 4.9 s and after 7.25 s is pixel-identical to the logo.

## Rebuilding

Requirements: Python 3.13, `pip install bpy==5.2.3 opencv-python-headless potracer pillow numpy fonttools`, Node with Playwright (for SVG rasterising), and ffmpeg.

```bash
python3 tools/segment_letters.py        # -> build/letters.json
python3 tools/segment_worker.py         # -> build/layers/{torso,head,hat,uparm}.png, build/rig.json
python3 tools/draw_arm.py               # -> build/svg/{sleeve,forearm,hand}.svg, build/arm.json
node tools/rasterize_svg.cjs 2          # -> build/layers/{sleeve,forearm,hand}.png
python3 tools/preview_rig.py out.png 0 5.5 5.9   # optional 2D check of the gesture
python3 blender/build_scene.py          # -> blender/ari_logo_animation.blend (editable)
tools/render_all.sh                     # -> build/frames_main (Cycles, 12 spp + OIDN)
python3 tools/make_sfx.py build/audio/sfx.wav
tools/encode.sh
```

`blender/ari_logo_animation.blend` opens in Blender 5.2+. Every object is named and editable:

- `Ari_*` letter curves
- `Subtitle_*` words
- `Worker_*` rig layers under `Worker_Root`
- `Camera` with `Camera_Target`
- `Key_Softbox`, `Fill_Softbox`, `Rim_Strip` and `Top_Bounce` area lights
- `Cyclorama` set

The animation is baked per frame from `blender/build_scene.py` (assembly, entrance, camera) and `tools/rig.py` (arm IK, hat tip). Change timing or poses there, then rebuild. A transparent version can still be rendered with `--alpha` (shadow catcher).

## Structure

```
assets/source/   original logo, storyboard, reference
assets/fonts/    Montserrat ExtraBold (SIL OFL)
tools/           segmentation, vector arm, rig + performance, SFX, encoding
blender/         scene builder + saved .blend
build/           generated intermediates (layers, vectors, rig data, audio)
output/          final deliverables (v1 archived in output/v1)
```
