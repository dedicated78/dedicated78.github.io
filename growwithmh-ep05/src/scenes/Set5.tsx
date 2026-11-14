import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, keyed, lerp, pr, speakerAt, voice} from '../timing';
import {OWNER_REST, OwnerPose} from '../chars/Owner';
import {Pin, PIN_REST, PinPose} from '../chars/Pin';
import {Auctioneer, AUCTIONEER_REST, AuctioneerPose} from '../chars/Auctioneer';
import {armTo, headPoint, toWorld} from '../chars/rig';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Hl, Kicker} from '../components/Text';
import {Neighborhood} from '../props/Props';
import {Txt} from '../props/Props';
import {Crown, Spotlight} from '../props/Ep03Props';
import {BidBoard, BOARD, CHECKOUT, CheckoutCard, LISTING, ListingCard, Trophy} from '../props/Ep05Props';
import {Cam, OwnerAt, Studio, World} from './common';

// Fictional auction → bid → SOLD → celebration → "Sponsored" → Maps Assistant → checkout gag →
// (lesson) → trophy punchline. One set; every beat is keyed to the voiceover's word timings.

const OWN = {x: 300, y: 1380, w: 380};
const STAGE = {x: 790, y: 1394, w: 360};
const PIN = {x: 800, y: 1335, w: 220};
const TILE = {x: 800, y: 1352, size: 300};
const CARD = {x: 640, y: 600, s: 0.8}; // board → listing → checkout share this spot
const TROPHY = {x: 505, y: 1000, w: 110};

const bump = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
const blink = (t: number, period: number, phase: number) => {
  const u = (t + phase) % period;
  return u < 0.13 ? 0.12 + 0.88 * Math.abs(u / 0.065 - 1) : 1;
};
const talking = (who: 'owner' | 'assistant' | 'auctioneer', t: number, k = 1.6) => (speakerAt(t) === who ? Math.min(1, voice(t) * k) : 0);

