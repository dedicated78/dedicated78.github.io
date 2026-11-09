# GrowwithMH: What If? SEO Edition · Episode 02
**"What If Google Maps Could Talk?"**
1080x1920 · 30 fps · 60.533 s (1816 frames) · H.264 High yuv420p + AAC 48 kHz

Everything is timed to the supplied ElevenLabs VO. Word onsets come from local Whisper (small, int8),
mapped onto the approved script words and refined against the waveform (`src/cues.json`).

## Voiceover handling
- **Source:** `ElevenLabs_2026-11-09T09_43_06_Jack_John_-_Conversational_and_Upbeat_eleven_v4.mp3`, 55.95 s, mono 44.1 kHz.
- **How the file is ordered:** it holds all 16 script lines grouped by character:
  - Owner: 0.0–14.9 s.
  - Maps Assistant: 15.1–37.7 s.
  - Narrator: 37.9–55.9 s.
- **How the edit was made:**
  - Each line is cut at the centre of the silence around it, with 6 ms and 40 ms fades so the cuts don't click.
  - The lines are placed in script order, with the comedic gaps listed in `src/script.json`.
- **What was not changed:** no word was edited, trimmed, re-timed inside a line, sped up, or generated.
- **Transcript check:** it matches the approved script word for word. Whisper wrote "Grow with MH" for "GrowwithMH", and it reads the same aloud.
- **Voices:** the filename names one ElevenLabs voice ("Jack John"). The three blocks differ clearly in pitch:
  - Owner: about 200 Hz median.
  - Assistant: about 232 Hz median.
  - Narrator: about 133 Hz median.

  It could be three voices or one voice with three deliveries; this needs your confirmation.

## Final timing breakdown

| Scene | Film time | Line (speaker) | Picture | Kicker |
|---|---|---|---|---|
| 01 The impossible question | 0.00 – 7.20 | L01 owner 0.39–2.54 "What if Google Maps could actually talk?" · L02 assistant 3.87–6.47 "Oh, finally. We need to talk." | The shot opens close on the owner, who holds his phone showing a maps screen, with a slow push-in. He looks up dreamily on "actually talk?". The phone buzzes twice (2.60, 3.00) with a teal glow. At 3.09 the Maps Assistant pops up out of the screen, which makes him recoil: a lean back, shoulders up, phone pulled in. The camera pulls back to the two-shot as the assistant hops onto its unfolding map tile (lands 4.0). On "finally" the assistant rolls its eyes. | **WE NEED TO TALK.** (5.74) |
| 02 Business hours | 7.20 – 18.96 | L03 owner 7.21–9.26 · L04 assistant 9.94–12.44 · L05 owner 13.22–15.09 · L06 assistant 15.55–17.89 | The owner spins his phone to show four Sunday missed calls, leaning in, with the elbow kept low. On "profile" (10.32) the Example Roofing Co. hours card rises while he slips the phone into his pocket. On "open" (11.48) the Sunday: OPEN row lights amber. A mini calendar spins in to SUNDAY. On "We stopped working Sundays last year!" he puts a hand to his chest with a small hop. On "historical" the calendar pages flip back through 2025, 2024, 2023 and 2022, while the card and calendar go sepia with flicker. A film reel appears on "documentary", with a projector sound. He then facepalms, hand to forehead, head dropping and shoulders sagging. | **OPEN ON SUNDAYS?** (11.48) · **LAST YEAR!** (14.33) |
| 03 Category roast | 18.96 – 33.77 | L07 owner 18.96–20.85 · L08 assistant 21.48–27.94 · L09 owner 28.12–29.83 · L10 assistant 30.32–32.79 | On "Okay..." his hand slides off his face into a nervous clasp, with fidgeting fingers and darting eyes. The camera moves to the assistant, and the category card shows **General Contractor**. Three illustrative roof jobs pop in on "repair roofs". On "Is that really" the category gets a dashed amber outline and a "?". On "best description?" a **Roofing contractor?** suggestion appears, and the assistant looks at the owner. On "I thought you'd figure it out!" the owner does a two-palm defensive shrug with elbows at his sides and a small lean in. The card floats aside. "Unpaid office manager": a Profile updates paper stack appears, and the assistant leans into it, sliding it across to the owner's feet (paper SFX). He looks down at it, embarrassed. | **UNPAID OFFICE MANAGER.** (31.65) |
| 04 The lesson | 33.77 – 48.20 | L11 33.77–38.15 · L12 38.69–42.33 · L13 42.87–47.97 (narrator) | The camera pushes into the floating card. A large profile panel highlights **What you do → Roofing contractor** (36.19) and **When you're available → Mon–Fri · Sun closed** (37.33). Four 3D cards then deal out of it on their words: **Business Category** (39.05), **Opening Hours** (39.66), **Services** (40.54) and **Contact Details** (41.55), with a slow camera orbit. On "Accurate" each card is ticked. The cards clear for a customer's view: Closed · Opens Mon 7 AM, then "The customer knows when to call" on "decisions". On "doesn't" the line "Automatic top rankings" is struck through, with "Not guaranteed" on "guarantee". | **ACCURATE INFORMATION MATTERS.** (42.87) |
| 05 Punchline | 48.20 – 54.60 | L14 owner 48.79–51.06 · L15 assistant 51.61–53.85 | The scene cuts back to the set; the paperwork is still at his feet. "So... you weren't ignoring me?" uses a one-palm question: elbow by the torso, forearm rotating out, hand opening a beat later, peak on "me?" (50.80) with a head tilt and raised brows, then a smooth return. On "No." the assistant gives a small head-shake. On "profile" it turns away (53.66) with a comedic boop. The owner freezes, embarrassed, completely still, as the music cuts. | **YOU WERE IGNORING YOUR PROFILE.** (52.83) |
| 06 Outro | 54.60 – 60.53 | L16 narrator 55.13–57.98 "GrowwithMH. Get found. Stay accurate." | This follows the Episode 01 end-card system. A teal check flies in and becomes the wordmark's orange dot. The **supplied GrowwithMH logo** turns in as a 3D tile, and the wordmark reveals. Then "Get Found." (56.37) and "Stay *Accurate.*" (57.31). It holds to 60.53 with a soft sonic logo. | |

