# Episode 06 · Voiceover integration

**Source take:** `ElevenLabs_2026-11-15T08_35_51_Jack_John_-_Conversational_and_Upbeat_eleven_v4.mp3` (68.28 s, mono 44.1 kHz). This is the same "Jack John" voice used in Episodes 02, 03 and 05.

**How the file is ordered.** Lines are grouped by speaker:
- owner: 0–20.2 s
- Maps Assistant: 20.4–53.2 s
- narrator: 53.4–68.1 s

**How the lines were placed.**
- Each of the 17 lines was cut at the centre of the silence around it.
- The lines are placed in the brief's mandatory dialogue order.
- No word was altered, re-timed inside a line, sped up or synthesized.
- Every recorded line is used.

**Transcript fixes.** These are labels only; the audio is untouched. Whisper misheard three words, and they are corrected for captions:
- "10th" → "tenth"
- "VEDA" → "beta"
- "ReviewCount" → "review count"

| Line | Speaker | Text | Source in → out (s) | Film words (s) | Gap after (s) |
|---|---|---|---|---|---|
| L01 | BUSINESS OWNER | "My competitor has a hundred Google reviews... and I have five!" | 0.10–4.30 | 0.38–4.21 | 0.50 |
| L02 | BUSINESS OWNER | "That's it. My business is officially dead!" | 4.77–7.96 | 5.09–7.99 | 1.50 |
| L03 | BUSINESS OWNER | "Goodbye, little roofing company. You deserved better." | 8.36–12.04 | 9.79–13.24 | 3.50 |
| L04 | MAPS ASSISTANT | "Are you holding a funeral for your Google Business Profile?" | 20.55–23.80 | 16.96–19.99 | 0.45 |
| L05 | MAPS ASSISTANT | "More reviews can help. They don't automatically win every search." | 24.27–28.22 | 20.64–24.29 | 0.50 |
| L06 | BUSINESS OWNER | "Wait... reviews aren't the whole ranking?" | 12.51–15.01 | 25.10–27.32 | 0.40 |
| L07 | MAPS ASSISTANT | "Google also considers relevance, distance, and prominence." | 28.58–32.34 | 28.00–31.53 | 0.80 |
| L08 | GROWWITHMH NARRATOR | "Reviews and ratings matter, but review count alone doesn't decide Google Maps rankings." | 53.38–58.19 | 32.56–37.05 | 0.40 |
| L09 | GROWWITHMH NARRATOR | "Keep your business information accurate, choose relevant categories, and ask genuine customers for honest feedback." | 58.59–64.80 | 37.77–43.68 | 0.70 |
| L10 | BUSINESS OWNER | "So... I still have a chance?" | 15.40–17.30 | 44.68–46.28 | 0.40 |
| L11 | MAPS ASSISTANT | "Maybe focus on customers instead of planning a burial." | 32.69–35.95 | 46.98–49.83 | 0.50 |
| L12 | BUSINESS OWNER | "So... should I take the flowers back?" | 17.71–20.21 | 50.76–52.93 | 0.40 |
| L13 | MAPS ASSISTANT | "Keep the flowers. Your office looks depressing." | 36.28–39.04 | 53.63–55.84 | 1.10 |
| L14 | MAPS ASSISTANT | "Oh, and here's some quick SEO news!" | 39.31–41.61 | 57.49–59.40 | 0.35 |
| L15 | MAPS ASSISTANT | "On November tenth, OpenAI launched Businesses in ChatGPT in beta!" | 41.87–46.51 | 60.13–64.56 | 0.35 |
| L16 | MAPS ASSISTANT | "Eligible businesses can claim their profiles through Business Hub and, after verification, update their information!" | 46.76–53.15 | 65.12–71.13 | 0.95 |
| L17 | GROWWITHMH NARRATOR | "GrowwithMH. Get found. Grow smarter." | 65.09–68.11 | 72.46–75.24 | 0.00 |

**Cut edges.** Every cut edge measures −55 dB or lower in the source; speech sits around −20 dB.

**Voice separation.** One voice plays all three roles. Median pitch per role:

| Role | Median pitch |
|---|---|
| Owner | about 145–280 Hz (varies with emotion) |
| Maps Assistant | about 200–310 Hz |
| Narrator | about 127–160 Hz |

**Key pauses.**
- **Flowers placed:** the bouquet leaves his hand at 13.39 s.
- **Stillness:** a deliberate stillness of about 0.95 s follows, under the violin cue.
- **Assistant enters:** the Maps Assistant arrives quietly at 14.35 s.
- **Noticing:** it looks at the tombstone, then the bouquet, then the owner.
- **Beat before speaking:** it holds about 0.5 s before "Are you holding a funeral..." at 16.96 s.
- **After the punchline:** a 1.1 s beat follows "Your office looks depressing."

**Timing.** There is a 0.35 s lead-in before L01 and a 2.3 s end-card tail after L17. The film runs 77.767 s.

## Audio assets (EP06-audio-assets.zip)
- `vo-sequenced.wav`: the voiceover in film order, 48 kHz.
- `music-bed.wav`: an original synthesized bed (no licensed music):
  - the series bed under the comparison
  - silence for the sting
  - a slow minor pad during the funeral
  - silence for the stillness and the assistant's entrance
  - a quiet return under the explanation
  - a brighter major bed for hope, the flower joke and the news segment
  - the end-card chord
- `sfx.wav`: synthesized effects:
  - counter clicks and a dramatic discovery sting (brass-like stab and timpani)
  - funeral whoosh and memorial landing
  - two soft footsteps and sniffs
  - a paper rustle as the flowers are laid down
  - a short melancholy violin phrase (A–G–F–E)
  - a quiet rise for the assistant
  - map whoosh and factor clicks
  - lesson ticks
  - sparkle and pop for the flower transformation
  - the news notification
  - a small bounce and light steps for the guest cameo
  - the sonic logo
- `master.wav`: the final mix. Music is −10 dB and sidechain-ducked under the VO, SFX are −1 dB, loudnorm brings it to −14 LUFS, and a limiter sits on top.
- `vo-supplied-original.mp3`: the untouched ElevenLabs file.