// ---------------------------------------------------------------- owner performance
const ownerPose = (t: number): OwnerPose => {
  const base: OwnerPose = {...OWNER_REST, smile: 0.7, brow: 0.6, eyes: 1.15, lookX: 0.8, lookY: -0.2, head: 3};
  const p = keyed(t, base, [
    // 02 · bids: raises his hand (elbow follows the hand), then "number one" with one finger
    {t: Q.L03 - 0.3, d: 0.35, e: EZ.back, ...armTo('R', {x: 372, y: 192}), hR: 0.9, lean: 2, smile: 0.95, brow: 0.9, eyes: 1.25, lookX: 0.7, lookY: -0.3},
    {t: Q.numberOne3 - 0.12, d: 0.3, e: EZ.inOut, hR: 0, pR: 1, ...armTo('R', {x: 366, y: 200})},
    {t: Q.L03e + 0.1, d: 0.5, e: EZ.inOut, aRs: 10, aRe: 14, pR: 0, lean: 0},
    // eager while the auctioneer counts: small lean in, hands together
    {t: Q.L04 + 0.2, d: 0.45, e: EZ.inOut, ...armTo('L', {x: 190, y: 440}), ...armTo('R', {x: 212, y: 440}), lean: 2.5, eyes: 1.3, lookX: 0.85, lookY: -0.15, smile: 0.8},
    {t: Q.once, d: 0.15, e: EZ.out, bob: -5},
    {t: Q.once + 0.18, d: 0.2, e: EZ.inOut, bob: 0},
    {t: Q.twice, d: 0.15, e: EZ.out, bob: -6},
    {t: Q.twice + 0.18, d: 0.2, e: EZ.inOut, bob: 0},
    // SOLD! → 03 · celebration: double fist pumps, chin up
    {t: Q.sold + 0.05, d: 0.2, e: EZ.back, ...armTo('R', {x: 304, y: 298}), ...armTo('L', {x: 96, y: 298}), lean: 0, smile: 1, eyes: 1.2, bob: -10},
    {t: Q.sold + 0.3, d: 0.25, e: EZ.inOut, bob: 0},
    {t: Q.yes - 0.05, d: 0.14, e: EZ.out, bob: -10, ...armTo('R', {x: 306, y: 280}), ...armTo('L', {x: 94, y: 280})},
    {t: Q.yes + 0.18, d: 0.25, e: EZ.inOut, bob: 0, ...armTo('R', {x: 304, y: 298}), ...armTo('L', {x: 96, y: 298})},
    {t: Q.finally - 0.05, d: 0.35, e: EZ.inOut, head: -6, lookX: 0.6, lookY: -0.6, shrug: 0.2},
    {t: Q.domination - 0.05, d: 0.14, e: EZ.out, bob: -9},
    {t: Q.domination + 0.18, d: 0.25, e: EZ.inOut, bob: 0},
    // 04 · the celebration stops: arms come down, the smile fades as "Sponsored" appears
    {t: Q.stop, d: 0.5, e: EZ.inOut, aLs: 9, aLe: 12, aRs: 10, aRe: 14, shrug: 0, head: 3, lookX: 0.7, lookY: -0.6},
    {t: Q.reveal + 0.15, d: 0.6, e: EZ.inOut, smile: -0.1, brow: 0.85, eyes: 1.3, head: 6},
    // "Wait, why does my listing say Sponsored?" — small palm-up toward the listing, elbow by the torso
    {t: Q.sponsored6 - 0.75, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26},
    {t: Q.sponsored6 - 0.45, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -64, wR: 4, head: 6},
    {t: Q.sponsored6 - 0.33, d: 0.42, e: EZ.inOut, hR: 0.85},
    {t: Q.sponsored6 - 0.05, d: 0.34, e: EZ.back, aRs: 18, aRe: -80, wR: 12, hR: 1, head: 9, brow: 1, smile: -0.25},
    {t: Q.L06e + 0.05, d: 0.4, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, head: 4},
    {t: Q.L06e + 0.12, d: 0.4, e: EZ.inOut, hR: 0},
    {t: Q.rise + 0.3, d: 0.4, lookX: 0.9, lookY: 0},
    {t: Q.notAn, d: 0.3, e: EZ.back, eyes: 1.4, brow: 1, smile: -0.35, lean: -2, shrug: 0.3},
    // "So... I didn't buy the number-one organic spot?" — disbelief, hand to chest
    {t: Q.L08 - 0.12, d: 0.35, e: EZ.inOut, ...armTo('R', {x: 224, y: 382}), hR: 0.6, lean: -2.5, brow: 1, eyes: 1.35, lookX: 0.85},
    {t: Q.organicSpot, d: 0.25, e: EZ.back, bob: -5},
    {t: Q.organicSpot + 0.3, d: 0.3, e: EZ.inOut, bob: 0},
    {t: Q.L08e + 0.1, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14, hR: 0, lean: 0, shrug: 0},
    {t: Q.numberOne9 + 0.1, d: 0.4, blush: 0.5, eyes: 1.15, smile: -0.3},
    // 07 · back from the lesson: embarrassed, beside his imaginary trophy
    {t: Q.L13 - 0.6, d: 0.02, blush: 0.6, nod: 0.18, lookX: 0.85, lookY: 0, smile: -0.2, brow: 0.6, eyes: 1.0, shrug: -0.15, head: 3, ...armTo('L', {x: 194, y: 452}), ...armTo('R', {x: 206, y: 452})},
    {t: Q.trophy13 - 0.6, d: 0.45, e: EZ.inOut, lookX: 0.75, lookY: 0.25, head: 6},
    {t: Q.L14, d: 0.4, e: EZ.inOut, lookX: 0.9, lookY: 0, head: 3},
    // the trophy shrinks: disappointment, minimal movement
    {t: Q.shrink, d: 0.6, e: EZ.inOut, smile: -0.45, brow: 0.45, nod: 0.32, shrug: -0.4, lookX: 0.7, lookY: 0.35, eyes: 0.95},
  ]);
  if (t < Q.L14e + 0.4) p.bob += Math.sin(t * 2.1) * 1.6;
  p.mouth = talking('owner', t, 1.7);
  if (p.eyes > 0.5) p.eyes *= blink(t, 3.1, 0.7);
  return p;
};

