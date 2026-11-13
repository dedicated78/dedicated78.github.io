import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, keyed, lerp, pr, speakerAt, voice} from '../timing';
import {OWNER_REST, OwnerPose} from '../chars/Owner';
import {Pin, PIN_REST, PinPose} from '../chars/Pin';
import {Bot, BOT_REST, BotPose} from '../chars/Bot';
import {armTo, headPoint, toWorld} from '../chars/rig';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Neighborhood} from '../props/Props';
import {Crown} from '../props/Ep03Props';
import {FAN, FanClubFace, FanReviewFace, MiniReview, PolicyCard, ReviewPanel, REVIEWS} from '../props/Ep04Props';
import {Cam, OwnerAt, Studio, World} from './common';

// Celebration → reviews disappearing → confusion → panic → SILENCE → Review Bot → Maps Assistant →
// punchline. One set; every beat is keyed to the voiceover's word timings (src/cues.json).

const OWN = {x: 300, y: 1380, w: 380};
const PANEL = {x: 690, y: 600, s: 0.72};
const PIN = {x: 640, y: 1335, w: 210};
const TILE = {x: 640, y: 1352, size: 300};
const BOT = {x: 890, y: 1386, w: 190};

const bump = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
const blink = (t: number, period: number, phase: number) => {
  const u = (t + phase) % period;
  return u < 0.13 ? 0.12 + 0.88 * Math.abs(u / 0.065 - 1) : 1;
};
const talking = (who: 'owner' | 'assistant' | 'bot', t: number, k = 1.6) => (speakerAt(t) === who ? Math.min(1, voice(t) * k) : 0);
/** During the mandatory silence nothing moves: every animation samples the silence's first frame. */
const still = (t: number) => (t >= Q.silenceA && t < Q.silenceB ? Q.silenceA : t);

// ---------------------------------------------------------------- the review count (dramatized)
const DROPS = [Q.dropStart, Q.dropStart + 0.45, Q.dropStart + 0.85];
const MID20 = (Q.n30 + Q.n10) / 2;
export const countAt = (t: number) => {
  if (t >= Q.zero) return 0;
  if (t >= Q.n10) return 10;
  if (t >= MID20) return 20;
  if (t >= Q.n30) return 30;
  if (t >= DROPS[2]) return 35;
  if (t >= DROPS[1]) return 42;
  if (t >= DROPS[0]) return 48;
  const k = Math.floor((t - (Q.L01 + 0.05)) / 0.22);
  return [5, 15, 30, 50][Math.max(0, Math.min(3, k))];
};
// ten floating review cards (the cousin's accounts): when each appears, where, and when it vanishes
const CARD_POS: Array<[number, number]> = [
  [440, 430], [440, 620], [560, 300], [790, 292], [905, 430], [905, 620], [890, 800], [640, 900], [800, 905], [355, 300],
];
const VANISH = [DROPS[0], DROPS[1], DROPS[2], Q.n30, Q.n30 + 0.12, MID20, MID20 + 0.12, Q.n10, Q.n10 + 0.12, Q.zero];

