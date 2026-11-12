# GrowwithMH: What If? SEO Edition · Episode 03
**"I Added 20 Cities. I'm Famous Everywhere!"**
1080x1920 · 30 fps · 58.667 s (1760 frames) · H.264 High yuv420p + AAC 48 kHz

All timing comes from the supplied ElevenLabs VO. Word onsets come from local Whisper (small, int8) and are mapped onto the script words. Each line's first word is clamped inside its own clip and re-detected from the waveform (`src/cues.json`).

## Voiceover handling
- **Source:** `ElevenLabs_2026-11-12T13_03_49_Jack_John_-_Conversational_and_Upbeat_eleven_v4.mp3`, 52.77 s, mono 44.1 kHz.
- **How the file is ordered:** all 16 lines, grouped by character:
  - Owner: 0.0–18.4 s.
  - Maps Assistant: 18.9–33.8 s.
  - Narrator: 34.3–52.4 s.
- **How the edit was made:**
  - Each line is cut at the centre of the real silence around it. Every cut edge measures between -37 and -89 dB; speech is about -20 dB.
  - The lines are placed in conversational order with comedic gaps (`src/script.json`).
- **What was not changed:** no word was edited, trimmed inside a line, re-timed, sped up or synthesized.
- **One word to confirm by ear:** in L06, local Whisper hears "But I **could** save." The scene, the Sequence D title and the reply ("Yes, your thumb worked perfectly") all need "**clicked**". The captions use "clicked". If the take really says "could", regenerate that line only and the edit re-times automatically.
- **Voices:** this is the same ElevenLabs voice and delivery set as Episode 02 ("Jack John"), one file covering all three roles.

## Final timing breakdown

| Seq | Film time | Line (speaker) | Picture | Kicker |
|---|---|---|---|---|
| A · The Great Expansion | 0.00 – 4.64 | L01 owner 0.33–4.00 "I did it! I added 20 cities to my Google Business Profile." | Two small fist pumps on "I did it!", with the elbow kept by his side. A dimensional **Service areas** panel turns in beside him. On "added" (1.50) the counter steps 01 → 05 → 10 → 15 → 20, and illustrative pins, highlighted areas and fictional area labels populate its map. His eyes go wide and his shoulders bounce on "Profile". | **I ADDED TWENTY CITIES!** (1.50) |
| B · The Imaginary Empire | 4.64 – 8.76 | L02 owner 4.68–8.29 "Brooklyn, Queens, Manhattan. I'm taking over New York." | The panel turns edge-on and a stylized New York map (tagged IMAGINATION) turns in. A borough pin pops on each spoken name. On "taking over" (7.09) pins spread everywhere, a cartoon crown drops onto his head, and he takes a hands-on-hips power pose with his chin up. A spotlight finds him on "New York". | |
| C · Reality Check | 8.76 – 21.9 | L03 assistant 10.12–12.24 · L04 owner 12.99–16.11 · L05 assistant 16.62–20.44 | **Freeze** (8.76): every fantasy motion stops dead, with a record-scratch. The Maps Assistant rises on its unfolding map tile with a light column (the Episode 01 entrance). The spotlight cuts out, and the crown tilts, falls and bounces at his feet. "Congratulations. You made a list.": the fantasy map settles and turns into a plain checked list, "20 of 20". "Wait, so I'll rank number one in all 20?": a one-palm question with the elbow by his torso, peaking on "all 20?". On "teleportation" a comedy portal opens between them. He leans and steps toward it, and it collapses into a small map pin (21.29). | **CONGRATULATIONS.** (10.12) · **YOU MADE A LIST.** (11.11) · **NOT A TELEPORTATION DEVICE.** (18.79) |
| D · But I Clicked Save! | 21.9 – 31.7 | L06 owner 22.07–22.93 · L07 assistant 23.61–25.64 · L08 owner 26.78–28.46 · L09 assistant 29.10–30.96 | A **SAVED** confirmation floats up. He leans in, frustrated, and points at it (index finger extended along the forearm, elbow low). On "thumb" a thumbs-up icon pops beside it, followed by a comedic pause with a small impact. "Then what did I actually accomplish?": both hands open at his sides and his shoulders settle. "…where you're willing to work.": the list gains a "Where you're willing to work" banner. The camera then pushes into the card. | |
| E · The Lesson | 31.7 – 47.2 | L10 31.75–35.51 · L11 36.11–39.97 · L12 40.55–42.29 · L13 42.74–46.39 (narrator) | **ADDING SERVICE AREAS ≠ AUTOMATIC RANKINGS**, with the ≠ spinning in on "automatically". Three dimensional cards land on their words: **RELEVANCE**, **DISTANCE**, **PROMINENCE**. An **example** local map shows one business, a "Nearby" searcher and a "Far away" searcher, linked by distance lines. The business's actual service area is drawn on "Choose". **SERVICE AREAS = WHERE YOU SERVE** appears on "serve". "Accurate business info" and "Stronger local presence" tick in on their words. The camera orbits slowly. | |
| F · Final Punchline | 47.2 – 52.75 | L14 owner 47.26–49.01 · L15 assistant 49.64–52.00 | Back on the set, his shoulders lower, his face softens and he nods slightly. The service-area panel is back to normal. On "Zero" a tiny cape appears behind his shoulders; it slips off after "superpowers". He glances at the map, then down. A short pause, with the music cut. | **TWENTY CITIES. ZERO SUPERPOWERS.** (49.64) |
| G · Outro | 52.75 – 58.67 | L16 narrator 53.34–56.05 "GrowwithMH. Get found. Grow smarter." | The Episode 02 end card: a teal check flies in and becomes the wordmark's orange dot, the **supplied logo** turns in as a 3D tile, and the wordmark reveals. Then "Get Found." (54.57) and "Grow *Smarter.*" (55.53). The sonic logo plays, and a soft chord fades out on the last frame. | |

