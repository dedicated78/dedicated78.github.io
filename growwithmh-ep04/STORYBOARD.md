# GrowwithMH: What If? SEO Edition · Episode 04
**"My Cousin Gave Me 50 Five-Star Reviews!"**
1080x1920 · 30 fps · 63.267 s (1898 frames) · H.264 High yuv420p + AAC 48 kHz

All timing comes from the supplied ElevenLabs VO. Word onsets come from local Whisper (small, int8) and are mapped onto the script words. Every word is clamped inside its own clip and onsets are re-detected from the waveform (`src/cues.json`).

## Voiceover handling
- **Source:** `ElevenLabs_2026-11-13T10_20_22_Mark_-_Casual_Relaxed_and_Light_pvc_s50_sim75_v4.mp3`, 63.40 s, mono 44.1 kHz.
- **How the file is ordered:** grouped by speaker:
  - Owner: 0.0–23.6 s.
  - Review Bot: 24.0–27.6 s.
  - Maps Assistant: 27.9–52.1 s.
  - Narrator: 52.3–63.3 s.
- **How lines are addressed:** several lines share a Whisper segment, so each line names its exact word span (`src/script.json`).
- **How the edit was made:**
  - Each line is cut at the centre of the real silence around it. Every cut edge measures between -51 and -89 dB (speech is about -20 dB).
  - The lines are placed in the brief's 15-step order. No word was edited, re-timed inside a line, sped up or synthesized.
- **Line left out (needs your decision):** the recording contains an extra narrator line that is not in the brief's dialogue order: *"Fake and incentivized Google reviews violate Google's policies. They may be removed, and business profiles can face restrictions."* (source 51.7–59.6 s). The brief says "Do not introduce additional dialogue", so it is omitted. It can be dropped in before the outro (about +5 s, which would make the runtime about 68.5 s).
- **Voices:**
  - The filename names one ElevenLabs voice, "Mark – Casual, Relaxed and Light". Episodes 02–03 used "Jack John".
  - The four roles sound distinct by measurement. Median pitch: owner about 258 Hz, Maps Assistant about 235 Hz, Review Bot about 184 Hz (flatter), narrator about 158 Hz.
  - Please confirm the voice change is intended for the series.

## MANDATORY SILENCE (verified)
- **Window:** 16.213–17.513 s, exactly **1.30 s**. It starts right after "...Zero?! What?!" ends.
- **Audio:** the VO, music and SFX stems are all digital zero across the window (peak 0.0 in each stem).
- **Music:** it loses energy from 8.1 s as the reviews start vanishing, and hard-cuts at 16.21 s.
- **Picture:** the owner holds a frozen, shocked pose with no breathing and no blinks from 14.68 s until the bot settles. The empty "0 REVIEWS" panel stays in frame.
- **Camera:** all animation and the camera sample the window's first frame, so nothing moves.
- **Order:** the Review Bot enters only at 17.513 s, with a soft servo whirr.

## Final timing breakdown

