# ARI Painting & Construction Corp. — 3D Logo Animation (v2)

A 9-second, 1920×1080, 30 fps cinematic logo animation. It was built in Blender 5.2 (Cycles) from the supplied logo artwork and storyboard.

## Deliverables (`output/`)

| File | What it is |
|---|---|
| `ari-logo-animation_1080p_sfx.mp4` | H.264 High, 1920×1080, 30 fps, BT.709, with directional motion SFX (AAC 48 kHz stereo) |
| `ari-logo-animation_1080p_silent.mp4` | Same picture, no audio track |
| `ari-logo-final-frame.png` | Final brand frame, 1920×1080 |
| `frames-overview.jpg` | One frame per second, for review |
| `v1/` | The previous approved-direction version (archived) |

## Sequence

| Time | Scene |
|---|---|
| 0–2.3 s | Five letter parts float apart in space: A flourish, A leg, A thick stroke and tail, r, i. Each travels a curved path with its own 3D rotation and depth move, arriving staggered and decelerating precisely into place. The camera holds a wide enough view to read the parts, with a gentle orbit and dolly. |
| 2.4–3.0 s | The subtitle rises in word by word, below the lettering. |
| 3.0–4.0 s | The worker rises from behind the finished lettering, occluded by the letters, with head and hat follow-through. The camera tilts up. |
| 4.0–5.0 s | He settles with a breathing idle. The camera frames him large and slightly elevated. |
| 5.0–6.0 s | **Hard-hat tip.** The shoulder prepares, the elbow bends and the forearm rises to the brim. The wrist turns so the fingers close over the brim, with the thumb underneath. The hat tips about 8° forward on the head while the head nods about 3°, about 11° in total. |
| 6.0–7.0 s | The hat returns, the hand releases, the arm lowers and the camera dollies back. |
| 7.6–9.0 s | Near-stationary hold on the complete logo. It fills about 39% of the frame width and is centred. |

## Revision summary (v1 → v2)

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