// ---------------------------------------------------------------- the Auctioneer (theatrical)
const auctioneerPose = (t: number): AuctioneerPose => {
  const p = keyed(t, {...AUCTIONEER_REST, smile: 0.7, brow: 0.5, eyes: 1.1, lookX: -0.2}, [
    {t: Q.welcome + 0.05, d: 0.45, e: EZ.inOut, present: 1, brow: 1, head: -4},
    {t: Q.auction - 0.1, d: 0.3, e: EZ.back, lean: 3, brow: 1},
    {t: Q.L01e + 0.1, d: 0.45, e: EZ.inOut, present: 0, lean: 0, head: 0},
    {t: Q.bid100 - 0.15, d: 0.3, e: EZ.back, lean: 4, brow: 0.9, lookX: -0.4},
    {t: Q.L02e + 0.1, d: 0.35, e: EZ.inOut, lean: 0},
    {t: Q.bid500 + 0.1, d: 0.25, e: EZ.back, brow: 1, eyes: 1.3, lookX: -1, lookY: 0.1},
    {t: Q.sold500 - 0.15, d: 0.35, e: EZ.inOut, point: 1, lookX: -1},
    {t: Q.once, d: 0.15, head: 5},
    {t: Q.once + 0.25, d: 0.15, head: 0},
    {t: Q.twice, d: 0.15, head: 5},
    {t: Q.twice + 0.25, d: 0.15, head: 0, point: 0.6},
    {t: Q.sold - 0.25, d: 0.25, e: EZ.inOut, point: 0, present: 1, brow: 1, eyes: 1.25, lean: 2},
    {t: Q.sold + 0.6, d: 0.4, e: EZ.inOut, present: 0, lean: 0, smile: 0.9},
  ]);
  // automated gavel: snaps down on "SOLD!", lifts back
  p.gavel = pr(t, Q.sold - 0.06, 0.08, EZ.in) * (1 - pr(t, Q.sold + 0.2, 0.35, EZ.inOut));
  p.mouth = talking('auctioneer', t, 1.6);
  if (p.eyes > 0.5) p.eyes *= blink(t, 3.4, 0.2);
  return p;
};

// ---------------------------------------------------------------- Maps Assistant
const pinPose = (t: number): PinPose => {
  const p = keyed(t, {...PIN_REST, eyes: 0.05, lookX: -0.85}, [
    {t: Q.rise + 0.35, d: 0.25, eyes: 0.85, lookX: -0.6, lookY: -0.7},
    {t: Q.L07 - 0.1, d: 0.3, lookX: -0.9, lookY: 0, eyes: 0.75},
    {t: Q.L09, d: 0.3, brow: 0.4, eyes: 0.7},
    {t: Q.L13 - 0.6, d: 0.02, eyes: 0.8, brow: 0.2, lookX: -0.9, lookY: 0},
    {t: Q.trophy13 - 0.4, d: 0.3, lookX: -0.7, lookY: 0.2},
    {t: Q.L14, d: 0.3, lookX: -0.9, lookY: 0, eyes: 0.6, brow: 0.55},
  ]);
  p.talk = talking('assistant', t, 1.6);
  p.tilt = Math.sin(t * 1.3) * 2;
  if (p.eyes > 0.4) p.eyes *= blink(t, 3.7, 1.9);
  return p;
};