// ---------------------------------------------------------------- owner performance
const FIST_R = {x: 304, y: 298};
const FIST_L = {x: 96, y: 298};
const ownerPose = (tt: number): OwnerPose => {
  const t = still(tt);
  const base: OwnerPose = {...OWNER_REST, smile: 0.85, brow: 0.6, eyes: 1.15, lookX: 0.75, lookY: -0.35, head: 3, ...armTo('R', FIST_R), ...armTo('L', FIST_L)};
  const p = keyed(t, base, [
    // 01 · celebration: two small double fist pumps, chin up for "medal"
    {t: Q.L01 + 0.02, d: 0.14, e: EZ.out, bob: -9, ...armTo('R', {x: 306, y: 282}), ...armTo('L', {x: 94, y: 282})},
    {t: Q.L01 + 0.2, d: 0.2, e: EZ.inOut, bob: 0, ...armTo('R', FIST_R), ...armTo('L', FIST_L)},
    {t: Q.overnight - 0.05, d: 0.14, e: EZ.out, bob: -10, ...armTo('R', {x: 306, y: 280}), ...armTo('L', {x: 94, y: 280})},
    {t: Q.overnight + 0.15, d: 0.25, e: EZ.inOut, bob: 0, ...armTo('R', FIST_R), ...armTo('L', FIST_L), lookX: 0.2, lookY: -0.1},
    {t: Q.medal - 0.2, d: 0.35, e: EZ.inOut, head: -6, lookY: -0.25, smile: 0.95, eyes: 1.0, shrug: 0.2},
    // "He made 50 accounts! Look at that perfect rating!" — fists down, then presents the panel
    {t: Q.L02 - 0.1, d: 0.45, e: EZ.inOut, aLs: 9, aLe: 12, aRs: 10, aRe: 14, shrug: 0, head: 2, lookX: 0.8, lookY: -0.35, eyes: 1.15},
    {t: Q.look - 0.4, d: 0.45, e: EZ.inOut, aRs: 15, aRe: -62, wR: 6, head: 4},
    {t: Q.look - 0.28, d: 0.45, e: EZ.inOut, hR: 0.9},
    {t: Q.rating - 0.1, d: 0.34, e: EZ.back, aRs: 19, aRe: -80, wR: 12, hR: 1, lean: 1.5, smile: 1},
    // 02 · something is wrong: the smile fades while the arm comes home, shoulders tighten
    {t: Q.dropStart + 0.35, d: 0.8, e: EZ.inOut, smile: 0.1, brow: 0.8, lookX: 0.85, lookY: -0.45, head: 6, lean: 0},
    {t: Q.dropStart + 0.45, d: 0.6, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0},
    {t: Q.dropStart + 0.55, d: 0.6, e: EZ.inOut, hR: 0},
    {t: Q.dropStart + 1.0, d: 0.45, e: EZ.inOut, shrug: 0.28, eyes: 1.25, smile: -0.1},
    // "Wait... why are my reviews decreasing?!" — head tilt, one open palm, elbow by the torso
    {t: Q.decreasing - 0.75, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26, head: 2},
    {t: Q.decreasing - 0.45, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -64, wR: 4, head: 6, brow: 0.9},
    {t: Q.decreasing - 0.33, d: 0.42, e: EZ.inOut, hR: 0.85},
    {t: Q.decreasing - 0.05, d: 0.34, e: EZ.back, aRs: 18, aRe: -80, wR: 12, hR: 1, head: 9, brow: 1, eyes: 1.25, smile: -0.25},
    {t: Q.L03e + 0.05, d: 0.35, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, head: 4},
    {t: Q.L03e + 0.1, d: 0.35, e: EZ.inOut, hR: 0},
    // 03 · panic: small step back, hands come up open at chest height, eyes dart panel ↔ audience
    {t: Q.L04 - 0.12, d: 0.3, e: EZ.out, lean: -3, shrug: 0.4, eyes: 1.35, brow: 1, smile: -0.45, ...armTo('L', {x: 152, y: 386}), ...armTo('R', {x: 248, y: 386}), hL: 0.8, hR: 0.8, lookX: 0.85, lookY: -0.45},
    {t: Q.n30 - 0.05, d: 0.12, lookX: 0, lookY: 0},
    {t: Q.n10 - 0.05, d: 0.12, lookX: 0.85, lookY: -0.45},
    {t: Q.zero - 0.05, d: 0.14, lookX: 0.05, lookY: -0.05, eyes: 1.42},
    {t: Q.what - 0.08, d: 0.24, e: EZ.back, lean: -5, bob: -7, shrug: 0.55, ...armTo('L', {x: 156, y: 368}), ...armTo('R', {x: 244, y: 368}), lookX: 0.8, lookY: -0.45},
    {t: Q.what + 0.3, d: 0.25, e: EZ.inOut, bob: 0},
    // (frozen through the silence — no key lands inside it)
    // the Review Bot rolls in: his eyes follow it; hands drift down while it speaks
    {t: Q.botIn + 0.35, d: 0.5, e: EZ.inOut, lookX: 0.95, lookY: 0.05},
    {t: Q.L05 + 0.6, d: 0.9, e: EZ.inOut, lean: -1, shrug: 0.2, ...armTo('L', {x: 160, y: 430}), ...armTo('R', {x: 240, y: 430}), hL: 0.3, hR: 0.3, eyes: 1.3},
    // "But they're all five stars!" — disbelief: two open palms toward the panel, small lean in
    {t: Q.L06 - 0.22, d: 0.35, e: EZ.inOut, aLs: 14, aLe: -55, aRs: 14, aRe: -55, hL: 0.9, hR: 0.9, wL: 8, wR: 8, lean: 3, brow: 1, smile: -0.3, eyes: 1.3, lookX: 0.6, lookY: -0.2, shrug: 0.15},
    {t: Q.fiveStars - 0.05, d: 0.28, e: EZ.back, aLs: 17, aLe: -72, aRs: 17, aRe: -72, wL: 12, wR: 12, lean: 4},
    {t: Q.L06e + 0.08, d: 0.45, e: EZ.inOut, aLs: 9, aLe: 12, aRs: 10, aRe: 14, wL: 0, wR: 0, lean: 0, shrug: 0},
    {t: Q.L06e + 0.15, d: 0.45, e: EZ.inOut, hL: 0, hR: 0},
    {t: Q.L07, d: 0.4, lookX: 0.85, lookY: 0, eyes: 1.2},
    {t: Q.fanClub, d: 0.4, blush: 0.6, brow: 0.7, smile: -0.2},
    {t: Q.remove, d: 0.4, sweat: 1, eyes: 1.3, brow: 1, smile: -0.4},
    // "So... how am I supposed to get reviews now?" — worried, hands together
    {t: Q.L10 - 0.15, d: 0.5, e: EZ.inOut, ...armTo('L', {x: 190, y: 442}), ...armTo('R', {x: 212, y: 442}), shrug: 0.25, head: 4, lookX: 0.8, brow: 0.9, smile: -0.3},
    // back from the request screen: embarrassed, head lowered slightly, looks to the assistant
    {t: Q.L12 - 0.6, d: 0.02, sweat: 0, blush: 0.8, nod: 0.2, lookX: 0.85, lookY: 0.1, smile: -0.1, brow: 0.6, eyes: 1.0, shrug: -0.15, head: 3, ...armTo('L', {x: 194, y: 452}), ...armTo('R', {x: 206, y: 452})},
    {t: Q.concept, d: 0.4, e: EZ.inOut, nod: 0.3, smile: 0.1, eyes: 0.95},
    {t: Q.involved, d: 0.5, e: EZ.inOut, nod: 0.38, lookY: 0.35, blush: 1},
  ]);
  const fid = pr(t, Q.L10 + 0.3, 0.3) * (1 - pr(t, Q.L10e, 0.3));
  p.aLe += Math.sin(t * 9) * 3 * fid;
  p.aRe -= Math.sin(t * 9 + 1) * 3 * fid;
  const frozen = tt >= Q.zero + 0.2 && tt < Q.botIn + 0.35; // shocked freeze: no breath, no blink
  if (!frozen) p.bob += Math.sin(t * 2.1) * 1.6;
  p.mouth = talking('owner', tt, 1.7);
  if (!frozen && p.eyes > 0.5) p.eyes *= blink(t, 3.1, 0.7);
  return p;
};

