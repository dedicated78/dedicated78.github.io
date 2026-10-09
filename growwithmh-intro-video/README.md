# GrowwithMH: company introduction video

A 40-second, 9:16 introduction film for GrowwithMH, the independent SEO consultancy led by Mehedi Hassan. It's built in [Remotion](https://www.remotion.dev/) (React), and every animation value is computed from the current frame. Seeking, the Studio preview and the export always produce the same image.

| Spec | Value |
|---|---|
| Size | 1080 × 1920 (9:16) |
| Frame rate | 30 fps |
| Duration | 1200 frames, exactly 40.0 s |
| Export | H.264 MP4 (yuv420p, CRF 16) + AAC audio |
| Narration | Not included. Script below, record and lay it over the bed |

## Run it

```bash
cd growwithmh-intro-video
npm install
npm run studio          # editable preview at http://localhost:3000
npm run render          # -> out/growwithmh-intro.mp4
npm run player          # -> player/dist: standalone browser preview (scrubbable, with VO script)
npm run audio           # rebuild public/audio/*.wav after retiming cues
```

The audio WAVs aren't committed. `studio`, `render` and `player` regenerate them first, and the output is identical each time.

In Studio, `GrowwithMHIntro` is the full film. `Scenes/Scene-S1` … `Scene-S7` preview one scene each, with 15 frames of handles on either side.

On headless Linux, add `--browser-executable=<path to chrome-headless-shell>` if Remotion can't download its own browser.

## Where to edit

| What | File |
|---|---|
| All on-screen copy | `src/content.ts` |
| Colours, fonts, shadows, safe area | `src/theme.ts` |
| Scene boundaries + every sound-effect cue (frame-accurate) | `src/timeline.json` |
| Scenes | `src/scenes/S1Search.tsx` … `S7Reveal.tsx` |
| Shared parts (wordmark, lens, text reveal, cursor, environments) | `src/components/` |
| Easing and tween helpers | `src/lib/anim.ts` |
| Music + SFX synthesis | `scripts/generate-audio.mjs` |
| Mix levels | `musicVolume` / `sfxVolume` props on the composition (Studio → Props) |

Each scene owns its incoming transition: it mounts a little before its start frame and draws the mask or bridge object that carries the viewer in. Bridge objects are handed over at named frames (`S1_LENS_HANDOFF`, `PIN_HANDOFF`, `PANEL_HANDOFF`, `LIFT_HANDOFF`, `S5_HANDOFF`, `S6_EXIT`), so a timing change in one scene should be matched in the next.

## Voiceover script (English)

Record at a relaxed, confident pace. Each line fits inside its scene with room to breathe.

| Time | Scene | Voiceover |
|---|---|---|
| 0:00 – 0:04 | 1 · Can customers find you? | "Your customers are searching. Let's help them find you." |
| 0:04 – 0:08 | 2 · Meet GrowwithMH | "Meet GrowwithMH, independent SEO consulting led by Mehedi Hassan." |
| 0:08 – 0:14 | 3 · Local search presence | "From Google Maps to local search, I help customers discover your business." |
| 0:14 – 0:21 | 4 · Website foundations and content | "With technical SEO and clearer content, your website can work harder." |
| 0:21 – 0:27 | 5 · Search is evolving | "I also help prepare your content for answer engines and AI search." |
| 0:27 – 0:34 | 6 · The personal approach | "It starts with your business, clear priorities and steady improvements." |
| 0:34 – 0:40 | 7 · Brand reveal and invitation | "Ready to get found? Visit growwithmh dot com. Let's grow with M H." |

Suggested VO level is around −16 LUFS integrated. The music bed sits near −27 LUFS, so you shouldn't need to duck it.

## Scene breakdown

| # | Frames | Environment | Focal action | Transition out |
|---|---|---|---|---|
| 1 | 0–120 | Charcoal | Search field enters in depth with three soft-focus layers. Cursor click, "local service near me" typed, camera push. | The search lens is isolated and travels to centre. Inside it the cream world opens (iris). |
| 2 | 120–240 | Cream | The lens becomes the ring framing the wordmark. Six service symbols settle into a restrained orbit. Founder card. | Camera pushes through the ring. The local-search pin comes forward while dark closes in from the edges. |
| 3 | 240–420 | Charcoal | Pin drops onto a schematic map (ripples). The "Your business" profile assembles. Camera into the services, then pull back to the service radius and search connection. | The panel rotates edge-on while a light band sweeps charcoal → cream. |
| 4 | 420–630 | Cream | The panel returns as a website. The inspection scan stops three times: technical tags snap into order, service cards align and gain titles (close-up), internal links draw. | The services block lifts out of the page as dark descends from the top. |
| 5 | 630–810 | Charcoal | Camera on the question bar; the question is typed and submitted. Pull back as the answer assembles from the carried block plus two more. SEO + AEO + GEO. | The question and blocks morph into four nodes as a cream horizon rises (dark → light). |
| 6 | 810–1020 | Cream | Marker travels Understand → Prioritize → Improve → Refine. Each stage performs its own small action. | The marker leaves the line and becomes the lens. |
| 7 | 1020–1200 | Cream | The lens sweeps the wordmark (magnified inside the lens), then collapses into the brand's warm dot. Teal light, tagline, URL. Reveal complete by ~36.6 s, held to 40 s. | n/a |

## Audio

`public/audio/music.wav` and `public/audio/sfx.wav` are synthesised by `scripts/generate-audio.mjs`. There are no samples or third-party recordings, so you're free to use them. The bed is a warm D-major pad with a soft pluck arpeggio, and its chord changes land on scene boundaries. The effects (typing, two cursor clicks, soft shutters on camera moves, brushed or whoosh transitions that pan with moving objects, a quiet scan texture and one low "bloom" on the brand reveal) are all placed from the cues in `src/timeline.json`.

## Notes on content

- The film doesn't use client results, ratings, review counts, rankings, certifications, team size or years of experience.
- The interfaces are generic illustrations of SEO work, not products for sale. The business is "Your business" and the map is a schematic, not a real place.
- The wordmark is typographic, matching the company profile ("Growwith" + teal "MH" + warm dot). If you have an official logo file, it should replace `Wordmark` in `src/components/Primitives.tsx`.
- Font: Inter / Inter Display (SIL Open Font License), bundled in `public/fonts`.