// ---------------------------------------------------------------- camera
const camAt = (t: number): Cam => {
  const k = (a: number, d: number, e = EZ.inOut) => pr(t, a, d, e);
  let x = 770;
  let y = 1070;
  let s = lerp(1.5, 1.62, k(0, 3.6, EZ.linear)); // push toward the stage
  const mv = (p: number, nx: number, ny: number, ns: number) => {
    x = lerp(x, nx, p);
    y = lerp(y, ny, p);
    s = lerp(s, ns, p);
  };
  mv(k(Q.L02 - 0.25, 0.9), 610, 930, 1.04); // board + stage + the bidder
  mv(k(Q.L03 - 0.2, 0.6), 560, 930, 1.06);
  mv(k(Q.sold + 0.45, 0.6), 540, 900, 1.06);
  mv(k(Q.stop + 0.05, 0.6), CARD.x, CARD.y + 40, 1.45); // push in: the listing
  mv(k(Q.L06 - 0.1, 0.7), 540, 820, 1.12); // back out enough to see his face
  mv(k(Q.rise - 0.1, 0.8), 580, 920, 1.02);
  mv(k(Q.L08 - 0.2, 0.6), 520, 940, 1.1);
  mv(k(Q.L09 - 0.2, 0.6), 590, 900, 1.04);
  mv(k(Q.L09e + 0.05, 0.55, EZ.in), CARD.x, CARD.y, 2.7); // push into the card → lesson
  if (t > Q.L13 - 1) {
    x = 560;
    y = 940;
    s = lerp(1.2, 1.06, k(Q.L13 - 0.7, 0.9, EZ.out));
    mv(k(Q.trophy13 - 0.7, 0.6), 470, 960, 1.28); // highlight the ridiculous trophy
    mv(k(Q.L14 - 0.1, 0.7), 570, 940, 1.08);
  }
  return {x, y, s};
};

