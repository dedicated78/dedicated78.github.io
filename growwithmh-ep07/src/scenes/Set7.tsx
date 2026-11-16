import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT_DISPLAY} from '../theme';
import {EZ, Q, keyed, lerp, pr, speakerAt, voice} from '../timing';
import {OWNER_REST, OwnerPose} from '../chars/Owner';
import {Pin, PIN_REST, PinPose} from '../chars/Pin';
import {armTo, headPoint, toWorld} from '../chars/rig';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Hl, Kicker} from '../components/Text';
import {Neighborhood} from '../props/Props';
import {Crown} from '../props/Ep03Props';
import {CAUTION, CautionCard, EXTRA, IdeaBulb, KeyChip, MapCard, NAME, PHRASES, PROFILE7, ProfileCard7, Pt, ResultsStack, Ribbon, RIBBON_TEXT, SITE, smoothPath, WebsiteCard, WordCounter, WrapBands} from '../props/Ep07Props';
import {Cam, OwnerAt, Studio, World} from './common';

// Idea → the name grows phrase by phrase → victory → the name pours out as a never-ending ribbon round the
// map cards and round him → Maps Assistant → "search results page" → "hostage situation" → caution →
// panic → (lesson) → clean name → forty-seven words → website copy, in actual sentences.

const OWN = {x: 300, y: 1380, w: 380};
const K = OWN.w / 400;
const PROF = {x: 560, y: 470};
const MAP_A = {x: 880, y: 760, w: 240, h: 170};
const MAP_B = {x: 640, y: 960, w: 220, h: 150};
const PIN = {x: 930, y: 1335, w: 210};
const TILE = {x: 930, y: 1352, size: 270};
const PILE = {x: 660, y: 1300};

const bump = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
const blink = (t: number, period: number, phase: number) => {
  const u = (t + phase) % period;
  return u < 0.13 ? 0.12 + 0.88 * Math.abs(u / 0.065 - 1) : 1;
};
const talking = (who: 'owner' | 'assistant', t: number, k = 1.6) => (speakerAt(t) === who ? Math.min(1, voice(t) * k) : 0);

// ---------------------------------------------------------------- the ribbon path (world space)
const RIB_PTS: Pt[] = [
  {x: 1030, y: 560},
  {x: 1070, y: 600},
  {x: 1072, y: 660},
  {x: 1036, y: 720}, // out of the swollen field, down the right side, behind map card A
  {x: 958, y: 806},
  {x: 836, y: 852},
  {x: 716, y: 884}, // over map card B
  {x: 628, y: 950},
  {x: 560, y: 1010},
  {x: 466, y: 1040},
  {x: 320, y: 1052}, // behind him (chest height)
  {x: 170, y: 1062},
  {x: 70, y: 1112},
  {x: 92, y: 1186}, // round his left side
  {x: 262, y: 1214},
  {x: 432, y: 1196}, // across his front, at the hips
  {x: 604, y: 1216},
  {x: 820, y: 1256},
  {x: 1300, y: 1280},
];
const RIB = smoothPath(RIB_PTS);
const lenTo = (k: number) => smoothPath(RIB_PTS.slice(0, k + 1)).len;
const L_CARDS = lenTo(8); // past both map cards
const ribbonReveal = (t: number) =>
  t < Q.ha + 0.3 ? 0 : t < Q.L04 ? lerp(0, L_CARDS, pr(t, Q.ha + 0.3, Q.L04 - Q.ha - 0.3, EZ.inOut)) : lerp(L_CARDS, RIB.len, pr(t, Q.L04 + 0.3, Q.screen - Q.L04, EZ.inOut));
// front-of-him region: the ribbon passes behind his chest and in front of his hips
const FRONT_CLIP = {x: 60, y: 1150, w: 470, h: 120};