## Character animation rules applied
- Every gesture is tied to a word and has a purpose:
  - Curiosity: looking up on "actually talk?".
  - Recoil: the emergence.
  - Frustration: leaning in while showing the phone.
  - Surprise: hand to chest.
  - Embarrassment: facepalm, then head down at the paperwork.
  - Nerves: hand clasp with fidgeting.
  - Defensiveness: the two-palm shrug.
  - Confusion: the one-palm question.
  - Sarcasm: the assistant moves only its eyes, brow and tilt.
- No gesture repeats across dialogue scenes. The two-palm shrug (L09) and the one-palm question (L14) are deliberately different gestures.
- Hand placements are solved with two-bone IK (`src/chars/rig.ts`), which keeps the elbow on the low, outer side, under the hand and never lifted on its own. The phone follows the hand through forward kinematics, so it can't drift off the hand.
- The questioning gesture in scene 05 uses the keyframes approved in the Episode 01 correction: shoulder 15–18°, forearm out to −82°, wrist 12°, open palm.
- The owner breathes and blinks while alive. Both stop completely for the comedic freeze.

## SEO accuracy check (on-screen claims)
- The profile should accurately describe what you do and when you're available. This matches the VO and is general guidance.
- Review the category, hours, services and contact details. These are standard Business Profile fields.
- Accurate information helps customers decide. Shown as an illustrative customer view, with no metrics.
- "Automatic top rankings: Not guaranteed." Matches the VO. No claim that hours or complete fields raise rankings.
- "Roofing contractor?" is shown only as a question. Choosing a category that matches your main work is standard guidance, and no ranking outcome is implied.
- "Example Roofing Co." is labelled as an example. Roof jobs are marked "illustrative". There are no ratings, review counts, positions, client names or stats.
- The Maps Assistant is an original character with no Google logo or branding, and it isn't presented as a Google representative.

