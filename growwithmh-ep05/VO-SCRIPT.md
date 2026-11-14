# Episode 05 · Voiceover integration

The lines are used as recorded and placed in the brief's 14-step dialogue order (15 lines, because step 14 is the assistant's punchline followed by the narrator's outro).
- **Source take:** `ElevenLabs_2026-11-14T12_30_14_Jack_John_-_Conversational_and_Upbeat_eleven_v4.mp3`, 56.11 s, mono 44.1 kHz.
- **How the source is ordered:** grouped by speaker:
  - owner 0–18.9 s
  - auctioneer 19.4–28.8 s
  - Maps Assistant 28.8–40.3 s
  - narrator 40.7–55.6 s
- **How it was cut:** each line is cut at the centre of the silence around it and placed below. No word was altered, re-timed inside a line, sped up or synthesized. Every line in the recording is used, and nothing was omitted.

| Line | Speaker | Text | Source in → out (s) | Film words (s) | Gap after (s) |
|---|---|---|---|---|---|
| L01 | AUCTIONEER | "Welcome to the number one Google Maps auction!" | 19.42–22.74 | 0.55–3.44 | 0.35 |
| L02 | AUCTIONEER | "Opening bid! $100!" | 22.97–25.44 | 4.21–5.86 | 0.45 |
| L03 | BUSINESS OWNER | "$500! Make my roofing company number one!" | 0.14–3.88 | 7.12–10.65 | 0.35 |
| L04 | AUCTIONEER | "$500! Going once, going twice, SOLD!" | 25.57–29.20 | 11.26–14.40 | 0.60 |
| L05 | BUSINESS OWNER | "Yes! Finally! Google Maps domination!" | 4.00–7.62 | 15.45–18.71 | 0.95 |
| L06 | BUSINESS OWNER | "Wait, why does my listing say Sponsored?" | 8.03–10.83 | 20.02–22.41 | 0.90 |
| L07 | MAPS ASSISTANT | "Because you bought advertising, not an organic ranking." | 29.45–33.14 | 23.71–27.06 | 0.35 |
| L08 | BUSINESS OWNER | "So... I didn't buy the number-one organic spot?" | 11.20–14.15 | 27.75–30.51 | 0.35 |
| L09 | MAPS ASSISTANT | "Sir, there's no checkout button for number one on Google Maps." | 33.47–37.16 | 31.06–34.38 | 0.60 |
| L10 | GROWWITHMH NARRATOR | "Google Maps can display paid ads marked Sponsored," | 40.70–43.57 | 35.36–38.03 | 0.30 |
| L11 | GROWWITHMH NARRATOR | "but advertising doesn't buy you a higher organic local ranking." | 43.91–47.38 | 38.53–41.77 | 0.35 |
| L12 | GROWWITHMH NARRATOR | "Organic local visibility mainly depends on relevance, distance, and prominence." | 47.71–52.52 | 42.35–47.01 | 0.60 |
| L13 | BUSINESS OWNER | "Great. I bought an ad... and a tiny imaginary trophy." | 14.58–19.07 | 47.76–52.01 | 0.35 |
| L14 | MAPS ASSISTANT | "Congratulations. Your trophy is non-refundable." | 37.40–40.50 | 52.62–55.44 | 2.00 |
| L15 | GROWWITHMH NARRATOR | "GrowwithMH. Get found. Grow smarter." | 52.86–55.94 | 57.70–60.43 | 0.00 |

- **Comedic pause at the Sponsored discovery:**
  - The celebration music hard-cuts at 18.91 s, right after "...Google Maps domination!".
  - The "Sponsored" label pops at 19.26 s.
  - "Wait..." begins at 20.02 s, so the label hangs for **0.75 s** with no voice and no music. Only a soft label tick plays.
  - The music returns quietly under the Maps Assistant's first line.
- **Lead-in and tail:** 0.50 s before L01 and a 2.3 s end-card tail after L15. The film runs 63.067 s.

## Audio assets (EP05-audio-assets.zip)
- `vo-sequenced.wav`: the voiceover in film order. 48 kHz.
- `music-bed.wav`: the original series bed (synthesized here, no licensed music):
  - It is an upbeat auction-room groove through the bidding and celebration.
  - It hard-cuts for the Sponsored discovery and returns at 45% under the explanation.
  - It ends with the end-card chord.
- `sfx.wav`: synthesized effects:
  - room murmur, bid "dings" and counter clicks
  - going once / going twice ticks, the automated gavel strike and celebration pops
  - the record scratch at the cut, the Sponsored tick and the listing rise
  - the checkout whoosh, the "not for sale" boop and stamp
  - lesson clicks, the trophy shrink and the sonic logo
- `master.wav`: the final mix. The music is −10 dB and sidechain-ducked under the VO, the SFX are −1 dB, the mix is loudnormed to −14 LUFS and the limiter is set to −2 dBFS.
- `vo-supplied-original.mp3`: the untouched ElevenLabs file.
