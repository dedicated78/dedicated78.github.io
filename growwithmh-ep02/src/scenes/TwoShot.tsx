import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, keyed, lerp, pr, speakerAt, voice} from '../timing';
import {OWNER_REST, OwnerPose} from '../chars/Owner';
import {Pin, PIN_REST, PinPose} from '../chars/Pin';
import {armTo, handAt, toWorld} from '../chars/rig';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Hl, Kicker} from '../components/Text';
import {Neighborhood, Phone} from '../props/Props';
import {CATEGORY, CategoryCard, FilmReel, HOURS, HoursCard, Paperwork, YearCalendar} from '../props/Ep02Props';
import {Cam, OwnerAt, Studio, World} from './common';

// SCENES 01, 02, 03 and 05 share one set: the owner on the left, the Maps Assistant on its
// map tile on the right. Poses are keyed to the voiceover's word timings (src/cues.json).

export const OWN = {x: 330, y: 1380, w: 380};
export const PIN = {x: 800, y: 1330, w: 240}; // y = pin tip on its tile
const TILE = {x: 800, y: 1350, size: 380};

const bump = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
/** Natural blinks: ~0.13 s closures on an irregular rhythm. */
const blink = (t: number, period: number, phase: number) => {
  const u = (t + phase) % period;
  return u < 0.13 ? 0.12 + 0.88 * Math.abs(u / 0.065 - 1) : 1;
};
const talking = (who: 'owner' | 'assistant', t: number, k = 1.6) => (speakerAt(t) === who ? Math.min(1, voice(t) * k) : 0);

// hand targets in the owner's viewBox (palm centre)
const PHONE_HOLD = {x: 262, y: 428};
const POCKET = {x: 300, y: 470};

