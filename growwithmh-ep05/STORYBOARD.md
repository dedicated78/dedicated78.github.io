# GrowwithMH: What If? SEO Edition · Episode 05
**"What If Google Rankings Were an Auction?"**
1080x1920 · 30 fps · 63.067 s (1892 frames) · H.264 High yuv420p + AAC 48 kHz

## How timing was built
- **Source of all timing:** the supplied ElevenLabs VO.
- **Word onsets:**
  - From local Whisper (small, int8), mapped onto the script words.
  - Clamped inside their own clip and re-detected from the waveform (`src/cues.json`).
- **Line order:** see `VO-SCRIPT.md`. Every line is used as recorded, in the brief's order, and nothing is sped up.

## Final timing breakdown

| # | Film time | Line (speaker) | Picture |
|---|---|---|---|
| 01 Fictional auction | 0.00 – 4.1 | L01 auctioneer 0.55–3.44 "Welcome to the number one Google Maps auction!" | **Set:** a cream studio with the Auctioneer at a teal podium labelled **FICTIONAL AUCTION**, and a soft room murmur.<br>**Title:** "#1 GOOGLE MAPS RANKING?" with a **FICTIONAL AUCTION** pill.<br>**Action:** the Auctioneer welcomes the room with a theatrical open-palm "present" and raised eyebrows. |
| 02 Bidding | 4.1 – 11.2 | L02 auctioneer 4.21–5.86 "Opening bid! $100!"<br>L03 owner 7.12–10.65 "$500! Make my roofing company number one!" | **Board:** the bid board turns in (CURRENT BID · FICTIONAL · $100).<br>**Auctioneer:** leans in toward the room.<br>**Owner's bid:** on "$500!" he throws his hand up and out (an auction hand-raise, elbow under the hand). The board races $100 → $500 and the "Example Roofing Co." bidder chip lands.<br>**Kicker:** **FIVE HUNDRED DOLLARS!**<br>**Number one:** on "number one!" his hand closes to one raised finger. |
| 03 SOLD | 11.2 – 15.4 | L04 auctioneer 11.26–14.40 "$500! Going once, going twice, SOLD!" | **Count:** the Auctioneer points at the bidder. The owner clasps his hands eagerly, bouncing on "once" and "twice".<br>**Gavel:** on "SOLD!" (13.68) the **automated podium gavel** swings down onto the sound block. No hand holds it.<br>**Payoff:** the board flashes amber and **SOLD!** lands, followed by **AUCTION WON!** (14.5). |
| 04 Celebration | 15.4 – 18.9 | L05 owner 15.45–18.71 "Yes! Finally! Google Maps domination!" | **Exit:** the stage slides away.<br>**Owner:** double fist pumps with elbows at his sides, under a golden spotlight.<br>**Listing:** the board turns edge-on into an illustrative listing card (tagged ILLUSTRATIVE). His listing rises to the top on "Finally!".<br>**Prizes:** a crown and a small **#1 trophy (IMAGINARY)** pop in on "domination". |
| **PAUSE** | **18.9 – 20.0** | — | **Music:** hard-cuts with a record scratch (18.91).<br>**Camera:** pushes in on the listing while his deadpan face stays in frame.<br>**Reveal:** the amber-outlined **Sponsored** label pops at 19.26 and hangs for **0.75 s** with no voice and no music, only a soft tick. His smile drains and the crown falls away. |
| 05 Sponsored? | 20.0 – 23.7 | L06 owner 20.02–22.41 "Wait, why does my listing say Sponsored?" | **Gesture:** a head tilt and the approved palm-up question, peaking on "Sponsored".<br>**Kicker:** **SPONSORED?**<br>**Entrance:** the Maps Assistant rises on its map tile (the Episode 01 entrance). |
| 06 Maps Assistant | 23.7 – 35.3 | L07 assistant 23.71–27.06 "Because you bought advertising, not an organic ranking."<br>L08 owner 27.75–30.51 "So... I didn't buy the number-one organic spot?"<br>L09 assistant 31.06–34.38 "Sir, there's no checkout button for number one on Google Maps." | **Shock:** on "not an organic ranking" the owner's brows go up and he is visibly shocked. Kicker **NOT AN ORGANIC RANKING**.<br>**L08:** a hand to his chest, slowly realising.<br>**Checkout gag:** the listing turns into a fictional **Checkout** card for **ORGANIC #1 RANKING**. On "number one" the Buy button fades and a **NOT FOR SALE** stamp slams on. The owner blushes.<br>**Transition:** the camera pushes through the card on a white flash. |
| 07 Paid vs organic | 35.3 – 47.8 | L10 narrator 35.36–38.03 "Google Maps can display paid ads marked Sponsored,"<br>L11 narrator 38.53–41.77 "but advertising doesn't buy you a higher organic local ranking."<br>L12 narrator 42.35–47.01 "Organic local visibility mainly depends on relevance, distance, and prominence." | **PAID ADS panel:** Sponsored placement / Advertising campaign / Paid visibility opportunity.<br>**ORGANIC LOCAL RANKINGS panel:**<br>- "Not purchasable as a ranking position" lands on "higher".<br>- An illustrative local map (nearby vs far-away searcher) replaces the paid panel.<br>- **Relevance**, **Distance** and **Prominence** land on their words. |
| 08 Trophy punchline | 47.8 – 56.2 | L13 owner 47.76–52.01 "Great. I bought an ad... and a tiny imaginary trophy."<br>L14 assistant 52.62–55.44 "Congratulations. Your trophy is non-refundable." | **Owner:** back on the set, with an embarrassed hand clasp and a glance at the imaginary trophy.<br>**Assistant:** delivers the line flatly. Kicker **YOUR TROPHY IS NON-REFUNDABLE.**<br>**Payoff:** the trophy shrinks to a speck (55.64) and the owner sags into disappointment. |
| Outro | 56.2 – 63.07 | L15 narrator 57.70–60.43 "GrowwithMH. Get found. Grow smarter." | **Statement:** **ORGANIC RANKINGS AREN'T FOR SALE.** lands on its own (56.3–57.5).<br>**Lockup:** it lifts away for the established end card: the logo tile, then the check flies in to become the wordmark dot, then **Get Found.** / **Grow *Smarter.*** The sonic logo plays and the end chord fades to the last frame. |