// ---------------------------------------------------------------- owner
const ownerKeys = (t: number): OwnerPose => {
  const base: OwnerPose = {...OWNER_REST, smile: 0.75, brow: 0.4, eyes: 1.1, lookX: 0.6, lookY: -0.5, head: -2};
  return keyed(t, base, [
    // 01 · "I figured it out!" — eureka: one finger up, brows up, a little hop
    {t: Q.figured - 0.15, d: 0.3, e: EZ.back, ...armTo('R', {x: 366, y: 200}), pR: 1, brow: 1, eyes: 1.3, smile: 1, bob: -8},
    {t: Q.figured + 0.25, d: 0.25, e: EZ.inOut, bob: 0},
    {t: Q.keywords1 - 0.2, d: 0.35, e: EZ.inOut, lookX: 0.75, lookY: -0.75, head: -4},
    {t: Q.L01e + 0.05, d: 0.4, e: EZ.inOut, aRs: 10, aRe: 14, pR: 0},
    // 02 · pride: an open palm presents the field (approved palm-up), small nods on each phrase, "number one!" finger
    {t: Q.apex2 - 0.35, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26},
    {t: Q.apex2 - 0.1, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -64, wR: 4},
    {t: Q.apex2 + 0.02, d: 0.42, e: EZ.inOut, hR: 0.85},
    {t: Q.apex2 + 0.3, d: 0.34, e: EZ.back, aRs: 18, aRe: -80, wR: 12, hR: 1, smile: 0.9, brow: 0.7},
    {t: Q.best, d: 0.15, head: 4},
    {t: Q.best + 0.2, d: 0.2, head: -2},
    {t: Q.emergency, d: 0.15, head: 4, shrug: 0.12},
    {t: Q.emergency + 0.2, d: 0.2, head: -2, shrug: 0},
    {t: Q.p247, d: 0.15, head: 5},
    {t: Q.p247 + 0.2, d: 0.2, head: -2},
    {t: Q.cheap - 0.25, d: 0.4, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, hR: 0, head: 3},
    {t: Q.numberOne - 0.1, d: 0.3, e: EZ.back, ...armTo('R', {x: 366, y: 200}), pR: 1, brow: 1, eyes: 1.25, smile: 1},
    {t: Q.L02e + 0.1, d: 0.3, e: EZ.inOut, pR: 0},
    // 03 · "Ha! Try outranking THAT!" — double fist pump, chin up, crown
    {t: Q.ha - 0.08, d: 0.2, e: EZ.back, ...armTo('R', {x: 304, y: 298}), ...armTo('L', {x: 96, y: 298}), smile: 1, eyes: 1.2, bob: -10, head: -4},
    {t: Q.ha + 0.25, d: 0.25, e: EZ.inOut, bob: 0},
    {t: Q.outranking - 0.05, d: 0.14, e: EZ.out, bob: -9, ...armTo('R', {x: 306, y: 280}), ...armTo('L', {x: 94, y: 280})},
    {t: Q.outranking + 0.2, d: 0.25, e: EZ.inOut, bob: 0, ...armTo('R', {x: 304, y: 298}), ...armTo('L', {x: 96, y: 298})},
    {t: Q.L03e + 0.2, d: 0.5, e: EZ.inOut, aLs: 8, aLe: 10, aRs: 10, aRe: 14, lookX: 0.9, lookY: -0.4},
    // 04 · "Wait..." — the smile drops, eyes widen, his head follows the ribbon
    {t: Q.L04 - 0.15, d: 0.3, e: EZ.back, smile: -0.15, eyes: 1.35, brow: 1, head: 4},
    {t: Q.L04 + 0.4, d: 0.5, e: EZ.inOut, lookX: 0.9, lookY: 0.3, head: 6},
    {t: Q.L04 + 1.0, d: 0.5, e: EZ.inOut, lookX: 0.4, lookY: 0.8, head: 2},
    {t: Q.taking - 0.2, d: 0.5, e: EZ.inOut, lookX: -0.7, lookY: 0.6, head: -5, lean: -2},
    // (open palm questioning, left hand, relaxed elbow)
    {t: Q.taking - 0.35, d: 0.3, e: EZ.inOut, aLs: 6, aLe: 26},
    {t: Q.taking - 0.05, d: 0.42, e: EZ.inOut, aLs: 15, aLe: -64, wL: 4},
    {t: Q.taking + 0.07, d: 0.42, e: EZ.inOut, hL: 0.85},
    {t: Q.screen - 0.05, d: 0.34, e: EZ.back, aLs: 18, aLe: -80, wL: 12, hL: 1, lookX: 0.3, lookY: -0.2, head: 6, lean: 0},
    {t: Q.L04e + 0.3, d: 0.45, e: EZ.inOut, aLs: 8, aLe: 10, wL: 0, head: 3},
    {t: Q.L04e + 0.37, d: 0.4, e: EZ.inOut, hL: 0},
    // 05 · the Maps Assistant: he looks over, uneasy
    {t: Q.enter + 0.3, d: 0.4, e: EZ.inOut, lookX: 0.95, lookY: 0.1, smile: -0.1, eyes: 1.2, brow: 0.7},
    {t: Q.results, d: 0.4, lookX: 0.6, lookY: -0.6, eyes: 1.3},
    {t: Q.wrap + 0.2, d: 0.4, lookX: 0.7, lookY: -0.8},
    {t: Q.L07, d: 0.4, lookX: 0.95, lookY: 0.05, eyes: 1.15},
    {t: Q.risk - 0.2, d: 0.4, sweat: 0.7, smile: -0.35, brow: 0.9},
    // 06 · "SUSPENSION?!" — panic: wide eyes, a small step back, open hands at chest height
    {t: Q.L08 - 0.1, d: 0.3, e: EZ.back, eyes: 1.42, brow: 1, smile: -0.55, lean: -5, legL: -6, legR: 4, shrug: 0.45, ...armTo('L', {x: 116, y: 410}), ...armTo('R', {x: 284, y: 410}), hL: 0.85, hR: 0.85, lookX: 0.4, lookY: 0},
    {t: Q.L08e + 0.1, d: 0.5, e: EZ.inOut, lean: -2, shrug: 0.25},
    // 08 · back from the lesson: confused, then the forty-seven words, then embarrassment
    {t: Q.lessonOut - 0.2, d: 0.02, sweat: 0, smile: 0.1, brow: 0.6, eyes: 1.1, lean: 0, legL: 0, legR: 0, shrug: 0, aLs: 8, aLe: 10, aRs: 10, aRe: 14, hL: 0, hR: 0, lookX: 0.9, lookY: -0.2, head: 4},
    {t: Q.apex12 - 0.75, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26},
    {t: Q.apex12 - 0.45, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -64, wR: 4, head: 7},
    {t: Q.apex12 - 0.33, d: 0.42, e: EZ.inOut, hR: 0.85},
    {t: Q.apex12 - 0.05, d: 0.34, e: EZ.back, aRs: 18, aRe: -80, wR: 12, hR: 1, brow: 0.85},
    {t: Q.L12e + 0.05, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, head: 3},
    {t: Q.L12e + 0.12, d: 0.4, e: EZ.inOut, hR: 0},
    // the pile of discarded words
    {t: Q.L13 - 0.1, d: 0.5, e: EZ.inOut, lookX: 0.6, lookY: 0.85, head: 8, brow: 0.8, smile: -0.1},
    {t: Q.fortySeven - 0.4, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26},
    {t: Q.fortySeven - 0.15, d: 0.42, e: EZ.inOut, aRs: 14, aRe: -56, wR: 4},
    {t: Q.fortySeven - 0.03, d: 0.42, e: EZ.inOut, hR: 0.8},
    {t: Q.fortySeven + 0.25, d: 0.34, e: EZ.back, aRs: 16, aRe: -70, wR: 10, hR: 1},
    {t: Q.L13e + 0.05, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, lookX: 0.9, lookY: 0, head: 3},
    {t: Q.L13e + 0.12, d: 0.4, e: EZ.inOut, hR: 0},
    // the website copy: embarrassment (slight downward gaze, relaxed shoulders, minimal movement)
    {t: Q.site + 0.6, d: 0.5, e: EZ.inOut, lookX: 0.7, lookY: -0.4, head: 4},
    {t: Q.period - 0.1, d: 0.7, e: EZ.inOut, nod: 0.26, blush: 0.55, shrug: -0.2, smile: -0.05, lookX: 0.35, lookY: 0.5, eyes: 1.0, brow: 0.45},
  ]);
};
const feetShift = (p: OwnerPose) => {
  const a = (p.lean * Math.PI) / 180;
  return {dx: -230 * Math.sin(a) * K, dy: -230 * (1 - Math.cos(a)) * K};
};
const ownerPose = (t: number): OwnerPose => {
  const p = ownerKeys(t);
  if (t < Q.L04) p.bob += Math.sin(t * 2.1) * 1.4;
  p.mouth = talking('owner', t, 1.7);
  if (p.eyes > 0.5) p.eyes *= blink(t, 3.1, 0.7);
  p.legL -= p.lean;
  p.legR -= p.lean;
  return p;
};