// ---------------------------------------------------------------- owner performance
const ownerPose = (t: number): OwnerPose => {
  const base: OwnerPose = {...OWNER_REST, lookX: 0.35, lookY: 0.7, brow: 0.35, head: 4, smile: 0.25, ...armTo('R', PHONE_HOLD)};
  const p = keyed(t, base, [
    // SCENE 01 · curious, looking at the phone
    {t: Q.L01 + 0.9, d: 0.5, e: EZ.inOut, brow: 0.7, head: 6, lookY: 0.55},
    {t: Q.talk1 - 0.4, d: 0.4, e: EZ.inOut, lookY: -0.35, lookX: 0.1, brow: 0.85, smile: 0.45, head: -3},
    {t: Q.buzz, d: 0.12, lookY: 0.75, lookX: 0.35, eyes: 1.2, brow: 0.5, smile: 0.1, head: 3},
    // the assistant pops out: a small recoil, phone pulled in, shoulders up
    {t: Q.emerge + 0.05, d: 0.18, e: EZ.back, lean: -6, head: -7, eyes: 1.4, brow: 1, shrug: 0.6, ...armTo('R', {x: 252, y: 410}, 0.6), aLs: 20, aLe: 42, lookX: 0.9, lookY: -0.3, smile: -0.3},
    {t: Q.emerge + 0.45, d: 0.5, e: EZ.inOut, lean: -2.5, shrug: 0.15, head: -3, eyes: 1.2, ...armTo('R', PHONE_HOLD, 0.15), aLs: 10, aLe: 16},
    {t: Q.needToTalk, d: 0.3, eyes: 1.3, sweat: 0.8, brow: 0.9, smile: -0.25},
    // SCENE 02 · shows the missed calls to the assistant: forearm forward, elbow low, small lean in
    {t: Q.L03 - 0.15, d: 0.45, e: EZ.inOut, lean: 3, shrug: 0, ...armTo('R', {x: 336, y: 370}), angry: 0.35, brow: 0.3, smile: -0.3, lookX: 0.85, lookY: 0.05, head: 3, eyes: 1.1, sweat: 0.4},
    {t: Q.closed - 0.12, d: 0.3, e: EZ.back, lean: 4.5, ...armTo('R', {x: 344, y: 362}), head: 5},
    {t: Q.L03e + 0.1, d: 0.4, e: EZ.inOut, lean: 1.5, ...armTo('R', PHONE_HOLD), angry: 0.1},
    // reads the card; slips the phone into his pocket on the way down
    {t: Q.profile4 - 0.25, d: 0.4, e: EZ.inOut, ...armTo('R', POCKET), lookY: -0.75, lookX: 0.25, head: 2, brow: 0.6, angry: 0, lean: 0},
    {t: Q.profile4 + 0.3, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14},
    {t: Q.open4, d: 0.4, blush: 0.6, smile: -0.3, eyes: 1.25, brow: 0.8},
    // "We stopped working Sundays last year!" — hand to chest, indignant surprise
    {t: Q.L05 - 0.12, d: 0.3, e: EZ.back, ...armTo('R', {x: 224, y: 380}), hR: 0.6, lean: -3, eyes: 1.38, brow: 1, lookX: 0.8, lookY: 0, blush: 0.3, shrug: 0.3},
    {t: Q.lastYear, d: 0.22, e: EZ.back, bob: -10, lean: -4},
    {t: Q.lastYear + 0.3, d: 0.3, e: EZ.inOut, bob: 0},
    {t: Q.L05e + 0.1, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14, hR: 0, lean: 0, shrug: 0},
    // facepalm after "historical documentary": palm to forehead, head drops, shoulders sag
    {t: Q.L06e + 0.02, d: 0.45, e: EZ.inOut, ...armTo('L', {x: 184, y: 170}, -0.3), hL: 0.85, wL: 8, nod: 0.7, eyes: 0.15, shrug: -0.3, lean: 2, head: -3, lookY: 0.6, blush: 0.6},
    // SCENE 03 · the hand slides off the face into a nervous clasp
    {t: Q.L07 - 0.05, d: 0.5, e: EZ.inOut, ...armTo('L', {x: 190, y: 442}), hL: 0.2, wL: 0, nod: 0.12, eyes: 1.15, shrug: 0.2, lean: 0, head: 2, lookY: 0, lookX: 0.8, sweat: 1, brow: 0.75, smile: 0.15},
    {t: Q.L07 + 0.15, d: 0.45, e: EZ.inOut, ...armTo('R', {x: 212, y: 442})},
    {t: Q.repair, d: 0.4, blush: 0.5, brow: 0.9, smile: -0.2, nod: 0},
    // "I thought you'd figure it out!" — both hands, controlled, small lean in
    {t: Q.L09 - 0.3, d: 0.25, e: EZ.inOut, aLs: 6, aLe: 24, aRs: 6, aRe: 24},
    {t: Q.L09 - 0.08, d: 0.4, e: EZ.inOut, aLs: 14, aLe: -52, aRs: 14, aRe: -52, wL: 6, wR: 6, lean: 3.5, angry: 0.45, brow: 0.2, smile: -0.4, eyes: 1.15, lookX: 0.85, lookY: -0.1, blush: 0.2, sweat: 0.4},
    {t: Q.L09 + 0.02, d: 0.4, e: EZ.inOut, hL: 0.9, hR: 0.9},
    {t: Q.figure - 0.05, d: 0.3, e: EZ.back, aLs: 17, aLe: -70, aRs: 17, aRe: -70, wL: 12, wR: 12, lean: 5, shrug: 0.45, head: -4},
    {t: Q.L09e + 0.05, d: 0.45, e: EZ.inOut, aLs: 10, aLe: 14, aRs: 10, aRe: 14, wL: 0, wR: 0, lean: 0, bob: 0, angry: 0.1, shrug: 0, head: 2},
    {t: Q.L09e + 0.12, d: 0.45, e: EZ.inOut, hL: 0, hR: 0},
    {t: Q.unpaid, d: 0.3, eyes: 1.3, brow: 0.9, angry: 0},
    // the paperwork lands at his feet: embarrassed, head down, hands together
    {t: Q.manager + 0.55, d: 0.5, e: EZ.inOut, blush: 0.9, nod: 0.45, lookY: 0.85, lookX: 0.4, eyes: 1, ...armTo('L', {x: 192, y: 448}), ...armTo('R', {x: 210, y: 448}), shrug: -0.25, smile: -0.3},
    // SCENE 05 · back on set (hard reset while the camera is still inside the lesson)
    {t: Q.L14 - 0.6, d: 0.02, nod: 0, blush: 0.45, lookY: -0.1, lookX: 0.8, aLs: 9, aLe: 12, aRs: 10, aRe: 14, shrug: -0.1, eyes: 1.05, brow: 0.5, smile: -0.1, sweat: 0},
    // "So... you weren't ignoring me?" — one open palm, elbow by the torso, peak on "me?"
    {t: Q.ignoringMe - 0.75, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26, head: 1},
    {t: Q.ignoringMe - 0.45, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -64, wR: 4, head: 5, brow: 0.8},
    {t: Q.ignoringMe - 0.33, d: 0.42, e: EZ.inOut, hR: 0.85},
    {t: Q.me14 - 0.05, d: 0.34, e: EZ.back, aRs: 18, aRe: -82, wR: 12, hR: 1, head: 8, lean: 1.5, brow: 1, eyes: 1.15, lookY: -0.25},
    {t: Q.L14e + 0.1, d: 0.4, e: EZ.inOut, aRs: 9, aRe: 12, wR: 0, head: 3, lean: 0},
    {t: Q.L14e + 0.16, d: 0.4, e: EZ.inOut, hR: 0},
    {t: Q.no15, d: 0.25, eyes: 1.25, brow: 0.9},
    // ...and freezes, embarrassed
    {t: Q.ignoring15 + 0.2, d: 0.35, e: EZ.back, blush: 1, eyes: 1.35, brow: 1, smile: -0.35, shrug: 0.35, lookX: 0.9, lookY: 0},
  ]);
  // nervous fidget while asking "anything else?" (hands rub, eyes dart)
  const fid = pr(t, Q.L07 + 0.5, 0.3) * (1 - pr(t, Q.L08 + 0.6, 0.4));
  p.aLe += Math.sin(t * 9) * 3 * fid;
  p.aRe -= Math.sin(t * 9 + 1) * 3 * fid;
  p.lookX += Math.sin(t * 4.3) * 0.35 * fid;
  // breathing (stops dead for the comedic freeze)
  const alive = t < Q.L15e - 0.1;
  if (alive) p.bob += Math.sin(t * 2.1) * 1.6;
  p.mouth = talking('owner', t, 1.7);
  if (alive && p.eyes > 0.5) p.eyes *= blink(t, 3.1, 0.7);
  return p;
};