## The Auctioneer (one-off character)
- **Design:** original. Navy suit, teal bow tie and pocket square, silver slicked hair with a side part, grey mustache, and oversized theatrical eyebrows.
- **Likeness and branding:** he is not modelled on any real person and carries no Google name, logo or colours.
- **Staging:** he stays behind a podium labelled **FICTIONAL AUCTION**.
- **Gestures:** a presenting palm and a point toward the bidder.
- **Gavel:** an automated arm mounted on the podium. There are no handheld gavels, phones or paddles anywhere in the episode.
- **Captions:** tagged **AUCTIONEER** (rust dot).

## Framing and claims guardrails
- **The auction is never real:**
  - The podium, board and title pill say **FICTIONAL**. The listing and map are tagged **ILLUSTRATIVE**, and the checkout is tagged **FICTIONAL**.
  - Prices are parody.
  - No screen imitates a real Google product UI.
- **Ads vs organic:**
  - Nothing says ads improve organic ranking. The script says the opposite: "advertising doesn't buy you a higher organic local ranking".
  - Buying an ad is never shown to guarantee the top sponsored spot. The listing shows *a* Sponsored placement and no ad position is promised.
- **Ranking factors:** organic ranking is "mainly" relevance, distance and prominence, not exclusively.

## Fact-check (Google help pages, read 2026-11-14)
- **How Google determines local ranking** (support.google.com/business/answer/7091):
  - "There's no way to request or pay for a better local ranking on Google."
  - "Local results are mainly based on relevance, distance, and prominence" (section headings Relevance / Distance / Prominence).
  - "Distance refers to how far each business is from the customer who's searching."
- **About local search ads** (support.google.com/google-ads/answer/7040605):
  - "Local search ads are different from how your business's organic listing (not an ad) appears on Google Maps."
  - Maps ad formats: promoted pins, map search ads, map suggest ads.
- **Map search ads** (support.google.com/google-ads/answer/16388390): they "show at the top of the map search results list". Their position depends on Ad Rank (support.google.com/google-ads/answer/1722122), so no top position is guaranteed.
- **Not confirmed by those pages:** they don't use the literal word "Sponsored" for the Maps ad label. The episode's "marked Sponsored" line comes from the supplied script, and the cited pages don't state that label word for word. See Limitations.

## QA summary (final MP4)
QA_TABLE

Limits of this QA: I can't watch or listen in real time. Motion was checked through 10 fps frame strips and a contact sheet, and audio through loudness, silence, cut-edge and level measurements. Give it one full playback with sound, especially the Sponsored pause and the outro hold.