// ---------------------------------------------------------------- Review Bot (calm, minimal movement)
const botPose = (t: number): BotPose => {
  const p = keyed(t, {...BOT_REST, lookX: -0.3, tilt: -6}, [
    {t: Q.botIn + 0.55, d: 0.4, e: EZ.out, tilt: 0},
    {t: Q.L05 - 0.2, d: 0.3, lookX: -0.8, lookY: -0.75, scan: 1, armR: 28},
    {t: Q.fake5 - 0.75, d: 0.25, scan: 0, lookX: -1, lookY: 0, armR: 0},
    {t: Q.L13e + 0.3, d: 0.18, e: EZ.inOut, nod: 1},
    {t: Q.L13e + 0.5, d: 0.25, e: EZ.inOut, nod: 0},
  ]);
  p.talk = talking('bot', t, 1.2) * 0.6;
  p.hover = Math.sin(t * 2.6) * 3;
  p.light = 0.5 + 0.5 * p.scan;
  return p;
};

// ---------------------------------------------------------------- Maps Assistant
const pinPose = (t: number): PinPose => {
  const p = keyed(t, {...PIN_REST, eyes: 0.05, lookX: -0.85}, [
    {t: Q.rise + 0.35, d: 0.25, eyes: 0.85},
    {t: Q.L07, d: 0.3, eyes: 0.7},
    {t: Q.fanClub, d: 0.3, brow: 0.5},
    {t: Q.L09, d: 0.3, brow: 0.2, eyes: 0.8},
    {t: Q.L10 + 0.3, d: 0.3, lookX: -0.9},
    {t: Q.L12 - 0.6, d: 0.02, eyes: 0.8, brow: 0.2, lookX: -0.9},
    {t: Q.L13, d: 0.3, eyes: 0.6, brow: 0.55},
  ]);
  p.talk = talking('assistant', t, 1.6);
  p.tilt = Math.sin(t * 1.3) * 2;
  if (p.eyes > 0.4) p.eyes *= blink(t, 3.7, 1.9);
  return p;
};

