# ARI Painting & Construction Corp. — 3D Logo Animation

A 9-second, 1920×1080, 30 fps cinematic logo animation. It was built in Blender 5.2 (Cycles) from the supplied logo artwork and storyboard.

## Deliverables (`output/`)

| File | What it is |
|---|---|
| `ari-logo-animation_1080p_silent.mp4` | H.264 High, 1920×1080, 30 fps, BT.709, no audio |
| `ari-logo-animation_1080p_sfx.mp4` | Same picture with directional motion SFX (AAC 48 kHz stereo) |
| `ari-logo-animation_1080p_alpha.webm` | VP9 with an alpha channel: logo + soft shadows on transparency |
| `ari-logo-animation_1080p_alpha_prores4444.mov` | ProRes 4444 with alpha, for editors. Only present if the file is under GitHub's size limit (it can be regenerated with `tools/encode.sh`) |
| `ari-logo-final-frame.png` | Final brand frame (opaque) |
| `ari-logo-final-frame-transparent.png` | Final brand frame with alpha |
| `frames-overview.jpg` | One frame per second, for review |

## Sequence

| Time | Scene |
|---|---|
| 0–1 s | Macro glide past the bevelled A flourish. The other letter parts float at different depths, out of focus. |
| 1–2 s | Five letter parts (A flourish, A leg, A thick stroke and tail, r, i) move into place on staggered, decelerating paths with no bounce. The camera pulls back to a perspective angle. |
| 2–3 s | The subtitle rises in word by word. The camera eases to a front three-quarter view. |
| 3–4 s | The worker hinges up from behind the lettering, with follow-through on the head and hat. The camera tilts up. |
| 4–5 s | He settles with breathing idle and an anticipation glance. The camera is slightly elevated and front-facing. |
| 5–6 s | **Hard-hat tip.** The arm rises (shoulder, elbow and wrist on a 2-bone IK). Two fingers contact the brim and tip the hat forward about 7° with a small nod. |
| 6–7 s | The hat returns, the hand releases and lowers back to the original pose, and the camera dollies back. |
| 7–9 s | Full logo reveal, then a near-stationary hold on the original composition. |

## Fidelity notes

- **"Ari" lettering** is vectorised directly from the supplied logo (`tools/segment_letters.py`, potrace at 3×) and is not substituted with a font. The A is split along its natural stroke junctions so the parts can assemble. Where the parts meet, they overlap and tuck under one another.
- **Swash tail under the subtitle:** in the original artwork, the subtitle's white halo covers part of the tail. That hidden section was rebuilt by fitting its edges from above and below the subtitle band.
- **Subtitle:** typeset (not generated) in Montserrat ExtraBold, which is the closest match to the logo, and scaled to the original width. The text is exactly `Painting & Construction Corp.`, including the period the brief asks for (the source logo has none). It is black, with a light knock-out backer like the original's halo, so it stays legible where it crosses the black swash.
- **Worker:** the original illustration's pixels, cleaned to the logo palette and cut into rig layers (torso, head, hat, sleeve). Hidden areas were painted in so motion never reveals holes: hair under the hat, the neck under the collar, and the side of the chest under the sleeve. Each layer is a 4 mm printed cut-out with outline-coloured edges.
- **Arm and hand** are not in the original logo. They are drawn as vector art in the same ink style (`tools/draw_arm.py`): a white skin tone, heavy black outline and graphic black shading. The hand has two extended fingers on the brim, with the ring and little fingers curled and the thumb tucked. They are rigged rather than warped. At rest the forearm is hidden behind the torso, so the first and last frames match the original logo exactly.

## Rebuilding

Requirements: Python 3.13, `pip install bpy==5.2.3 opencv-python-headless potracer pillow numpy fonttools`, Node with Playwright (for SVG rasterising), and ffmpeg.

```bash
python3 tools/segment_letters.py        # -> build/letters.json
python3 tools/segment_worker.py         # -> build/layers/{torso,head,hat,uparm}.png, build/rig.json
python3 tools/draw_arm.py               # -> build/svg/*.svg, build/arm.json
node tools/rasterize_svg.cjs 2          # -> build/layers/{upskin,forearm,hand}.png
python3 tools/preview_rig.py out.png 0 5.6 6.0   # optional 2D check of the gesture
python3 blender/build_scene.py          # -> blender/ari_logo_animation.blend (editable)
python3 blender/build_scene.py --render build/frames_main --samples 12
python3 blender/build_scene.py --render build/frames_alpha --samples 8 --alpha
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

The animation is baked per frame from `blender/build_scene.py` and `tools/rig.py`. Change timing or poses there, then rebuild.

## Structure

```
assets/source/   original logo, storyboard, reference
assets/fonts/    Montserrat ExtraBold (SIL OFL)
tools/           segmentation, vector arm, rig + performance, SFX, encoding
blender/         scene builder + saved .blend
build/           generated intermediates (layers, vectors, rig data, audio)
output/          final deliverables
```