| # | Film time | Line (speaker) | Picture |
|---|---|---|---|
| 01 Celebration | 0.00 – 8.10 | L01 owner 0.34–4.21 "Fifty five-star reviews overnight! My cousin deserves a medal!" · L02 owner 4.81–7.84 "He made 50 accounts! Look at that perfect rating!" | Opens close on the review panel (Example Roofing Co., tagged DRAMATIZATION). The counter rolls 5 → 15 → 30 → 50 and ten review cards from obviously fake accounts ("Totally Real Bob", "Real Customer #12", "Not His Cousin"…) pop in around it. The stars light on "overnight". The camera moves to the owner: small double fist pumps with elbows at his sides, chin up, and a brief crown on "medal". "Look at that perfect rating!": an open palm presents the panel, peaking on "rating". |
| 02 Something is wrong | 8.10 – 12.38 | L03 owner 9.68–11.57 "Wait... why are my reviews decreasing?!" | While he's still smiling, the counter slips 50 → 48 → 42 → 35 and a review card vanishes with each drop. His smile fades, his arm comes home, his shoulders tighten, and his brows rise. The camera starts a slow push toward him, and the music begins to sag. "Wait…": a head tilt and one palm-up question, peaking on "decreasing". |
| 03 Panic | 12.38 – 16.21 | L04 owner 12.38–16.21 "50... 30... 10?! Zero?! What?!" | A small step back, hands up open at chest height, and his eyes dart between the panel and the audience. The counter follows his words: **30** on "30" (13.07), **20** between, **10** on "10" (14.04), **0** on "Zero" (14.48). The last card vanishes, the stars go out and the panel shows "No reviews yet". "What?!": a small backward recoil. |
| **SILENCE** | **16.21 – 17.51** | — | Complete silence. He stares, frozen, at the empty panel. Nothing moves. |
| 07 Review Bot | 17.51 – 21.96 | L05 bot 18.49–21.75 "Review check complete. Those reviews were fake." | The Review Bot rolls in casually from the right and settles beside the panel. On "Review check complete" its eyes become a scan bar and a soft scan beam sweeps the empty panel. On "Those reviews were fake" it turns its flat gaze to the owner, with minimal movement. The owner's eyes follow it in. |
| 08 Maps Assistant | 21.96 – 36.8 | L06 owner 23.03–24.09 · L07 assistant 24.95–27.49 · L08 assistant 28.25–31.48 · L09 assistant 32.41–36.43 | The Maps Assistant rises on its map tile (the Episode 01 entrance). "But they're all five stars!": disbelief, with two open palms and a small lean, elbows by his sides. On "customer feedback" one review ("Totally Real Bob · Best roofer ever!!! Never been there but WOW!!!") pops up and flips into **Cousin's Fan Club** on "fan club". The policy explanation brings up two minimal cards: **FAKE REVIEWS MAY BE REMOVED** on "remove", and **POLICY VIOLATIONS CAN LEAD TO RESTRICTIONS** on "restrictions". |
| 09 Real reviews | 36.8 – 48.8 | L10 owner 37.40–39.72 · L11 assistant 40.31–48.40 | "So... how am I supposed to get reviews now?": a worried, fidgeting hand clasp. The camera pushes into the empty panel, which opens onto an illustrative request screen: (1) a real job, finished; (2) a neutral request for honest feedback, with no stars pre-filled and no reward; (3) a genuine **4-star** review, deliberately not a guaranteed five. Chips land on their words: **No rewards**, **No pressure**, **Ask every customer**. |
| 10 Punchline | 48.8 – 57.19 | L12 owner 49.47–52.66 · L13 assistant 53.37–56.34 | Back on the set: embarrassed, head lowered slightly, a blush, looking to the assistant. "Apparently, customers are involved in customer reviews.": the assistant stays calm and unimpressed. The bot gives one small approving nod (56.6), followed by a short beat. |
| Outro | 57.19 – 63.27 | L14 narrator 57.83–60.70 "GrowwithMH. Real reviews. Real trust." | The established end card with the supplied logo (the clean app-icon version you attached): the check becomes the wordmark dot, then **Real Reviews.** and **Real *Trust.*** The sonic logo plays and a soft chord fades out on the last frame. |

## Review Bot (new character)
- **Design:** an original, fictional, unbranded "review-integrity inspector", built in the Maps Assistant's visual language: glossy deep-teal body, cream face plate, dark screen with flat mint eyes, small capsule arms, amber indicator lights and a soft hover glow.
- **Movement:** it rolls in, scans with a beam (no hand interaction), looks, and nods. Its "mouth" is a thin readout line.
- **Labels:** captions tag it **REVIEW BOT**. No Google mark or name appears on the character, so it is not presented as an official Google mascot or a depiction of Google's moderation.

## Character animation (Episodes 01–03 lessons applied)
- **No phones or handheld props:** every interface floats.
- **IK-placed hands:** hands that go to a target (fists, chest, clasp) are placed by two-bone IK, so elbows hang under the hands.
- **Palm gestures:** the question and the "five stars!" plea reuse the approved palm-up keyframes (elbow by the torso, forearm rotating out, hand opening a beat later).
- **Owner's arc:** excitement → confusion → panic → frozen shock → desperate disbelief → worry → embarrassment, all synced to words.
- **Bot and assistant:** they stay restrained, using only eyes, brow, scan and nod.

## Fact-check (Google help pages, read 2026-11-13)
- **Maps user-generated content policy** (support.google.com/contributionpolicy/answer/7400114):
  - "Fake engagement is not allowed and will be removed."
  - Conflict of interest includes "familial relationships". The cousin joke is literally on policy.
  - Incentives such as "payment, discounts, free goods and/or services" are prohibited.
  - Don't "selectively solicit positive reviews", and don't "require or pressure users".
- **Business Profile restrictions for policy violations** (support.google.com/business/answer/14114287): "we might place restrictions on their Business Profile (in addition to removing the violative reviews)".
- **Tips to get more reviews** (support.google.com/business/answer/3474122): "Reviews … must reflect a genuine experience. Offering incentives … is strictly prohibited."
- **What the episode avoids saying:**
  - That every fake review is caught, that removal is immediate, or that every violation means suspension. It uses "may be removed" and "can lead to restrictions".
  - That the bot is Google's real system.
  - That genuine reviews guarantee rankings.
- **Framing:** the 50 → 0 drop is tagged DRAMATIZATION, and every business, reviewer and review is fictional.