export const Set5: React.FC<{t: number; fade?: number}> = ({t, fade = 1}) => {
  const o = ownerPose(t);
  const ap = auctioneerPose(t);
  const pp = pinPose(t);
  const cam = camAt(t);
  const late = t > Q.L13 - 1;

  // stage leaves once the auction is over
  const stageOut = pr(t, Q.L05 + 0.1, 0.9, EZ.in);
  // board → listing → checkout (one spot; each turns edge-on as the next turns in)
  const boardIn = pr(t, Q.bid100 - 0.25, 0.45, EZ.back);
  const amountSteps = [100, 200, 300, 400, 500];
  const amount = t < Q.bid500 + 0.15 ? 100 : amountSteps[Math.max(0, Math.min(4, Math.floor((t - (Q.bid500 + 0.15)) / 0.06)))];
  const bidder = pr(t, Q.bid500 + 0.45, 0.3);
  const flash = bump(t, Q.sold, 0.6);
  const toList = pr(t, Q.L05 - 0.15, 0.6, EZ.inOut);
  const rise = pr(t, Q.finally - 0.1, 0.9, EZ.inOut);
  const sponsored = pr(t, Q.reveal, 0.35, EZ.back);
  const toCheckout = pr(t, Q.checkout - 0.35, 0.55, EZ.inOut);
  const gone = pr(t, Q.numberOne9 - 0.05, 0.3, EZ.in);
  const stamp = pr(t, Q.numberOne9 + 0.05, 0.3, EZ.back);
  const cardOut = late ? 1 : 0;
  const turnBoard = -Math.min(1, toList * 2) * 90;
  const turnList = toCheckout > 0 ? -Math.min(1, toCheckout * 2) * 90 : (1 - Math.max(0, (toList - 0.5) * 2)) * 90;
  const turnCheckout = (1 - Math.max(0, (toCheckout - 0.5) * 2)) * 90;

  // celebration props
  const head = toWorld(headPoint(o, {x: 200, y: 84}), OWN.x, OWN.y, OWN.w);
  const crown = pr(t, Q.domination - 0.15, 0.35, EZ.back) * (1 - pr(t, Q.reveal + 0.2, 0.25, EZ.in));
  const spot = pr(t, Q.yes - 0.1, 0.25) * (1 - pr(t, Q.stop, 0.15));
  const trophyIn = pr(t, Q.domination - 0.05, 0.45, EZ.back);
  const trophyS = lerp(1, 0.18, pr(t, Q.shrink, 0.55, EZ.inOut));
  const trophyBob = Math.sin(t * 1.8) * 8 * (t < Q.shrink ? 1 : 0.3);

  // Maps Assistant (Episode 01 entrance, only after his question)
  const tileIn = pr(t, Q.rise - 0.2, 0.45, EZ.out);
  const riseP = pr(t, Q.rise, 0.55, EZ.back);
  const hover = Math.sin(t * 2.2) * 6 * riseP;

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Studio haloX={700} haloY={800} floorY={1300} />
      <World cam={cam}>
        {/* golden spotlight (celebration) */}
        {spot > 0 && (
          <div style={{position: 'absolute', left: OWN.x - 280, top: -200}}>
            <Spotlight w={560} h={1620} o={spot * 0.85} />
          </div>
        )}

        {/* auction stage: low platform + the Auctioneer behind his podium */}
        {stageOut < 1 && (
          <div style={{position: 'absolute', left: STAGE.x - STAGE.w / 2 + stageOut * 520, top: STAGE.y - STAGE.w * (556 / 400), opacity: 1 - stageOut}}>
            <div style={{position: 'absolute', left: -40, top: STAGE.w * (556 / 400) - 24, width: STAGE.w + 80, height: 40, borderRadius: 20, background: 'linear-gradient(180deg, #2A4A46, #183330)', boxShadow: '0 18px 30px -16px rgba(25,43,42,0.6)'}} />
            <Auctioneer pose={ap} width={STAGE.w} t={t} />
          </div>
        )}

        {/* Maps Assistant tile + light column */}
        {tileIn > 0 && (
          <Obj cx={TILE.x} cy={TILE.y} w={TILE.size} h={TILE.size} pose={{rx: lerp(90, 66, tileIn), s: lerp(0.4, 1, tileIn)}}>
            <Card3D w={TILE.size} h={TILE.size} depth={20} step={4} radius={38} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={30} shadow={0.6} glow={`0 0 ${50 + 30 * riseP}px rgba(183,216,197,${0.3 * riseP})`}>
              <Neighborhood w={TILE.size} h={TILE.size} pins={0.4} ownPin={0} />
            </Card3D>
          </Obj>
        )}
        {riseP > 0 && riseP < 1 && <div style={{position: 'absolute', left: PIN.x - 110, top: PIN.y - 400, width: 220, height: 400, background: 'linear-gradient(0deg, rgba(183,216,197,0.55), rgba(183,216,197,0))', opacity: 1 - riseP, filter: 'blur(8px)'}} />}

        <OwnerAt x={OWN.x} y={OWN.y} w={OWN.w} pose={o} />

        {crown > 0.01 && (
          <div style={{position: 'absolute', left: head.x - 52, top: head.y - 4 - 75 - (1 - crown) * 60, transform: `scale(${crown}) rotate(${o.head * 0.8}deg)`, transformOrigin: '50% 100%'}}>
            <Crown w={104} />
          </div>
        )}

        {/* the imaginary trophy floats beside him */}
        {trophyIn > 0.01 && (
          <div style={{position: 'absolute', left: TROPHY.x - TROPHY.w / 2, top: TROPHY.y - TROPHY.w * 1.25 + trophyBob, transform: `scale(${trophyIn * trophyS})`, transformOrigin: '50% 100%'}}>
            <Trophy w={TROPHY.w} />
            <div style={{position: 'absolute', left: -20, right: -20, top: TROPHY.w * 1.25 + 6, display: 'flex', justifyContent: 'center', opacity: trophyS > 0.5 ? 1 : 0}}>
              <div style={{padding: '2px 10px', borderRadius: 999, background: 'rgba(25,43,42,0.72)'}}>
                <Txt size={15} weight={700} color={C.cream} style={{letterSpacing: '0.1em'}}>
                  IMAGINARY
                </Txt>
              </div>
            </div>
          </div>
        )}

        {riseP > 0 && (
          <div style={{position: 'absolute', left: PIN.x - PIN.w / 2, top: PIN.y - PIN.w * (388 / 300) - 36 * riseP + hover + (1 - riseP) * 150, transform: `scale(${riseP})`, transformOrigin: '50% 100%'}}>
            <Pin pose={pp} width={PIN.w} t={t} />
          </div>
        )}

        {/* board → listing → checkout */}
        {boardIn > 0 && toList < 0.5 && !cardOut && (
          <Obj cx={CARD.x} cy={CARD.y} w={BOARD.w} h={BOARD.h} pose={{s: CARD.s * lerp(0.6, 1, boardIn), z: lerp(-400, 0, boardIn), rx: lerp(40, 4, boardIn), ry: Math.sin(t * 0.8) * 3 + turnBoard}}>
            <BidBoard amount={amount} bidder={bidder} flash={flash} />
          </Obj>
        )}
        {toList >= 0.5 && toCheckout < 0.5 && !cardOut && (
          <Obj cx={CARD.x} cy={CARD.y} w={LISTING.w} h={LISTING.h} pose={{s: CARD.s, rx: 3, ry: Math.sin(t * 0.7) * 2 + turnList}}>
            <ListingCard rise={rise} sponsored={sponsored} glow={bump(t, Q.finally + 0.6, 1.2)} />
          </Obj>
        )}
        {toCheckout >= 0.5 && !cardOut && (
          <Obj cx={CARD.x} cy={CARD.y - 40} w={CHECKOUT.w} h={CHECKOUT.h} pose={{s: CARD.s, rx: 3, ry: Math.sin(t * 0.7) * 2 + turnCheckout}}>
            <CheckoutCard gone={gone} stamp={stamp} />
          </Obj>
        )}
      </World>

      {/* title: the premise in the first seconds */}
      <Kicker t={t} at={0} out={Q.bid100 - 0.3} lines={[<span key="a">#1 GOOGLE MAPS</span>, <Hl key="b">RANKING?</Hl>]} size={96} />
      {t < Q.bid100 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 476, display: 'flex', justifyContent: 'center', opacity: pr(t, 0.15, 0.3) * (1 - pr(t, Q.bid100 - 0.3, 0.2))}}>
          <div style={{padding: '8px 20px', borderRadius: 999, background: C.charcoal}}>
            <Txt size={28} weight={800} color={C.cream} style={{letterSpacing: '0.16em'}}>
              FICTIONAL AUCTION
            </Txt>
          </div>
        </div>
      )}
      <Kicker t={t} at={Q.bid500} out={Q.L03e + 0.2} lines={[<Hl key="a">FIVE HUNDRED DOLLARS!</Hl>]} size={70} />
      <Kicker t={t} at={Q.sold} out={Q.sold + 0.5} lines={[<Hl key="a">SOLD!</Hl>]} size={120} />
      <Kicker t={t} at={Q.sold + 0.85} out={Q.L05 + 0.9} lines={[<span key="a">AUCTION <Hl>WON!</Hl></span>]} size={110} color="#B5792C" />
      <Kicker t={t} at={Q.sponsored6} out={Q.L06e + 0.4} lines={[<Hl key="a">SPONSORED?</Hl>]} size={110} />
      <Kicker t={t} at={Q.notAn} out={Q.L07e + 0.3} lines={[<span key="a">NOT AN <Hl>ORGANIC RANKING</Hl></span>]} size={64} />
      <Kicker t={t} at={Q.nonRefundable - 0.2} out={Q.L14e + 0.5} lines={[<span key="a">YOUR TROPHY IS</span>, <Hl key="b">NON-REFUNDABLE.</Hl>]} size={84} />
      {/* push-through into the lesson */}
      <AbsoluteFill style={{background: C.paper, opacity: t < Q.L10 + 0.5 ? pr(t, Q.L09e + 0.4, 0.18) : 0}} />
    </AbsoluteFill>
  );
};