## Character animation (Episode 02 lessons applied)
- **No handheld props.** Every interface floats. The phone controls stay off for the whole episode.
- **Hand placement:** every hand that touches something (fist pumps, hands on hips, pointing, reaching toward the portal) is solved with two-bone IK, so the elbow hangs under the hand and moves only with it.
- **Confusion:** the "all 20?" question reuses the palm-up keyframes approved in the Episode 01 correction.
- **Pointing:** a new rig control, `pR`, extends the index finger along the forearm with the thumb tucked. The arm is aimed at the SAVED badge.
- **Crown and cape:** they follow his head and shoulders through forward kinematics (`headPoint`, `bodyPoint`), so they move with the body. The crown sits on the hair, then tilts, falls and bounces.
- **The Maps Assistant** only blinks, shifts its gaze and raises a brow, and rises with the established entrance.
- **The freeze is real:** the owner, the map pins, the water and the spotlight stop moving for the beat before the assistant appears.

## SEO fact-check (Google Business Profile Help, read 2026-11-12)
- **Manage your service areas** (support.google.com/business/answer/9157481):
  - "You can have up to 20 service areas."
  - "The boundaries of your overall area shouldn't be more than about 2 hours of driving time from where your business is based." The page currently lists no exceptions, so none are claimed on screen.
  - "When you set your service area, be as specific and accurate as possible."
  - "Your service area shows customers where you can provide your products and services."
- **Tips to improve your local ranking** (support.google.com/business/answer/7091):
  - Sections: Relevance, Distance and Prominence.
  - "Distance refers to how far each business is from the customer who's searching."
  - "There's no way to request or pay for a better local ranking on Google."
- **How the episode stays accurate:**
  - Adding areas is never shown improving rankings.
  - The map is labelled EXAMPLE MAP, with no positions, ranks or results.
  - The New York map is tagged IMAGINATION. It is the owner's fantasy, labels the boroughs by name only, and never calls them separate cities.
  - Nothing implies every business should select all 20 areas: the narration says "Choose areas you actually serve".
- **Wording note:** the page's summary sentence currently says local results are "mainly based on relevance, distance, and popularity", while its section heading is "Prominence". The narration and cards follow the heading.

## Assets
**Supplied:**
- The ElevenLabs VO above. Not committed; it lives in `source/`.
- The GrowwithMH logo, the same file as Episode 02 (`public/brand/growwithmh-logo.jpg`).

**Reused from Episodes 01–02:** the owner rig, the Maps Assistant, Card3D, captions, kickers, studio, the end card, the music bed and the SFX synth.

**New in code:**
- Props: the service-area panel, the stylized New York map, the area list, crown, spotlight, portal, SAVED badge, thumbs-up icon, cape, statement card, example map and serve card.
- The pointing rig control.
- SFX for the scratch, crown thud, pin pops and portal.

## QA summary (final MP4: out/growwithmh-ep03.mp4)
| Check | Result |
|---|---|
| File | H.264 High, yuv420p, 1080x1920, 30 fps, 1760 frames; AAC 48 kHz. Video and audio are both 58.667 s. A full decode reports 0 errors. |
| Loudness | -14.5 LUFS integrated, LRA 3.6 LU, true peak -1.9 dBTP. |
| Dialogue vs music | The ducked music sits 16–17 LU under the VO during speech. |
| Black frames / freezes | None. |
| Silence > 0.5 s | 52.41–53.28 s only. This is the intended comedic pause after "Zero superpowers." |
| Opening hook | Frame 0 shows the owner mid-celebration, and the service-area panel turns in from 0.13 s. |
| Line cuts | Every cut edge measures -37 to -89 dB in the source (speech is about -20 dB). Every line's words sit inside its own clip with no overlap. Two stretched Whisper onsets were caught and fixed: the "perfectly"/"You told" cut and the "Brooklyn" onset. |
| Subtitles | Words light up on their spoken onsets, at most 4 words per caption, with speaker tags. They sit inside y 1404–1560 and hide on the end card. Kickers stay within x 90–990 and clear the cards. |
| Gestures at half speed | Strips at 10–20 fps cover the full rest → peak → rest cycle of the fist pumps, power pose, freeze and crown fall, palm-up question, portal step, pointing, open hands, and disappointment with the cape. There are no snaps; the pointing rise was eased to 0.42 s after review. Elbows stay under the hands, nothing clips, and there is no handheld prop. |
| Consistency with Episode 02 | Same owner and assistant models, studio, palette, Card3D system, captions, kickers and end card, with the supplied logo. |
| SEO claims | Checked against Google's live help pages; see "SEO fact-check". |

Limits of this QA: I can't watch or listen in real time. Motion was checked through frame strips, and audio through loudness, silence, cut-edge and timing measurements. Give it one full playback on a phone, and listen to L06 ("clicked" vs "could").
