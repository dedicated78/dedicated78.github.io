# GrowwithMH: What If? SEO Edition · Episode 01
**"Google Verified Me. Where Are My Customers?"**
1080x1920 · 30 fps · 46.500 s (1395 frames) · H.264 High yuv420p + AAC 48 kHz

All times are film time. The supplied VO drives every cue: word onsets come from local Whisper
transcription, and phrase starts are refined against the waveform (`src/cues.json`).

## Storyboard

| # | Film time | VO (verbatim) | Picture | On-screen text | SFX / music |
|---|-----------|---------------|---------|----------------|-------------|
| 1 | 0.00 – 4.56 | OWNER: "Yes! Google verified my business! I'm about to be rich!" | The owner celebrates. The 3D profile card flips in, and the verified seal stamps on "verified" (1.14). Confetti bursts. Coins rain on "rich" (3.90) and he puts on shades. | **VERIFIED!** (1.14) | Pop, confetti, impact. Music section A from frame 0. |
| 2 | 4.56 – 10.98 | "My first customer!" … "Oh, that's my mom." | Typewriter title. The calendar flips MON→THU and moves onto the wall of the empty shop; the clock spins. The phone buzzes on the counter at 5.34. He grabs it on "customer" (6.52) and flips it to reveal caller ID **MOM**, then the record stops (7.22). Silent beat with a slow creep-in, then a whip out. | **3 DAYS LATER...** (4.56) | Whoosh, three page flips, phone buzz ×2, whoosh to the phone, record scratch and tape stop at 7.22. Music then falls silent for the comedic beat. |
| 3 | 10.98 – 14.81 | "Google! You verified me! Where are my customers?" | Low-angle push-in with speed lines. He waves a phone showing "No new calls yet". Extruded **?** marks pop around him on "Where" (12.89). | **WHERE ARE MY CUSTOMERS?** (12.89) | Whoosh, staggered question-mark pops. |
| 4 | 14.81 – 27.53 | OWNER: "Wait, so verified doesn't mean number one? So no millionaire by Friday?" · MAPS ASSISTANT: "Sir, I verified that you can manage your business. I didn't promise you the whole neighborhood. Not on my calendar." | A dimensional map tile unfolds and the Maps Assistant (deadpan pin) rises from it on a light column. The calendar drops in, then flips THU→FRI on "Friday?" (19.60) to show a "Be a millionaire" note. The profile card shows the ribbon "Verified = you can manage it" (22.68). The map grows to the whole neighbourhood on "promise" (24.48). The calendar returns on "Not on my calendar" and the note is struck through on "calendar" (26.92). The assistant blinks deadpan, then the camera pushes through the calendar page. | **VERIFIED ≠ #1** (16.80) | Rise, impact on "number one", calendar drop, page lift on "millionaire" and flips on "Friday?", card slide, neighbourhood whoosh, punchline impact on "calendar". Low music bed returns at 14.7 (about -11 dB, ducked under VO). |
| 5 | 27.53 – 41.27 | NARRATOR: "Here's the thing. Verification is not a shortcut to the top. Local rankings depend mainly on relevance, distance, and prominence. Start with accurate business information, the right category, and a stronger local presence." | An isometric staircase builds. The verified seal sits on step 1 and a flag on the top step. A dashed "shortcut" arc jumps to the top and is crossed out in amber (30.50). A search panel types "plumber near me" (tagged EXAMPLE). Three 3D factor cards land on their words. A checklist profile card ticks each item on its word. | **NOT A SHORTCUT** (30.45) · **RELEVANCE** (33.50) · **DISTANCE** (34.01) · **PROMINENCE** (35.04) · **START HERE** (36.14) | Whoosh in, soft impact on the crossed-out shortcut, panel whoosh, three clicks, three ticks. Music swells to section B at 27.3. |
| 6* | (inside 4) | the "millionaire by Friday?" joke | Covered in scene 4, because the supplied VO places the Friday line before the assistant's answer. | | |
| 7 | 41.27 – 46.50 | "Grow with MH. Get found, not just verified." | The last checklist tick becomes a teal check that flies into place as the wordmark's dot and turns orange. The GrowwithMH wordmark reveals in 3D, then "Get Found." (42.51) and "Not Just *Verified.*" (43.17). Hold to 46.5. | **Get Found. Not Just Verified.** | Deep logo boom at 41.27. Music fades out over the last 1.2 s. |