// ---------------------------------------------------------------- assistant performance
const pinPose = (t: number): PinPose => {
  const p = keyed(t, {...PIN_REST, eyes: 0.05, lookX: -0.5}, [
    {t: Q.emerge + 0.25, d: 0.2, eyes: 1},
    {t: Q.finally - 0.05, d: 0.25, lookY: -0.9, lookX: 0.2, eyes: 0.75},
    {t: Q.finally + 0.45, d: 0.3, lookY: 0, lookX: -0.6, eyes: 1},
    {t: Q.needToTalk, d: 0.3, brow: 0.5},
    {t: Q.L02e + 0.2, d: 0.3, brow: 0},
    {t: Q.L03 + 0.4, d: 0.3, lookX: -0.8, lookY: 0.25},
    {t: Q.profile4 - 0.1, d: 0.3, lookX: -0.6, lookY: -0.7},
    {t: Q.L04e + 0.1, d: 0.3, lookX: -0.85, lookY: 0},
    {t: Q.L06, d: 0.3, eyes: 0.8, lookX: -0.9, lookY: 0},
    {t: Q.documentary, d: 0.3, brow: 0.4},
    {t: Q.L07, d: 0.3, brow: 0, eyes: 0.9},
    {t: Q.L08 - 0.2, d: 0.3, lookX: -0.7, lookY: -0.6},
    {t: Q.isThat, d: 0.3, brow: 1, eyes: 0.7},
    {t: Q.best - 0.2, d: 0.3, lookX: -1, lookY: 0},
    {t: Q.L09, d: 0.3, brow: 0.3, eyes: 0.85},
    {t: Q.L10, d: 0.3, eyes: 0.65, brow: 0.7, lookX: -0.9, lookY: 0},
    {t: Q.manager + 0.1, d: 0.25, lookY: 0.6, lookX: -0.8},
    {t: Q.manager + 0.7, d: 0.3, lookY: 0, lookX: -0.9},
    {t: Q.L14 - 0.6, d: 0.02, eyes: 0.8, brow: 0.2, lookX: -0.9, lookY: 0},
    {t: Q.no15, d: 0.1, eyes: 0.1},
    {t: Q.no15 + 0.3, d: 0.15, eyes: 0.7, brow: 0.6},
  ]);
  p.talk = talking('assistant', t, 1.6);
  // tiny head-shake on "No."
  p.tilt = Math.sin(t * 1.3) * 2 + bump(t, Q.no15, 0.45) * Math.sin((t - Q.no15) * 28) * 4;
  // nudge the paperwork: lean into it, then settle
  p.tilt += -12 * bump(t, Q.manager - 0.05, 0.6);
  // the dramatic turn away
  p.turn = pr(t, Q.profile15 + 0.25, 0.38, EZ.inOut);
  p.squash = 1 - 0.18 * bump(t, Q.emerge + 0.9, 0.24) - 0.08 * bump(t, Q.profile15 + 0.2, 0.2);
  if (p.eyes > 0.5) p.eyes *= blink(t, 3.7, 1.9);
  return p;
};