// ---------------------------------------------------------------- camera (static through the silence)
const camAt = (tt: number): Cam => {
  const t = still(tt);
  const k = (a: number, d: number, e = EZ.inOut) => pr(t, a, d, e);
  let x = PANEL.x;
  let y = PANEL.y + 20;
  let s = lerp(1.55, 1.62, k(0, 1.6, EZ.linear));
  const mv = (p: number, nx: number, ny: number, ns: number) => {
    x = lerp(x, nx, p);
    y = lerp(y, ny, p);
    s = lerp(s, ns, p);
  };
  mv(k(Q.overnight + 0.2, 1.1), 560, 880, 1.05); // from the panel to the celebrating owner
  mv(k(Q.L02 - 0.2, 1.0), 545, 870, 1.08);
  mv(k(Q.dropStart + 0.3, 4.0), 500, 760, 1.18); // slow push toward him as the count falls
  mv(k(Q.botIn + 0.2, 1.1), 600, 900, 1.0); // after the silence: room for the bot, then the assistant
  mv(k(Q.L10 - 0.3, 0.7), 480, 900, 1.1);
  mv(k(Q.L10e + 0.05, 0.55, EZ.in), PANEL.x, PANEL.y, 2.7); // push into the empty panel → request screen
  if (t > Q.L12 - 1) {
    x = 560;
    y = 920;
    s = lerp(1.2, 1.06, k(Q.L12 - 0.7, 0.9, EZ.out));
    mv(k(Q.L13 - 0.1, 0.8), 600, 920, 1.1);
  }
  return {x, y, s};
};