## Assets
**Supplied by you:**
- The ElevenLabs VO above. Not committed; it lives in `source/` at render time.
- The GrowwithMH logo, a 2867 px JPG. Used unaltered (scaled only) as the face of the end-card tile, in `public/brand/growwithmh-logo.jpg`.

**Reused from Episode 01:** the owner rig, the Maps Assistant, the Card3D system, captions, kickers, studio, wordmark, end-card motion and fonts (Poppins and Inter, OFL).

**New in code for Episode 02:**
- Rig additions: IK and FK, a head nod, and a shoulder shrug.
- The assistant's turn-away and landing squash.
- Phone screens: maps and missed calls.
- Props: the hours card, the year calendar with backward page flips, the film reel, the category card with roof-job illustrations, the paperwork stack, the four lesson cards, the customer view, the ranking note, and the logo tile.
- An original synthesized music bed: soft chords and a muted pulse at 96 BPM.
- All SFX are synthesized: phone vibration, notification, page flips, projector, paper slide, interface clicks, boop, and sonic logo.

## Rebuild
```
npm ci
# put the VO at source/vo-upload.mp3
npm run render -- --browser-executable=/path/to/chrome-headless-shell   # writes out/growwithmh-ep02.mp4
npm run studio                                                          # live preview with audio
```