\*The brief lists the Friday joke as scene 6 after the explainer. The approved VO has it in the confrontation dialogue, so the picture follows the audio.

## Timing rules applied
- A new element enters every 2–4 s. Entrances run 0.3–0.6 s with back-ease pops; scene transitions run 0.4–0.8 s.
- Transitions are motivated: a whip-pan out of the shop, a map tile unfolding, a push-through of the calendar page into a white cut, the staircase sliding out, and the check matching into the logo dot. No generic crossfades between scenes and no camera shake.
- Captions are word-synced. Each word lights up on its onset. Speaker tags are OWNER (amber), MAPS ASSISTANT (teal) and GROWWITHMH (charcoal). Captions sit at y ≈ 1404–1500, inside the 250 px top and 340 px bottom safe areas, and hide when the end card resolves.

## Assets

**Supplied by you, used unaltered**
- `source/vo.mp3`: ElevenLabs VO. The words are untouched. Two silences were added for comedic timing: +1.2 s before "My first customer!" (the 3-days-later beat) and +0.9 s before "Oh, that's my mom." (the reveal pause).
- `source/music-source.mp3`: your music track (1009.MP3). Section A is from 39.45 s and section B from 55.20 s; the tape stop is applied in code.

**Generated in code (original, no AI image/video services, no paid tools)**
- Characters: the business owner (rigged SVG, keyed poses, lip-flap from the VO envelope) and the Maps Assistant (an original teal pin character, not Google branding).
- Props: the 3D profile card, phone with MOM caller ID, calendar, shop interior, map tile/neighbourhood, staircase, search panel, factor cards, confetti, coins, question marks.
- SFX: all synthesized in `scripts/prepare-audio.mjs` (pop, buzz, scratch/tape-stop, whooshes, clicks, ticks, boom).
- The typographic GrowwithMH wordmark.

**Fonts (open licence, bundled locally):** Poppins (OFL), Inter / Inter Display (OFL).

## Notes for your approval
1. **Logo:** no logo file was supplied with this brief, so the end card uses the typographic GrowwithMH wordmark from earlier videos. Send the logo file (SVG preferred) and I will swap it into `Wordmark3D` with no other changes.
2. **Reference 72771** was not accessible and was not reviewed. Only 72756 and 72755 informed the look.
3. **One voice, three roles:** the VO is a single voice for the owner, the assistant and the narrator. Speaker tags in the captions separate them.
4. **Scene order** follows the supplied VO (see the scene 6 note above).
5. **No ranking claims:** the search panel is tagged EXAMPLE and carries no ratings, positions, client names or stats. "Relevance, distance, prominence" are stated as the main factors, matching the VO. Nothing implies Google endorsement.

## QA (final MP4: out/growwithmh-ep01.mp4)
| Check | Result |
|---|---|
| Streams | H.264 1080x1920 30 fps, AAC 48 kHz; video and audio both 46.500 s (no A/V gap) |
| Loudness | -14.7 LUFS integrated, LRA 5.3 LU, true peak -1.8 dBTP (target -16..-14 LUFS, TP <= -1) |
| Black frames > 0.2 s | none |
| Frozen video > 2 s | none (the end card keeps a slow ambient drift) |
| Silence > 0.5 s at -50 dB | 9.54-10.44 s only: the deliberate beat after "that's my mom" |
| First 3 s | frame 0 already shows the owner and the profile card; VERIFIED! lands at 1.1 s |
| Caption sync | word highlights driven by the transcript onsets; spot-checked at every scene boundary |
| Safe areas / clipping | headlines start at y >= 250, captions end above y 1580; review stills at 33 timestamps show no clipped text after fixes (EXAMPLE tag, factor cards at frame edges, stray arc dot) |
| SFX sync | calendar flips moved onto "Friday?" where the page actually turns |
| Claims | no rankings, ratings, client stats or Google endorsement on screen; the search panel is tagged EXAMPLE |
| Logo | typographic wordmark, undistorted (no supplied logo file; see notes) |
| Ending | end card holds 2.3 s after the last word; music fades over the final 1.2 s, no hard cut |

Limits of this QA: audio was checked by measurement (loudness, peaks, silence, cue timing), not by ear.

## Rebuild
```
npm ci
# put vo.mp3 and music-source.mp3 in source/
npm run render -- --browser-executable=/path/to/chrome   # writes out/growwithmh-ep01.mp4
npm run studio                                           # live preview with audio
```