// ---------------------------------------------------------------- camera
const camAt = (t: number): Cam => {
  const k = (a: number, d: number, e = EZ.inOut) => pr(t, a, d, e);
  let x = 380;
  let y = 990;
  let s = lerp(2.22, 2.4, k(0, 2.9, EZ.linear));
  const mv = (p: number, nx: number, ny: number, ns: number) => {
    x = lerp(x, nx, p);
    y = lerp(y, ny, p);
    s = lerp(s, ns, p);
  };
  mv(k(Q.emerge + 0.3, 0.8), 560, 960, 1.06); // pull back to the two-shot as it hops to its tile
  mv(k(Q.needToTalk - 0.2, 0.7), 600, 960, 1.12);
  mv(k(Q.L03 - 0.3, 0.7), 520, 960, 1.1);
  mv(k(Q.profile4 - 0.45, 0.7), 540, 870, 0.92); // room for the profile card
  mv(k(Q.historical - 0.3, 0.6), 560, 820, 0.98);
  mv(k(Q.L06e + 0.05, 0.6), 520, 920, 1.02);
  mv(k(Q.L07 - 0.1, 0.6), 480, 960, 1.14); // on the nervous owner
  mv(k(Q.L08 - 0.35, 0.7), 680, 900, 1.12); // to the assistant and the category card
  mv(k(Q.L09 - 0.3, 0.6), 560, 940, 1.0);
  mv(k(Q.unpaid - 0.2, 0.8), 600, 950, 1.05);
  mv(k(Q.manager + 0.7, 0.62, EZ.in), CARD_SMALL.x, CARD_SMALL.y, 3.1); // push into the floating profile card
  // scene 05 returns on a gentle pull-back
  if (t > Q.L14 - 1) {
    x = 560;
    y = 960;
    s = lerp(1.24, 1.04, k(Q.L14 - 0.7, 0.9, EZ.out));
    mv(k(Q.no15 - 0.1, 0.6), 640, 960, 1.1);
  }
  return {x, y, s};
};
const CARD_BIG = {x: 640, y: 560, s: 0.68};
const CARD_SMALL = {x: 250, y: 640, s: 0.42};