// ---------------------------------------------------------------- Maps Assistant
const pinPose = (t: number): PinPose => {
  const p = keyed(t, {...PIN_REST, eyes: 0.05, lookX: -0.4}, [
    {t: Q.enter + 0.45, d: 0.25, eyes: 0.85, lookX: -0.45, lookY: -0.75}, // the enormous name
    {t: Q.enter + 1.0, d: 0.25, lookX: -1, lookY: 0, brow: 0.3}, // then him — and a pause
    {t: Q.L05, d: 0.3, eyes: 0.7, brow: 0.45},
    {t: Q.L06, d: 0.3, brow: 0.6, eyes: 0.6},
    {t: Q.L07, d: 0.3, brow: 0.3, eyes: 0.75},
    {t: Q.lessonOut - 0.2, d: 0.02, lookX: -1, lookY: 0, eyes: 0.75, brow: 0.2},
    // a small approving nod: "Apex Roofing"
    {t: Q.L12e - 0.1, d: 0.3, eyes: 0.5, brow: -0.2},
    {t: Q.L13, d: 0.3, eyes: 0.7, brow: 0.3},
    {t: Q.L14, d: 0.3, eyes: 0.6, brow: 0.55, lookX: -0.9},
    {t: Q.site + 0.4, d: 0.3, lookX: -0.6, lookY: -0.6},
    {t: Q.period + 0.2, d: 0.3, lookX: -1, lookY: 0},
  ]);
  p.talk = talking('assistant', t, 1.6);
  p.tilt = Math.sin(t * 1.3) * 2;
  p.squash = 1 - 0.06 * bump(t, Q.L12e - 0.05, 0.45);
  if (p.eyes > 0.4) p.eyes *= blink(t, 3.7, 1.9);
  return p;
};