export const Set4: React.FC<{t: number; fade?: number}> = ({t: tt, fade = 1}) => {
  const t = still(tt);
  const o = ownerPose(tt);
  const bp = botPose(tt);
  const pp = pinPose(tt);
  const cam = camAt(tt);
  const count = countAt(t);
  const stars = t < Q.zero ? pr(t, Q.overnight, 0.5, EZ.linear) : 0;
  const empty = t >= Q.zero ? 1 : 0;
  const panelIn = pr(t, -0.2, 0.5, EZ.out);
  const zeroShake = bump(t, Q.zero, 0.25) * Math.sin(t * 70) * 5;

  // crown: a brief moment of glory on "medal"
  const head = toWorld(headPoint(o, {x: 200, y: 84}), OWN.x, OWN.y, OWN.w);
  const crown = pr(t, Q.medal - 0.15, 0.35, EZ.back) * (1 - pr(t, Q.medal + 1.25, 0.3, EZ.in));

  // Review Bot rolls in from the right after the silence
  const botX = lerp(1320, BOT.x, pr(t, Q.botIn, 0.9, EZ.out));
  const scanBeam = pr(t, Q.L05 - 0.15, 0.25) * (1 - pr(t, Q.fake5 - 0.8, 0.2));
  // Maps Assistant rises after the bot's line (Episode 01 entrance)
  const tileIn = pr(t, Q.rise - 0.2, 0.45, EZ.out);
  const rise = pr(t, Q.rise, 0.55, EZ.back);
  const hover = Math.sin(t * 2.2) * 6 * rise;
  // fan-club gag
  const fanIn = pr(t, Q.feedback8 - 0.6, 0.45, EZ.back) * (1 - pr(t, Q.L08e + 0.45, 0.35, EZ.in));
  const flip = pr(t, Q.fanClub - 0.3, 0.5, EZ.inOut);
  // policy cards
  const pol1 = pr(t, Q.remove - 0.05, 0.4, EZ.back) * (1 - pr(t, Q.L10 + 0.4, 0.3, EZ.in));
  const pol2 = pr(t, Q.restrictions - 0.05, 0.4, EZ.back) * (1 - pr(t, Q.L10 + 0.45, 0.3, EZ.in));
  const late = tt > Q.L12 - 1;

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Studio haloX={640} haloY={760} floorY={1300} />
      <World cam={cam}>
        {/* review panel */}
        <Obj cx={PANEL.x + zeroShake} cy={PANEL.y} w={REVIEWS.w} h={REVIEWS.h} pose={{s: PANEL.s * lerp(0.85, 1, panelIn), rx: 3 + Math.sin(t * 0.7) * 1.5 * (1 - empty), ry: Math.sin(t * 0.5) * 3 * (1 - empty) - 4}}>
          <ReviewPanel count={count} stars={stars} empty={empty} t={t} />
        </Obj>

        {/* the cousin's reviews: pop in during the celebration, vanish one by one */}
        {!late &&
          CARD_POS.map(([x, y], i) => {
            const inP = pr(t, Q.L01 + 0.25 + i * 0.13, 0.35, EZ.back);
            const out = pr(t, VANISH[i], 0.28, EZ.in);
            if (inP <= 0 || out >= 1) return null;
            const puff = bump(t, VANISH[i], 0.28);
            const float = Math.sin(t * 1.6 + i * 1.3) * 6 * (1 - empty);
            return (
              <React.Fragment key={i}>
                <div style={{position: 'absolute', left: x - 100, top: y - 34 + float, transform: `scale(${0.8 * inP * (1 + 0.15 * puff) * (1 - out)}) rotate(${Math.sin(i * 2.1) * 5 + out * 25}deg)`, transformOrigin: '50% 50%', opacity: 1 - out * 0.6}}>
                  <MiniReview i={i} />
                </div>
                {puff > 0 && <div style={{position: 'absolute', left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: '50%', border: `4px solid rgba(211,155,79,${0.6 * puff})`, transform: `scale(${0.6 + out})`}} />}
              </React.Fragment>
            );
          })}

        {/* Maps Assistant tile + light column */}
        {tileIn > 0 && (
          <Obj cx={TILE.x} cy={TILE.y} w={TILE.size} h={TILE.size} pose={{rx: lerp(90, 66, tileIn), s: lerp(0.4, 1, tileIn)}}>
            <Card3D w={TILE.size} h={TILE.size} depth={20} step={4} radius={38} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={30} shadow={0.6} glow={`0 0 ${50 + 30 * rise}px rgba(183,216,197,${0.3 * rise})`}>
              <Neighborhood w={TILE.size} h={TILE.size} pins={0.4} ownPin={0} />
            </Card3D>
          </Obj>
        )}
        {rise > 0 && rise < 1 && <div style={{position: 'absolute', left: PIN.x - 110, top: PIN.y - 400, width: 220, height: 400, background: 'linear-gradient(0deg, rgba(183,216,197,0.55), rgba(183,216,197,0))', opacity: 1 - rise, filter: 'blur(8px)'}} />}

        <OwnerAt x={OWN.x} y={OWN.y} w={OWN.w} pose={o} />

        {crown > 0.01 && (
          <div style={{position: 'absolute', left: head.x - 52, top: head.y - 4 - 75 - (1 - crown) * 60, transform: `scale(${crown}) rotate(${o.head * 0.8}deg)`, transformOrigin: '50% 100%'}}>
            <Crown w={104} />
          </div>
        )}

        {rise > 0 && (
          <div style={{position: 'absolute', left: PIN.x - PIN.w / 2, top: PIN.y - PIN.w * (388 / 300) - 36 * rise + hover + (1 - rise) * 150, transform: `scale(${rise})`, transformOrigin: '50% 100%'}}>
            <Pin pose={pp} width={PIN.w} t={tt} />
          </div>
        )}

        {/* scan beam from the bot's face to the empty panel */}
        {scanBeam > 0 && (
          <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: scanBeam * 0.9}}>
            <defs>
              <linearGradient id="beam" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="rgba(183,216,197,0.55)" />
                <stop offset="100%" stopColor="rgba(183,216,197,0.05)" />
              </linearGradient>
            </defs>
            <polygon points={`${botX - 34},${BOT.y - 196} ${PANEL.x - 170},${PANEL.y + 130 + Math.sin(t * 6) * 40} ${PANEL.x + 150},${PANEL.y + 220 + Math.sin(t * 6) * 40}`} fill="url(#beam)" />
          </svg>
        )}

        {/* Review Bot */}
        {tt >= Q.botIn && (
          <div style={{position: 'absolute', left: botX - BOT.w / 2, top: BOT.y - BOT.w * (392 / 300)}}>
            <Bot pose={bp} width={BOT.w} t={tt} />
          </div>
        )}

        {/* fan-club gag: one review flips into a membership card */}
        {fanIn > 0.01 && (
          <Obj cx={600} cy={560} w={FAN.w} h={FAN.h} pose={{s: 0.95 * lerp(0.6, 1, fanIn), z: 60 + lerp(-300, 0, fanIn), rx: lerp(30, 4, fanIn), ry: flip * 180 + Math.sin(t * 0.8) * 2}}>
            {flip < 0.5 ? (
              <FanReviewFace />
            ) : (
              <div style={{position: 'absolute', inset: 0, transform: 'rotateY(180deg)', transformStyle: 'preserve-3d'}}>
                <FanClubFace />
              </div>
            )}
          </Obj>
        )}
      </World>

      {/* policy explanation: two minimal cards */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 268, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, perspective: 900}}>
        {pol1 > 0.01 && <PolicyCard icon="trash" text="FAKE REVIEWS MAY BE REMOVED" p={pol1} />}
        {pol2 > 0.01 && (
          <PolicyCard
            icon="lock"
            p={pol2}
            text={
              <>
                POLICY VIOLATIONS CAN
                <br />
                LEAD TO RESTRICTIONS
              </>
            }
          />
        )}
      </div>
      {/* push-through into the request screen */}
      <AbsoluteFill style={{background: C.paper, opacity: tt < Q.L11 + 0.5 ? pr(tt, Q.L10e + 0.4, 0.18) : 0}} />
    </AbsoluteFill>
  );
};
