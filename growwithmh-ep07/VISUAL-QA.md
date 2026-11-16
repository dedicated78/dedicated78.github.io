# Episode 07: full-video visual consistency and layering QA

**Scope:** the whole film, 0:00–1:14.33. This was a composition repair, not a redesign.

**Unchanged:**
- Voiceover, dialogue, subtitle text and timing.
- Characters, brand colours, typography, logo, story and duration (74.333 s, 2230 frames).
- Audio: the corrected MP4's audio stream is bit-identical to the approved one (PCM md5 match).

## Pass 1: defects found
Method: 2 fps sheets of the delivered render, plus a frame check at every scene boundary.

| # | Time | Defect | Type |
|---|---|---|---|
| 1 | 0:00.4–0:03.5 | Idea bulb sat under the profile card, so its top was hidden behind the card. | Layering |
| 2 | 0:05.3–0:11.6 | The swelling name field ran past the right edge of the frame, clipping the newest phrase ("Repair…", "Roofe…"). | Viewport clipping |
| 3 | 0:05.3–0:17.0 | The **+N WORDS** counter was anchored past the card's right edge. During the 0:15–0:17 push it was cut off ("+47 WO…"). | Viewport clipping |
| 4 | 0:13.6–0:15.6 | The "NAME TOO LONG TO BE REASONABLE" warning was a screen overlay. It didn't move with the camera, so it drifted off the card and crowded the counter. | Inconsistent framing |
| 5 | 0:14.6–0:19.0 | The camera move "round him" pushed the card's right third out of frame ("Emergency Roof Rep…"). | Viewport clipping |
| 6 | 0:12.0–0:22.3 | The ribbon emerged from mid-air beyond the card, crossed its corner, then ran over the right edge of the frame. | Ribbon path |
| 7 | 0:17.5–0:22.3 | The ribbon's free end ran through the Maps Assistant's pin and tile ("…Staten Island…" over its body). | Ribbon collision |
| 8 | 0:22.3–0:24.2 | The result cards hung at the owner's head height and overlapped his hair. The map cards stayed sharp behind them, so the stack read as cluttered. | Character occlusion |
| 9 | 0:24.2–0:35.5 | The crossed "hostage" bands and knot sat directly over the business name ("…ex Roofing ● Best Brook…"), and the bands overran the card. | Obscured info |
| 10 | 0:31.7–0:35.5 | The wrapped card's edges and bands showed around the caution card ("…pairs —", "ROOF R"), so the two looked collided. | Layering |
| 11 | 0:35.5–0:38.0 | During "SUSPENSION?!" the card, straps and map card ran off the right edge, and the assistant was cut off. | Viewport clipping |
| 12 | 0:38.0–0:38.8 | A near-empty frame between the set and the lesson: the incorrect-example card arrived 0.6 s after the cut. | Transition gap |
| 13 | 0:55–1:02 | The discarded-word pile spread into the assistant's tile. | Overlap |
| 14 | Global | Flat elements (ribbon, owner, labels, crown, bulb) and true-3D cards were sorted only by DOM order. The browser re-sorted them while cards tilted, so layering could flip from frame to frame. | Depth ordering |

Checked and clean, so no change:
- 0:00 opening.
- Lesson field sorting (0:43–0:54).
- Website copy and the full stop (1:04–1:07).
- Statement card and outro (1:07–1:14).
- All caption positions.
- The "Wait…" framing fixed in the previous pass.

## Pass 2: source corrections
- **A. Explicit depth layers (fixes #1, #10, #14 and the root cause of most overlaps).**
  - A small `Z` layer wrapper in `Set7.tsx` gives every flat element a real depth inside the 3D world, so ordering is stable while cards tilt.
  - Back to front: background name scroll, then map card B (z 0), profile card, ribbon (30), owner (45), ribbon in front of his hips (55), labels/crown/bulb/counter/warning (60), map card A (70), result cards (80), caution card, website card, then screen-space kickers and captions on top.
  - The ribbon still deliberately passes in front of map card B and his hips, and behind map card A and his chest.
- **B. Business Profile framing (fixes #2, #3, #4, #5, #11).**
  - The name field may now swell only about 80 px past the card's edge (comedy kept), capped inside the frame. Its type wraps at the field's real width, so no phrase is cut.
  - The counter is right-aligned to the card. The warning is anchored above the card's left corner, in the world, so both move with the camera.
  - The camera keys for the opening push, "round him" and the panic were re-targeted to keep the card, straps, map cards and assistant inside a safe margin.
- **C. Ribbon choreography (fixes #6, #7).**
  - The path now starts exactly at the swollen field's right edge.
  - It runs down inside the right margin, behind map card A and over map card B.
  - It wraps behind his chest and in front of his hips.
  - It ends in a free tail at x 580, well clear of the assistant.
  - The front-of-hips clip region is unchanged.
- **D. Other elements (fixes #8, #9, #13).**
  - **Result cards:** the stack sits above his head at 0.8 scale in a top layer. The map cards step back (fade) while it shows, then return. The cards clear before the straps start.
  - **Hostage straps:** they are now a parcel wrap of three straps (top edge, bottom edge, left edge) with a knot on the top-left corner. They are still clearly "tied up", but the business name stays readable throughout.
  - **Pile:** tightened to four columns and moved left of the assistant's tile.
- **E. Transitions (fix #12).** The lesson's incorrect-example card now arrives with the cut, so there is no empty beat. The results-to-straps hand-off was retimed so the two never overlap.

## Pass 3: final rendered validation
**Technical checks:**
- Full re-render at 1080x1920, 30 fps, 2230 frames, H.264 High plus AAC.
- 0 decode errors, no black frames, no freezes.
- −14.5 LUFS integrated, −1.8 dBFS peak. Audio bit-identical to the approved version.

**Visual checks:**
- **Whole film, 2 fps:** no viewport clipping of the card, field, counter, warning, assistant or straps. No ribbon over a face, the assistant or subtitles. No layer flips.
- **10 fps strips across the main defect windows (0:13.4–0:16.0, 0:22.2–0:24.8, 0:35.3–0:38.7):** smooth entries and exits, no position jumps, and no blank frames at the set-to-lesson cut.
- **Before/after stills:** taken at 1.5, 9.0, 14.3, 16.8, 21.0, 23.0, 26.0, 34.0, 36.6, 38.4 and 57.0 s (`before-after/`).

**Remaining note:** I can't play video in real time. The motion checks were done frame by frame at 10 fps and 2 fps, so give it one normal-speed playback.