// ---------------------------------------------------------------- camera
const camAt = (t: number): Cam => {
  const k = (a: number, d: number, e = EZ.inOut) => pr(t, a, d, e);
  let x = 500;
  let y = 720;
  let s = 1.0;
  const mv = (p: number, nx: number, ny: number, ns: number) => {
    x = lerp(x, nx, p);
    y = lerp(y, ny, p);
    s = lerp(s, ns, p);
  };
  mv(k(0.15, 0.6, EZ.out), 520, 680, 1.15); // quick push toward the name field
  mv(k(Q.numberOne - 0.3, 0.6), 540, 700, 1.06);
  mv(k(Q.ha - 0.1, 0.6), 540, 760, 0.98); // victory + crown, the ribbon begins
  mv(k(Q.L03e - 0.2, 0.9), 690, 830, 0.97); // follow the ribbon down past the map cards (his face stays in frame)
  mv(k(Q.L04 + 0.2, 0.9), 600, 960, 1.04);
  mv(k(Q.taking - 0.5, 0.8), 400, 1020, 1.02); // round him
  mv(k(Q.L04e + 0.05, 0.9), 600, 930, 0.93); // wide: the assistant arrives
  mv(k(Q.wrap - 0.2, 0.7), 590, 720, 1.02); // the trapped panel
  mv(k(Q.caution - 0.2, 0.7), 600, 760, 0.98);
  mv(k(Q.L08 - 0.2, 0.5), 440, 770, 1.05); // his panic (the card stays clear of the kicker)
  if (t > Q.lessonOut - 0.4) {
    x = 600;
    y = 860;
    s = 0.97;
    mv(k(Q.L13 - 0.2, 0.7), 620, 960, 1.04); // the pile
    mv(k(Q.site - 0.2, 0.8), 620, 860, 0.98);
  }
  return {x, y, s};
};

