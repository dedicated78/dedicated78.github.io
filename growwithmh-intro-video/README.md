# GrowwithMH: company introduction film (v2, phonk cut)

This is a 32-second, 9:16 brand film for GrowwithMH, the independent SEO consultancy led by Mehedi Hassan. It's built in [Remotion](https://www.remotion.dev/) and cut to an original 150 BPM instrumental phonk track. Every animation is a pure function of the frame number, so preview, seeking and export always match.

| Spec | Value |
|---|---|
| Size / rate | 1080 × 1920, 30 fps |
| Length | 960 frames = 32.0 s = 20 bars at 150 BPM |
| Grid | 1 beat = 0.4 s = **12 frames** · 1 bar = 1.6 s = **48 frames** · 1/16 = 3 frames |
| Export | H.264 (yuv420p) + AAC 48 kHz |
| Narration | Not included. Script below |

## Story

A business provides a great service. Customers struggle to discover it. GrowwithMH connects its local presence, website and search content. Clients work directly with Mehedi. Then the invitation.

One **search ring** carries the film. It searches in scene 1 and opens the brand, then taps into the map. It selects and inspects in the local scene, scans the website layers, and puts the answer in order. It researches and gathers in scene 6, then sweeps the wordmark and becomes its warm dot.

## Run it

```bash
cd growwithmh-intro-video
npm install
npm run studio     # editable preview (regenerates audio first)
npm run render     # single-pass export -> out/growwithmh-intro.mp4
bash scripts/render-chunked.sh   # same output in 300-frame chunks (use on slow/headless machines)
npm run player     # standalone browser preview -> player/dist
npm run audio      # rebuild music, stems, SFX and src/beats.json
```

On headless Linux, add `--browser-executable=<chrome-headless-shell>` if Remotion can't download its own browser.

## Voiceover script (English, timed to the music)

| Time | Bars | Scene | Voiceover |
|---|---|---|---|
| 0:00 – 0:03.2 | 1–2 | The problem | "Great at what you do, but hard to find online?" |
| 0:03.2 – 0:06.4 | 3–4 | Meet GrowwithMH | "Meet GrowwithMH. SEO consulting by Mehedi Hassan." |
| 0:06.4 – 0:12.8 | 5–8 | Local discovery | "Help nearby customers discover your business through local SEO and Google Business Profile optimization." |
| 0:12.8 – 0:19.2 | 9–12 | Website clarity | "Strengthen your website with technical SEO and clear service content." |
| 0:19.2 – 0:24.0 | 13–15 | Answers & AI search | "Prepare your content for answer engines and AI search." |
| 0:24.0 – 0:28.8 | 16–18 | Personal attention | "Work directly with me, from research to action." |
| 0:28.8 – 0:32.0 | 19–20 | Brand & invitation | "Let's improve your search presence. Visit growwithmh dot com." |

Delivery notes:
- **Scene 3 line:** the longest one (about 5.5 s at a brisk pace). Start it right on 0:06.4.
- **Final line:** tight for 3.2 s. Start it about 0.2 s early (0:28.6), or drop "Visit".
- **Levels:** record the VO around −16 LUFS and duck the music about 6 dB underneath it. Use `public/audio/stems/` if you want to pull the cowbell down instead.

## Music

`scripts/generate-audio.mjs` synthesizes the whole track: punchy kick, layered clap, closed and open hats with rolls, a gliding 808 bass in C♯ minor, and a pitched 808-style cowbell melody. It uses no samples, no vocals and no third-party audio, so it's free to use. The structure follows the story:

| Bars | Section | What changes |
|---|---|---|
| 1–2 | Opening | Cowbell motif and kick from frame 0. Full drums on bar 2, with a riser and snare fill into bar 3 |
| 3–4 | Brand | Impact on the bar-3 downbeat |
| 5–8 | Main A | Full groove with open hats. Bar 8 has a turnaround melody and an 808 glide |
| 9–12 | Main B | Higher cowbell variation. Accent on bar 11. Drums cut on bar 12 beat 4 (break) |
| 13–15 | Answers | Triplet hats, sparser cowbell, fill at the end of bar 15 |
| 16–18 | Personal | Main motif returns. Bar 18 is a snare-roll build with a riser |
| 19–20 | Finish | Phrase hit (bar 19), strongest hit at 29.6 s, resolve on the tonic at 31.2 s |

Mix: the music is about −15 LUFS integrated with peaks at −1.2 dBFS. There's a 3 dB dip at 2.8 kHz on drums and cowbell to leave room for a voice. Stems are in `public/audio/stems/` (drums, bass, cowbell); they sum to the mix. SFX are sparse (clicks, short swishes, two soft taps) and sit around −33 LUFS under the music.

### Beat markers

The generator also writes `src/beats.json`: every kick, snare, accent and phrase, with frame, time, bar and beat. If you replace the music, keep a 150 BPM track and align its downbeat to frame 0, and the cut stays in sync. Key markers:

| Frame | Time | Bar.beat | Marker | Visual |
|---|---|---|---|---|
| 0 | 0.0 | 1.1 | kick · phrase | "Great service." on screen, business card lands |
| 24 | 0.8 | 1.3 | kick | quality checks fill on 16ths |
| 48 | 1.6 | 2.1 | kick | cut to "Hard to find?", search card arrives, details scatter |
| 84 | 2.8 | 2.4 | snare | ring sweeps the scattered details, then rushes the camera |
| 96 | 3.2 | 3.1 | **impact** · phrase | ring opens onto cream, extruded wordmark lands |
| 108 | 3.6 | 3.2 | snare | "SEO consulting by Mehedi Hassan" |
| 120 / 129 / 144 | 4.0 / 4.3 / 4.8 | 3.3 / 3.3+ / 4.1 | kicks | map, website, answer objects arrive |
| 168 | 5.6 | 4.3 | kick | ring taps the map, camera dives in |
| 192 | 6.4 | 5.1 | phrase | map unfolds into a ground plane |
| 204 | 6.8 | 5.2 | snare | business profile rises, pin drops |
| 216–234 | | 5.3–5.4 | 8ths | profile details snap into order |
| 240 | 8.0 | 6.1 | kick | "Local SEO + Google Business Profile" |
| 252 | 8.4 | 6.2 | snare | ring selects Services, link draws to the location |
| 312 | 10.4 | 7.3 | kick | service radius pulses around the location |
| 336–344 | | 8.1 | 16ths | Call / Directions / Website pop |
| 372 | 12.4 | 8.4 | snare | ring clicks Website, profile turns edge-on |
| 384 | 12.8 | 9.1 | phrase | website comes round, light sweeps charcoal → cream |
| 408 | 13.6 | 9.3 | kick | website explodes into three layers |
| 435 / 447 / 459 | | 10.1–10.3 | beats | ring scan: structure aligns, content sharpens, links connect |
| 480 | 16.0 | 11.1 | **accent** | layers slam back together, "Clearer services." |
| 540 | 18.0 | 12.2 | snare | "What we do" block lifts out |
| 564 | 18.8 | 12.4 | break | drums drop out while the block flies |
| 576 | 19.2 | 13.1 | phrase | block turns into the answer card, question typed |
| 600 | 20.0 | 13.3 | kick | source page arrives, information flows up |
| 636 | 21.2 | 14.2 | snare | ring puts the answer in order |
| 648 / 660 | 21.6 / 22.0 | 14.3 / 14.4 | kick / snare | "Connected information." / "AEO + GEO" |
| 696 | 23.2 | 15.3 | kick | objects gather, cream horizon rises |
| 720 | 24.0 | 16.1 | phrase | "Work directly with Mehedi." |
| 744 / 768 / 792 | 24.8 / 25.6 / 26.4 | 16.3 / 17.1 / 17.3 | kick | Research / Priorities / Action |
| 840–862 | | 18.3–18.4 | snare roll | objects compress into the ring |
| 864 | 28.8 | 19.1 | **phrase hit** | hard cut to charcoal, shockwave |
| 888 | 29.6 | 19.3 | **strongest hit** | ring collapses into the wordmark's dot. Reveal complete |
| 936 | 31.2 | 20.3 | **resolve** | URL glow pulse; CTA held to 32.0 s (about 2.2 s on screen) |

## Where to edit

| What | File |
|---|---|
| On-screen copy | `src/content.ts` |
| Beat grid helper `B(bar, beat, 16ths)` | `src/beats.ts` |
| Shared positions | `src/layout.ts` |
| Recurring ring path, clicks | `src/ring.ts` |
| 3D cards (edge thickness, sheen, contact shadow, internal depth layers, entrance pose) | `src/components/Card3D.tsx` |
| Extruded wordmark | `src/components/Wordmark3D.tsx` |
| Scenes | `src/scenes/S1Problem.tsx` … `S7Reveal.tsx` |
| Music, stems, SFX, markers | `scripts/generate-audio.mjs` (+ SFX cues in `src/timeline.json`) |
| Colours | `src/theme.ts` |

Three different 3D treatments are used: a card pulled forward from a layered stack (scenes 1 and 6), the website separating into an exploded view (scene 4), and panels rotating edge-on into the next scene (scene 3→4 and 4→5).

Technical notes:
- **No fades on 3D containers:** CSS flattens any `preserve-3d` element that has opacity below 1, a filter or `overflow: hidden`. So fades go on the leaf faces only.
- **One 3D context per card:** each main object gets its own `Stage`. Cards sharing a context get split by Chrome's depth sorting, which produced a visible wedge artifact.

## Content rules

- No invented results, ratings, reviews, rankings, enquiries, team size or years.
- The business is a generic illustration ("Your business"). The map is schematic.
- The answer interface is unbranded and doesn't imply guaranteed AI citations.
- The wordmark is typographic, as in the company profile. An official logo file, if you have one, should replace `Wordmark` in `src/components/Primitives.tsx`.
- Font: Inter / Inter Display (SIL OFL), bundled in `public/fonts`.