## QA summary (final MP4: out/growwithmh-ep02.mp4)
| Check | Result |
|---|---|
| File | H.264 High, yuv420p, 1080x1920, 30 fps, 1816 frames; AAC 48 kHz. Video 60.533 s, audio 60.533 s. A full decode reports 0 errors. |
| Loudness | -14.1 LUFS integrated, LRA 3.5 LU, true peak -1.9 dBTP. |
| Dialogue vs music | During speech the ducked music is 17–18 LU under the VO (-21.9 / -21.0 LUFS VO against -39.1 / -39.2 LUFS music). |
| Black frames > 0.2 s | None. |
| Frozen video > 2 s | None. |
| Silence > 0.5 s | 54.23–55.08 s only. This is the intended comedic freeze after "ignoring your profile." The end card is never silent: a soft chord fades out exactly on the last frame. |
| First frame | Opens on the owner in close-up with the phone. No logo intro. |
| Representative frames | A contact sheet every 1.5 s plus 38 review stills cover all six scenes. Fixed during review: the phone covering his mouth in the close-up, the off-frame emergence, kicker width beyond the safe margins, the hours card being too small, and the owner being cropped during the category shot. |
| Gestures at half speed | Strips at 10 fps covered the full rest → peak → rest cycle of the phone-show, hand-to-chest, facepalm, nervous clasp, two-palm shrug and one-palm question. There are no snaps between poses. Elbows stay low under the hands, and no hand passes through the body. The scene 05 question uses the same keyframes as the approved Episode 01 correction. A half-speed review clip is included. |
| Faces vs dialogue | The pupils, brows, blush, sweat and nod were checked against each line. The assistant only moves its eyes and brow, tilts, and turns away. |
| Subtitles | Words come from the transcript and are mapped to the approved script spelling. They highlight on their spoken onset, at most 4 words per caption, with speaker tags. They sit inside y 1404–1560 and are hidden on the end card. Kickers stay within x 90–990. |
| Consistency with Episode 01 | Same character models, Card3D system, studio, palette (#FBFAF6, teal, charcoal, amber), caption style and end-card motion. |
| Logo | The supplied file is used unaltered on the end-card tile. |
| SEO claims | See "SEO accuracy check" above. Nothing on screen promises rankings or invents statistics. |

Limits of this QA: I can't watch or listen in real time. Motion was checked through dense frame strips, and audio through loudness, silence, cue timing and stem-level measurements. Give it one playback on a phone before posting.

## Revision 1 · opening animation (0.0–4.0 s, plus the phone hold until 7.5 s)
- **Phone grip in the rig:** the phone is now drawn inside the owner's right hand, so it moves with the forearm and wrist and cannot drift.
  - It is held at waist to lower-chest height, with the screen toward his face, so the camera sees its back.
  - The fingers wrap the inner edge, the thumb runs along the outer edge, and the heel of the palm cradles the bottom.
  - The wrist stays aligned with the forearm.
- **New rig controls:**
  - Forearm foreshortening (`fL` / `fR`), so a forearm can come toward camera while the elbow stays at the side. A thin sleeve edge and contact shadow keep the arm readable against the jacket.
  - Held-phone parameters: `phoneR`, `phoneGlow`, `phoneTurn` and `phoneBuzz`.
  - All of these default to the previous look, so other scenes are unchanged.
- **Acting on "What if Google Maps could actually talk?":**
  - 0.0–0.86: he reads the phone.
  - 0.86–1.31: his gaze lifts to the audience, with brows up and a head tilt.
  - 1.0–2.5: a small palm-up with the free hand, elbow by the torso, forearm forward, peaking on "talk?" (2.02–2.36).
  - 2.56–3.0: the hand returns to rest.
  - 2.60: the buzz brings his eyes back down to the screen.
- **When the assistant appears (3.13):** his eyes follow it up and then across. A small startled reaction: lean back 3°, shoulders up a touch, brows up, eyes wide, a small "o" mouth. The phone stays in his hand with no snap or spin. He settles at 3.69.
- **Transition (minimal):** the same natural hold continues to 7.3 s. When he shows the missed calls, the phone turns edge-on in his grip and the 3D prop takes over at that instant, growing to its approved size as the turn completes (7.66). From 7.63 s every frame matches the approved render.
- **Unchanged:** the VO, script, subtitles, music, SFX, mix (byte-identical md5), duration (60.533 s), camera moves, and the character and assistant designs.
- **QA:**
  - Strips at 10 and 30 fps through 0–4.3 s and the 7.1–7.8 s handoff show no pops, no floating phone, and no rotation of the phone inside the grip.
  - Loudness is -14.1 LUFS with a true peak of -1.9 dBTP. There are no black frames or freezes, and a full decode reports 0 errors.

## Revision 2 · grip perspective (0.0–7.3 s)
- The phone is held toward his face, so the audience sees its back. The hand now supports it from behind:
  - The stacked fingers and the thumb on the audience-facing back were removed.
  - Only the heel of the palm shows under the lower edge, with a slim, flat sliver of fingertips past the inner edge, drawn behind the phone.
- **Unchanged:** the phone position, angle and hand side, the arm pose, the character, the expressions, the camera, the subtitles and the audio (byte-identical md5).
- Only the 221 frames showing the hand-held phone (0–7.33 s) differ from Revision 1. Duration is still 60.533 s, loudness -14.1 LUFS and true peak -1.9 dBTP. A full decode reports 0 errors.

## Revision 3 · smartphone grip mechanics (0.0–7.3 s)
- **Grip mechanics follow the two supplied reference images; their characters and styles were not copied.**
  - The phone is in his anatomical left hand with the screen toward him.
  - The back of his hand comes out of the sleeve at the phone's outer edge.
  - Three simplified fingers lie across the lower back of the phone (about 40% of it) and curl around the inner edge.
  - The thumb stays on the screen side, with only its tip showing past the outer edge.
  - The rounded palm and cuff that sat under the phone are no longer drawn while the phone is held, so the phone no longer looks balanced on a palm.
- The hand geometry lives in the phone's own frame, so the fingers follow the phone's perspective and stay attached through the buzz, the recoil and the turn.
- **Unchanged:** the phone position, angle and size, the arm pose, the other hand, the character, the expressions, the camera, the subtitles, the timing and the audio (byte-identical md5).
- Only the 221 hand-held-phone frames (0–7.33 s) changed. Duration is still 60.533 s, loudness -14.1 LUFS and true peak -1.9 dBTP. A full decode reports 0 errors.