export const TwoShot: React.FC<{t: number; fade?: number}> = ({t, fade = 1}) => {
  const o = ownerPose(t);
  const pp = pinPose(t);
  const cam = camAt(t);

  // phone in his right hand (forward kinematics → world), until it goes into the pocket
  const hand = toWorld(handAt(o, 'R'), OWN.x, OWN.y, OWN.w);
  const pocketed = pr(t, Q.profile4 + 0.08, 0.18, EZ.in);
  const buzzing = t > Q.buzz && t < Q.buzz + 0.65 && !(t > Q.buzz + 0.32 && t < Q.buzz + 0.4);
  const glow = pr(t, Q.buzz - 0.05, 0.2) * (1 - pr(t, Q.emerge + 0.5, 0.6));
  const spin = pr(t, Q.L03 - 0.05, 0.5, EZ.inOut); // the phone turns to show the missed calls
  const show = pr(t, Q.L03 - 0.15, 0.45, EZ.inOut) * (1 - pr(t, Q.L03e + 0.1, 0.4, EZ.inOut));
  const phoneW = 84;
  const phone = {x: hand.x + 4 + (buzzing ? Math.sin(t * 90) * 3 : 0), y: hand.y - 26};

  // assistant: pops out of the screen, arcs over, lands on its tile
  const rise = pr(t, Q.emerge, 0.38, EZ.back); // pops up out of the screen
  const fly = pr(t, Q.emerge + 0.42, 0.5, EZ.inOut); // then hops across to its tile
  const tileIn = pr(t, Q.emerge + 0.5, 0.45, EZ.back);
  const riseX = phone.x + 40 * rise;
  const riseY = phone.y - 10 - 150 * rise;
  const px = lerp(riseX, PIN.x, fly);
  const py = lerp(riseY, PIN.y, fly) - Math.sin(Math.PI * fly) * 160;
  const pscale = lerp(0.08, 0.5, rise) + 0.5 * fly;
  const hover = Math.sin(t * 2.2) * 6 * pr(t, Q.emerge + 1.0, 0.5) * (t < Q.L15e - 0.1 ? 1 : 0);
  const turnShift = pr(t, Q.profile15 + 0.25, 0.38, EZ.inOut) * 30;
  const nudge = -40 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - (Q.manager - 0.05)) / 0.6)));

  // profile card (hours), calendar, film reel
  const hoursIn = pr(t, Q.profile4 - 0.05, 0.5, EZ.back) * (1 - pr(t, Q.L07 - 0.15, 0.4, EZ.in));
  const sunday = pr(t, Q.open4 - 0.05, 0.35, EZ.out);
  const sepia = pr(t, Q.historical, 0.4) * (1 - pr(t, Q.L07 - 0.2, 0.3));
  const calIn = pr(t, Q.sundays4 - 0.55, 0.75, EZ.out) * (1 - pr(t, Q.L07 - 0.2, 0.4, EZ.in));
  const calSpin = (1 - pr(t, Q.sundays4 - 0.55, 0.8, EZ.out)) * 360;
  const calBack = 4 * pr(t, Q.historical - 0.1, 0.7, EZ.inOut);
  const reel = pr(t, Q.documentary - 0.12, 0.35, EZ.back) * (1 - pr(t, Q.L06e + 0.75, 0.3, EZ.in));

  // category card: big beside the assistant, then floats aside small (the push-in target)
  const catIn = pr(t, Q.L08 - 0.2, 0.5, EZ.back);
  const catAside = pr(t, Q.L09 - 0.15, 0.6, EZ.inOut);
  const catX = lerp(CARD_BIG.x, CARD_SMALL.x, catAside);
  const catY = lerp(CARD_BIG.y, CARD_SMALL.y, catAside);
  const catS = lerp(CARD_BIG.s, CARD_SMALL.s, catAside);
  const jobs = [0, 1, 2].map((i) => pr(t, Q.repair + 0.05 + i * 0.12, 0.4, EZ.back));

  // paperwork: appears by the assistant, nudged across to the owner's feet
  const paperIn = pr(t, Q.unpaid - 0.25, 0.35, EZ.back);
  const slide = pr(t, Q.manager + 0.05, 0.6, EZ.out);
  const paper = {x: lerp(650, 470, slide), y: lerp(1342, 1392, slide)};

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Studio haloX={640} haloY={820} floorY={1300} />
      <World cam={cam}>
        {/* the assistant's map tile */}
        {tileIn > 0 && (
          <Obj cx={TILE.x} cy={TILE.y} w={TILE.size} h={TILE.size} pose={{rx: lerp(90, 66, tileIn), s: lerp(0.4, 1, tileIn)}}>
            <Card3D w={TILE.size} h={TILE.size} depth={22} step={4} radius={44} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={30} shadow={0.6} glow={`0 0 60px rgba(183,216,197,${0.25 * tileIn})`}>
              <Neighborhood w={TILE.size} h={TILE.size} pins={0.4} ownPin={0} />
            </Card3D>
          </Obj>
        )}

        {/* paperwork stack */}
        {paperIn > 0 && t < Q.outro && (
          <div style={{position: 'absolute', left: paper.x - 75, top: paper.y - 130, transform: `scale(${paperIn}) rotate(${lerp(0, -6, slide)}deg)`, transformOrigin: '50% 100%'}}>
            <Paperwork w={150} spread={bump(t, Q.manager + 0.05, 0.6)} />
          </div>
        )}

        <OwnerAt x={OWN.x} y={OWN.y} w={OWN.w} pose={o} />

        {/* phone glow + phone */}
        {pocketed < 1 && glow > 0 && (
          <div style={{position: 'absolute', left: phone.x - 160, top: phone.y - 160, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(42,128,119,${0.45 * glow}), rgba(183,216,197,${0.18 * glow}) 60%, rgba(183,216,197,0))`}} />
        )}
        {pocketed < 1 && (
          <div style={{position: 'absolute', left: phone.x - phoneW / 2, top: phone.y - phoneW + pocketed * 40, perspective: 700, transform: `scale(${1 - pocketed})`, transformOrigin: '50% 100%'}}>
            <div style={{transformStyle: 'preserve-3d', transform: `rotateZ(${lerp(-8, 4, show)}deg) rotateX(${lerp(10, 4, show)}deg) rotateY(${lerp(-22, 28, show) + spin * 360}deg)`}}>
              <Phone w={phoneW} flip={1} ringing={0} screen={spin < 0.5 ? 'maps' : 'missed'} t={t} glow={glow} />
            </div>
          </div>
        )}

        {/* the assistant */}
        {t >= Q.emerge && (
          <div style={{position: 'absolute', left: px + nudge + turnShift - PIN.w / 2, top: py + hover - PIN.w * (388 / 300), transform: `scale(${pscale}) rotate(${lerp(-18, 0, fly) * rise}deg)`, transformOrigin: '50% 100%'}}>
            <Pin pose={pp} width={PIN.w} t={t} />
          </div>
        )}

        {/* SCENE 02 props */}
        {hoursIn > 0 && (
          <Obj cx={470} cy={495} w={HOURS.w} h={HOURS.h} pose={{s: 0.85 * lerp(0.6, 1, hoursIn), z: lerp(-400, 0, hoursIn), rx: lerp(40, 3, hoursIn), ry: Math.sin(t * 0.8) * 3, y: (1 - hoursIn) * 120}}>
            <HoursCard t={t} sunday={sunday} sepia={sepia} />
          </Obj>
        )}
        {calIn > 0 && (
          <div style={{position: 'absolute', left: 905 - 95, top: 470 - (1 - calIn) * 200, perspective: 900}}>
            <div style={{transformStyle: 'preserve-3d', transform: `rotateY(${calSpin}deg) scale(${calIn})`}}>
              <YearCalendar w={190} back={calBack} sepia={sepia} />
            </div>
          </div>
        )}
        {reel > 0 && (
          <div style={{position: 'absolute', left: 660 - 160, top: 250, transform: `scale(${reel}) rotate(${lerp(-12, 0, reel)}deg)`, transformOrigin: '50% 70%', opacity: Math.min(1, reel * 2)}}>
            <FilmReel w={320} t={t} />
          </div>
        )}

        {/* SCENE 03 category card */}
        {catIn > 0 && t < Q.L14 - 1.2 && (
          <Obj cx={catX} cy={catY} w={CATEGORY.w} h={CATEGORY.h} pose={{s: catS * lerp(0.6, 1, catIn), z: lerp(-400, 0, catIn), rx: lerp(40, 2, catIn), ry: Math.sin(t * 0.7) * 3 - catAside * 4, y: (1 - catIn) * 100}}>
            <CategoryCard hi={pr(t, Q.general - 0.05, 0.35)} doubt={pr(t, Q.isThat, 0.35, EZ.back)} jobs={jobs} suggest={pr(t, Q.best + 0.2, 0.4, EZ.back)} />
          </Obj>
        )}
      </World>

      <Kicker t={t} at={Q.needToTalk} out={Q.L02e + 0.25} lines={[<span key="a">WE NEED <Hl>TO TALK.</Hl></span>]} size={94} />
      <Kicker t={t} at={Q.open4} out={Q.L04e + 0.3} lines={[<span key="a">OPEN ON <Hl>SUNDAYS?</Hl></span>]} size={84} />
      <Kicker t={t} at={Q.lastYear} out={Q.L05e + 0.3} lines={[<Hl key="a">LAST YEAR!</Hl>]} size={120} />
      <Kicker t={t} at={Q.unpaid} out={Q.manager + 0.5} lines={[<span key="a">UNPAID</span>, <Hl key="b">OFFICE MANAGER.</Hl>]} size={92} />
      <Kicker t={t} at={Q.ignoring15} out={Q.L15e + 0.4} lines={[<span key="a">YOU WERE IGNORING</span>, <Hl key="b">YOUR PROFILE.</Hl>]} size={80} />
      {/* soft white push-through into the lesson */}
      <AbsoluteFill style={{background: C.paper, opacity: t < Q.L11 ? pr(t, Q.manager + 1.1, 0.2) : 0}} />
    </AbsoluteFill>
  );
};