export const Set7: React.FC<{t: number; fade?: number}> = ({t, fade = 1}) => {
  const o = ownerPose(t);
  const pp = pinPose(t);
  const cam = camAt(t);
  const fs = feetShift(o);
  const late = t > Q.lessonOut - 0.4;

  // the name, phrase by phrase (typed as he says them)
  const phraseAt = [Q.best, Q.emergency, Q.p247, Q.cheap, Q.numberOne];
  let shown = 0;
  let typing = 0;
  phraseAt.forEach((a, i) => {
    if (t >= a) {
      shown = i + 1;
      typing = pr(t, a, 0.32, EZ.linear);
    }
  });
  const hi = pr(t, Q.keywords1, 0.3) * (1 - pr(t, Q.L03e, 0.6)) * 0.9 + 0.1 * pr(t, Q.keywords1, 0.3);
  const strain = Math.min(1, shown / 5) * (t < Q.L05 ? 1 : 0.3) * (late ? 0 : 1);
  const extraWords = Math.min(47, PHRASES.slice(0, shown).reduce((n, p) => n + p.split(' ').length, 0) + Math.round(38 * Math.min(1, ribbonReveal(t) / RIB.len)));
  const counterP = pr(t, Q.best, 0.3, EZ.back) * (1 - pr(t, Q.L05, 0.3)) * (late ? 0 : 1);

  // ribbon
  const reveal = ribbonReveal(t);
  const crawl = Math.max(0, t - Q.ha) * 70;
  const ribbonOut = pr(t, Q.results - 0.05, 0.3); // turns into result cards, then the wrap
  const ribbonO = 1 - ribbonOut;
  const resultsP = pr(t, Q.results, 0.6) * (1 - pr(t, Q.wrap - 0.1, 0.3, EZ.in));
  const wrapP = pr(t, Q.wrap, 0.7, EZ.out) * (late ? 0 : 1);
  const trapped = Math.sin(t * 13) * 1.6 * wrapP * (t < Q.caution ? 1 : 0.4);
  const cautionP = pr(t, Q.caution, 0.45, EZ.back) * (1 - pr(t, Q.L08 - 0.15, 0.3, EZ.in));
  const giant = bump(t, Q.L04 + 0.3, Q.L04e - Q.L04 + 0.6);

  // crown + idea bulb
  const head = toWorld(headPoint(o, {x: 200, y: 84}), OWN.x + fs.dx, OWN.y + fs.dy, OWN.w);
  const bulb = pr(t, Q.figured - 0.1, 0.35, EZ.back) * (1 - pr(t, Q.L01e + 0.2, 0.3, EZ.in));
  const crown = pr(t, Q.ha - 0.05, 0.35, EZ.back);
  const slip = pr(t, Q.L03e + 0.5, 1.4, EZ.inOut);
  const crownGone = pr(t, Q.taking - 0.3, 0.5, EZ.in);

  // map cards
  const mapsP = pr(t, Q.ha + 0.1, 0.5, EZ.back) * (1 - pr(t, Q.lessonIn - 0.4, 0.3, EZ.in)) * (late ? 0 : 1);

  // Maps Assistant (Episode 01 entrance)
  const tileIn = pr(t, Q.enter - 0.2, 0.45, EZ.out);
  const riseP = pr(t, Q.enter, 0.55, EZ.back);
  const hover = Math.sin(t * 2.2) * 6 * riseP;

  // the aftermath: clean card, the pile of 47 words, the website
  const clean = late ? 1 : 0;
  const profOut = pr(t, Q.L13 + 0.2, 0.6, EZ.inOut);
  const pileP = pr(t, Q.lessonOut - 0.1, 0.5, EZ.back) * (1 - pr(t, Q.site + 0.1, 0.5, EZ.in));
  const siteP = pr(t, Q.site + 0.2, 1.0, EZ.out);
  const periodP = pr(t, Q.period, 0.3, EZ.back);

  const pileWords = [...PHRASES, ...EXTRA.slice(0, 9)];

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Studio haloX={600} haloY={760} floorY={1300} />
      {/* the name, enormous, briefly filling the background */}
      {giant > 0.01 && (
        <AbsoluteFill style={{overflow: 'hidden', opacity: 0.14 * giant}}>
          {[0, 1, 2, 3].map((r) => (
            <div key={r} style={{position: 'absolute', left: -((t * 260 + r * 700) % 2600), top: 240 + r * 330, whiteSpace: 'nowrap', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 230, color: C.teal, letterSpacing: '-0.03em'}}>
              {(NAME + ' ' + PHRASES.join(' ') + ' ' + EXTRA.join(' ')).toUpperCase()}
            </div>
          ))}
        </AbsoluteFill>
      )}
      <World cam={cam}>
        {/* map card B sits under the ribbon */}
        {mapsP > 0.01 && (
          <Obj cx={MAP_B.x} cy={MAP_B.y} w={MAP_B.w} h={MAP_B.h} pose={{s: lerp(0.5, 1, mapsP), rz: -6, rx: 8, ry: Math.sin(t * 0.9) * 4}}>
            <div style={{opacity: Math.min(1, mapsP * 2)}}>
              <MapCard w={MAP_B.w} h={MAP_B.h} seed={1} />
            </div>
          </Obj>
        )}

        {/* the profile card */}
        {profOut < 1 && (
          <Obj cx={PROF.x} cy={PROF.y - profOut * 120} w={PROFILE7.w} h={PROFILE7.h} pose={{s: lerp(0.86, 1, pr(t, 0, 0.4)) * lerp(1, 0.7, profOut), rx: 3, rz: trapped, ry: Math.sin(t * 0.8) * 2}}>
            <div style={{opacity: (1 - profOut) * (1 - resultsP)}}>
              <ProfileCard7 shown={shown} typing={typing} hi={hi} strain={strain} t={t} clean={clean} />
              <WrapBands p={wrapP} w={PROFILE7.w} h={PROFILE7.h} />
            </div>
          </Obj>
        )}
        {counterP > 0.01 && (
          <div style={{position: 'absolute', left: PROF.x + 250, top: PROF.y - PROFILE7.h / 2 - 66}}>
            <WordCounter n={extraWords} p={counterP} />
          </div>
        )}

        {/* the ribbon: behind map card A and behind him */}
        <Ribbon id="ribBack" d={RIB.d} reveal={reveal} crawl={crawl} text={RIBBON_TEXT} opacity={ribbonO} />

        {/* map card A sits in front of the ribbon */}
        {mapsP > 0.01 && (
          <Obj cx={MAP_A.x} cy={MAP_A.y} w={MAP_A.w} h={MAP_A.h} pose={{s: lerp(0.5, 1, mapsP), rz: 7, rx: 8, ry: Math.sin(t * 0.8 + 1) * 4}}>
            <div style={{opacity: Math.min(1, mapsP * 2)}}>
              <MapCard w={MAP_A.w} h={MAP_A.h} />
            </div>
          </Obj>
        )}

        {/* Maps Assistant */}
        {tileIn > 0 && (
          <Obj cx={TILE.x} cy={TILE.y} w={TILE.size} h={TILE.size} pose={{rx: lerp(90, 66, tileIn), s: lerp(0.4, 1, tileIn)}}>
            <Card3D w={TILE.size} h={TILE.size} depth={20} step={4} radius={36} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={28} shadow={0.6} glow={`0 0 ${50 + 30 * riseP}px rgba(183,216,197,${0.3 * riseP})`}>
              <Neighborhood w={TILE.size} h={TILE.size} pins={0.4} ownPin={0} />
            </Card3D>
          </Obj>
        )}
        {riseP > 0 && riseP < 1 && <div style={{position: 'absolute', left: PIN.x - 105, top: PIN.y - 400, width: 210, height: 400, background: 'linear-gradient(0deg, rgba(183,216,197,0.55), rgba(183,216,197,0))', opacity: 1 - riseP, filter: 'blur(8px)'}} />}
        {riseP > 0 && (
          <div style={{position: 'absolute', left: PIN.x - PIN.w / 2, top: PIN.y - PIN.w * (388 / 300) - 34 * riseP + hover + (1 - riseP) * 150, transform: `scale(${riseP})`, transformOrigin: '50% 100%'}}>
            <Pin pose={pp} width={PIN.w} t={t} />
          </div>
        )}

        {/* the pile of discarded keyword cards */}
        {pileP > 0.01 &&
          pileWords.map((w, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const q = Math.max(0, Math.min(1, pileP * 3 - i * 0.12));
            const fly = pr(t, Q.site + 0.05 + i * 0.03, 0.5, EZ.in);
            return (
              <div key={w + i} style={{position: 'absolute', left: PILE.x - 230 + col * 92 + (row % 2) * 30, top: PILE.y - 70 - row * 40 - (1 - q) * 160 - fly * 420, transform: `rotate(${((i * 37) % 30) - 15}deg) scale(${0.62 * (1 - fly * 0.4)})`, transformOrigin: '50% 50%', opacity: q * (1 - fly)}}>
                <KeyChip label={w} tone={i < 5 ? 1 : 0} />
              </div>
            );
          })}

        <OwnerAt x={OWN.x + fs.dx} y={OWN.y + fs.dy} w={OWN.w} pose={o} />

        {/* the ribbon again, only where it crosses in front of his hips */}
        <Ribbon id="ribFront" d={RIB.d} reveal={reveal} crawl={crawl} text={RIBBON_TEXT} opacity={ribbonO} clip="url(#ribFrontClip)" />
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <defs>
            <clipPath id="ribFrontClip" clipPathUnits="userSpaceOnUse">
              <rect x={FRONT_CLIP.x} y={FRONT_CLIP.y} width={FRONT_CLIP.w} height={FRONT_CLIP.h} />
            </clipPath>
          </defs>
        </svg>

        {/* crown (slips sideways as the name takes over) + idea bulb */}
        {crown > 0.01 && crownGone < 1 && (
          <div style={{position: 'absolute', left: head.x - 52 + slip * 46, top: head.y - 79 - (1 - crown) * 60 + slip * 26 + crownGone * 120, transform: `scale(${crown}) rotate(${o.head * 0.8 + slip * 28}deg)`, transformOrigin: '50% 100%', opacity: 1 - crownGone}}>
            <Crown w={104} />
          </div>
        )}
        {bulb > 0.01 && (
          <div style={{position: 'absolute', left: head.x + 60, top: head.y - 150}}>
            <IdeaBulb p={bulb} t={t} />
          </div>
        )}

        {/* "an entire search results page" */}
        {resultsP > 0.01 && (
          <div style={{position: 'absolute', left: 600 - 320, top: 200}}>
            <ResultsStack p={resultsP} t={t} />
          </div>
        )}

        {/* caution card */}
        {cautionP > 0.01 && (
          <Obj cx={PROF.x} cy={PROF.y + 40} w={CAUTION.w} h={CAUTION.h} pose={{s: 0.92 * lerp(0.6, 1, cautionP), z: lerp(-300, 60, cautionP), rx: lerp(40, 4, cautionP), ry: Math.sin(t * 0.8) * 2}}>
            <div style={{opacity: Math.min(1, cautionP * 2)}}>
              <CautionCard rows={[pr(t, Q.unnecessary, 0.35, EZ.back), pr(t, Q.unnecessary + 0.9, 0.35, EZ.back), pr(t, Q.risk - 0.2, 0.35, EZ.back)]} />
            </div>
          </Obj>
        )}

        {/* the extra words, in actual sentences */}
        {siteP > 0.01 && (
          <Obj cx={700} cy={600} w={SITE.w} h={SITE.h} pose={{s: 0.88 * lerp(0.6, 1, siteP), z: lerp(-300, 0, siteP), rx: lerp(30, 3, siteP), ry: Math.sin(t * 0.7) * 2}}>
            <div style={{opacity: Math.min(1, siteP * 2)}}>
              <WebsiteCard p={siteP} period={periodP} t={t} />
            </div>
          </Obj>
        )}
      </World>

      {/* kickers */}
      <Kicker t={t} at={Q.keywords1 - 0.1} out={Q.L01e + 0.3} lines={[<span key="a">MORE <Hl>KEYWORDS!</Hl></span>]} size={96} top={200} />
      <Kicker t={t} at={Q.best} out={Q.emergency - 0.15} lines={[<Hl key="a">BEST BROOKLYN ROOFER!</Hl>]} size={70} top={200} />
      <Kicker t={t} at={Q.emergency} out={Q.p247 - 0.15} lines={[<Hl key="a">EMERGENCY ROOF REPAIRS!</Hl>]} size={66} top={200} />
      <Kicker t={t} at={Q.p247} out={Q.cheap - 0.15} lines={[<Hl key="a">24/7!</Hl>]} size={110} top={200} />
      <Kicker t={t} at={Q.cheap} out={Q.numberOne - 0.12} lines={[<Hl key="a">CHEAP!</Hl>]} size={110} top={200} />
      <Kicker t={t} at={Q.numberOne} out={Q.L02e + 0.35} lines={[<span key="a" style={{color: '#B5792C'}}>NUMBER ONE!</span>]} size={104} top={200} />
      {t > Q.L03e + 0.2 && t < Q.L04 + 1.2 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center', opacity: pr(t, Q.L03e + 0.25, 0.3, EZ.back) * (1 - pr(t, Q.L04 + 0.8, 0.3))}}>
          <div style={{padding: '12px 26px', borderRadius: 20, background: C.paper, boxShadow: '0 16px 32px -14px rgba(25,43,42,0.5), inset 0 0 0 3px rgba(211,155,79,0.6)', display: 'flex', alignItems: 'center', gap: 14, transform: `rotate(${Math.sin(t * 7) * 1.2}deg)`}}>
            <div style={{width: 38, height: 38, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, color: C.cream}}>!</div>
            <div style={{fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 34, color: C.charcoal}}>NAME TOO LONG TO BE REASONABLE</div>
          </div>
        </div>
      )}
      <Kicker t={t} at={Q.notA - 0.1} out={Q.results - 0.2} lines={[<span key="a">THAT&apos;S NOT A <Hl>BUSINESS NAME.</Hl></span>]} size={60} top={200} />
      <Kicker t={t} at={Q.real7 - 0.1} out={Q.caution - 0.1} lines={[<span key="a">USE YOUR <Hl>REAL</Hl></span>, <span key="b">BUSINESS NAME</span>]} size={82} top={200} />
      <Kicker t={t} at={Q.L08} out={Q.L08e + 0.35} lines={[<span key="a" style={{color: '#B5792C'}}>SUSPENSION?!</span>]} size={110} top={200} />
      <Kicker t={t} at={Q.fortySeven - 0.1} out={Q.L13e + 0.4} lines={[<span key="a">FORTY-SEVEN</span>, <Hl key="b">EXTRA WORDS?</Hl>]} size={86} top={200} />
    </AbsoluteFill>
  );
};
