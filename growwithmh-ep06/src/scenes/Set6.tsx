import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, keyed, lerp, pr, speakerAt, voice} from '../timing';
import {Bouquet, BOUQUET, OWNER_REST, OwnerPose} from '../chars/Owner';
import {Pin, PIN_REST, PinPose} from '../chars/Pin';
import {armTo, handAt, toWorld} from '../chars/rig';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Hl, Kicker} from '../components/Text';
import {Neighborhood, Txt} from '../props/Props';
import {COMPARE, FACTOR_TILE, FactorTile, GptGuest, Memorial, NEWS, NewsPanel, NewsPill, Petals, ReviewCompare, Vase} from '../props/Ep06Props';
import {Cam, OwnerAt, Studio, World} from './common';

// Review comparison → the owner's tiny "funeral" for his profile → flowers → Maps Assistant → reality
// check (map + factor cards) → (lesson) → hope → flower joke → quick SEO news with a silent guest cameo.

const OWN = {x0: 300, x1: 380, y: 1380, w: 380};
const K = OWN.w / 400; // owner viewBox → world
const PIN = {x: 960, y: 1335, w: 200};
const TILE = {x: 960, y: 1352, size: 260};
const PANEL = {x: 760, y: 450, s: 0.72}; // off to the right, so the opening close-up keeps him out of frame
const GUEST = {x0: 1440, x1: 1190, xOut: 1500, y: 1384, w: 200};

const bump = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
const blink = (t: number, period: number, phase: number) => {
  const u = (t + phase) % period;
  return u < 0.13 ? 0.12 + 0.88 * Math.abs(u / 0.065 - 1) : 1;
};
const talking = (who: 'owner' | 'assistant', t: number, k = 1.6) => (speakerAt(t) === who ? Math.min(1, voice(t) * k) : 0);

// ---------------------------------------------------------------- owner: where he stands
const STEP = {a: Q.goodbye + 0.1, d: 0.95};
const ownX = (t: number) => lerp(OWN.x0, OWN.x1, pr(t, STEP.a, STEP.d, EZ.inOut));

// the reach that lays the flowers down (body-local target, before the lean)
const REACH = {x: 372, y: 470};
const HOLD = {x: 300, y: 478};

const ownerKeys = (t: number): OwnerPose => {
  const base: OwnerPose = {...OWNER_REST, smile: 0.25, brow: 0.3, eyes: 1.05, lookX: 0.45, lookY: -0.75, head: -2};
  return keyed(t, base, [
    // 01 · the comparison: surprise on "hundred", shock on "five"
    {t: Q.hundred - 0.1, d: 0.3, e: EZ.back, brow: 0.9, eyes: 1.25, smile: 0, head: -4},
    {t: Q.five - 0.05, d: 0.28, e: EZ.back, eyes: 1.4, brow: 1, smile: -0.5, lean: -3, shrug: 0.45, ...armTo('L', {x: 112, y: 420}), ...armTo('R', {x: 288, y: 420}), hL: 0.8, hR: 0.8, lookX: 0.2, lookY: -0.2},
    {t: Q.five + 0.45, d: 0.4, e: EZ.inOut, lean: -1.5, shrug: 0.3},
    // 02 · "That's it. My business is officially DEAD!" — hand to his chest, head tipped back, eyes shut
    {t: Q.L02 + 0.1, d: 0.4, e: EZ.inOut, hL: 0, aLs: 8, aLe: 10, hR: 0, aRs: 8, aRe: 10, lean: 0, shrug: 0.1, smile: -0.6, brow: 0.8, eyes: 1.1, lookX: 0, lookY: 0},
    {t: Q.dead - 0.6, d: 0.4, e: EZ.inOut, ...armTo('R', {x: 224, y: 382}), hR: 0.6, head: -8, eyes: 0.7, lookY: -0.9, lookX: 0.1, sad: 1, smile: -0.85, lean: -3, brow: 0.6},
    {t: Q.L02e + 0.15, d: 0.5, e: EZ.inOut, aRs: 8, aRe: 10, hR: 0, wR: 0, head: 3, eyes: 0.85, lean: 0, brow: 0.3},
    // the funeral: slumped, grieving, tears
    {t: Q.funeral + 0.1, d: 0.9, e: EZ.inOut, shrug: -0.35, nod: 0.22, sad: 1, smile: -0.65, brow: 0.2, lookX: 0.55, lookY: 0.35},
    {t: Q.funeral + 0.75, d: 0.45, e: EZ.inOut, ...armTo('R', HOLD), bqTilt: 4},
    // 03 · two slow steps toward the memorial
    {t: STEP.a, d: STEP.d / 2, e: EZ.inOut, legL: 9, legR: -5},
    {t: STEP.a + STEP.d / 2, d: STEP.d / 2, e: EZ.inOut, legL: -4, legR: 8},
    {t: STEP.a + STEP.d, d: 0.3, e: EZ.inOut, legL: 0, legR: 0},
    // "You deserved better." — he bends and lays the flowers down (no kneel: a slow bow and reach)
    {t: Q.deserved - 0.35, d: 0.95, e: EZ.inOut, lean: 24, nod: 0.3, ...armTo('R', REACH), bqTilt: 9, lookX: 0.6, lookY: 0.8, head: 2},
    // release: the fist opens and the hand lifts away a little; then stillness
    {t: Q.release, d: 0.28, e: EZ.inOut, hR: 0.5, wR: 6},
    {t: Q.release + 0.05, d: 0.5, e: EZ.inOut, ...armTo('R', {x: REACH.x - 46, y: REACH.y - 40})},
    // he straightens slowly into a mourning stance (hands together, head bowed)
    {t: Q.release + 1.15, d: 0.9, e: EZ.inOut, lean: 5, nod: 0.32, ...armTo('L', {x: 188, y: 452}), ...armTo('R', {x: 212, y: 452}), hR: 0, wR: 0, hL: 0, lookX: 0.5, lookY: 0.55, head: 3},
    // 04 · the Maps Assistant: he looks over, still crying
    {t: Q.L04 + 0.3, d: 0.5, e: EZ.inOut, lookX: 0.95, lookY: 0.05, nod: 0.18, head: 4},
    // 05 · reality check: he slowly looks up; the crying begins to stop
    {t: Q.automatically - 0.2, d: 1.0, e: EZ.inOut, nod: 0.05, lookY: -0.15, eyes: 1.1, brow: 0.5, sad: 0.65, smile: -0.4, shrug: -0.15},
    // "Wait... reviews aren't the whole ranking?" — the approved palm-up question
    // (the left hand, opening away from the memorial)
    {t: Q.whole - 0.75, d: 0.3, e: EZ.inOut, aLs: 6, aLe: 26, aRs: 8, aRe: 10},
    {t: Q.whole - 0.45, d: 0.42, e: EZ.inOut, aLs: 15, aLe: -64, wL: 4, head: 4},
    {t: Q.whole - 0.33, d: 0.42, e: EZ.inOut, hL: 0.85},
    {t: Q.whole - 0.05, d: 0.34, e: EZ.back, aLs: 18, aLe: -80, wL: 12, hL: 1, head: 7, brow: 0.9, eyes: 1.2, sad: 0.4},
    {t: Q.L06e + 0.05, d: 0.45, e: EZ.inOut, aLs: 8, aLe: 10, wL: 0, head: 3, shrug: 0},
    {t: Q.L06e + 0.12, d: 0.4, e: EZ.inOut, hL: 0},
    // the factor cards: he looks up at them
    {t: Q.mapIn + 0.2, d: 0.5, e: EZ.inOut, lookX: 0.4, lookY: -0.7, head: -3, sad: 0.25, smile: -0.1},
    // 07 · hope: tears gone, shoulders natural, cautious optimism, hands together
    {t: Q.lessonOut - 0.2, d: 0.02, sad: 0.15, smile: 0.2, brow: 0.6, eyes: 1.1, nod: 0, shrug: 0, lean: 0, lookX: 0.9, lookY: 0, head: 4, ...armTo('L', {x: 190, y: 420}), ...armTo('R', {x: 210, y: 420})},
    {t: Q.chance - 0.15, d: 0.35, e: EZ.back, brow: 0.9, smile: 0.35, head: 7, bob: -4},
    {t: Q.chance + 0.25, d: 0.3, e: EZ.inOut, bob: 0},
    {t: Q.L11 + 0.4, d: 0.5, e: EZ.inOut, smile: 0.55, sad: 0, brow: 0.5, ...armTo('L', {x: 188, y: 452}), ...armTo('R', {x: 212, y: 452})},
    // "So... should I take the flowers back?" — embarrassed glance at the bouquet, small palm toward it
    {t: Q.L12 - 0.2, d: 0.5, e: EZ.inOut, lookX: 0.65, lookY: 0.55, head: 6, blush: 0.55, smile: -0.05, brow: 0.7},
    {t: Q.flowers12 - 0.55, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26},
    {t: Q.flowers12 - 0.3, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -60, wR: 4},
    {t: Q.flowers12 - 0.18, d: 0.42, e: EZ.inOut, hR: 0.8},
    {t: Q.flowers12 + 0.08, d: 0.34, e: EZ.back, aRs: 17, aRe: -76, wR: 10, hR: 1},
    {t: Q.L12e + 0.1, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, lookX: 0.9, lookY: 0},
    {t: Q.L12e + 0.15, d: 0.4, e: EZ.inOut, hR: 0},
    // the flowers become office decor: an awkward smile
    {t: Q.office + 0.15, d: 0.5, e: EZ.inOut, smile: 0.6, blush: 0.35, brow: 0.75, lookX: 0.6, lookY: 0.4, eyes: 1.1},
    {t: Q.office + 1.0, d: 0.4, e: EZ.inOut, lookX: 0.2, lookY: 0, head: 2},
    // 08 · news: he looks to the assistant, then the guest arrives
    {t: Q.L14 + 0.2, d: 0.4, e: EZ.inOut, lookX: 0.95, lookY: 0, blush: 0, smile: 0.45},
    {t: Q.gptIn + 0.5, d: 0.35, e: EZ.back, eyes: 1.3, brow: 1, smile: 0.6},
  ]);
};

const crying = (t: number) => pr(t, Q.funeral + 0.3, 1.2, EZ.inOut) * (1 - 0.45 * pr(t, Q.automatically, 1.6, EZ.inOut)) * (1 - pr(t, Q.L06 + 0.6, 1.6, EZ.inOut));
// "dramatic stillness" after the flowers are laid: the sobbing motion stops, tears keep falling
const still = (t: number) => pr(t, Q.release + 0.15, 0.2) * (1 - pr(t, Q.release + 1.15, 0.5));

export const ownerPose = (t: number): OwnerPose => {
  const p = ownerKeys(t);
  const cry = crying(t);
  p.cry = cry;
  p.tearT = t;
  // the bouquet: appears in his hand as the funeral set assembles, leaves it on release
  p.bq = t >= Q.funeral + 0.8 && t < Q.release ? 1 : 0;
  // sobbing: small shoulder hitches and a trembling lower lip, scaled down during the stillness
  const sobK = cry * (1 - still(t)) * (speakerAt(t) === 'owner' ? 0.6 : 1);
  p.shrug += Math.max(0, Math.sin(t * 3.9)) ** 3 * 0.09 * sobK;
  p.bob += Math.sin(t * 7.8) * 1.1 * sobK;
  p.smile += Math.sin(t * 27) * 0.05 * cry;
  // walking: a little bob per step
  p.bob += -Math.abs(Math.sin(((t - STEP.a) / STEP.d) * Math.PI * 2)) * 4 * bump(t, STEP.a, STEP.d);
  if (t < Q.funeral) p.bob += Math.sin(t * 2.1) * 1.4;
  p.mouth = talking('owner', t, 1.7);
  if (cry > 0.3 && p.mouth < 0.05) p.mouth = 0;
  if (p.eyes > 0.5) p.eyes *= blink(t, 3.1, 0.7);
  // bend at the hips: the legs stay vertical while the upper body leans (see feetShift)
  p.legL -= p.lean;
  p.legR -= p.lean;
  return p;
};
/** World offset that keeps the feet planted when the body leans about the hips (hip 230 units above the feet). */
const feetShift = (p: OwnerPose) => {
  const a = (p.lean * Math.PI) / 180;
  return {dx: -230 * Math.sin(a) * K, dy: -230 * (1 - Math.cos(a)) * K};
};

// where the flowers end up: exactly where his hand let go (computed once from the release pose)
const RP = ownerPose(Q.release - 1 / 60);
const BQ = (() => {
  const fs = feetShift(RP);
  const h = toWorld(handAt(RP, 'R'), ownX(Q.release) + fs.dx, OWN.y + fs.dy, OWN.w);
  const a = (RP.bqTilt * Math.PI) / 180;
  const stem = {x: h.x - Math.sin(a) * BOUQUET.bottom * K, y: h.y + Math.cos(a) * BOUQUET.bottom * K};
  return {x: h.x, y: h.y, tilt: RP.bqTilt, stem};
})();
const PLINTH = {x: BQ.stem.x - 70, y: BQ.stem.y, w: 300, h: OWN.y + 6 - BQ.stem.y};

// ---------------------------------------------------------------- Maps Assistant
const pinPose = (t: number): PinPose => {
  const p = keyed(t, {...PIN_REST, eyes: 0.05, lookX: -0.4, glow: 0.3}, [
    {t: Q.enter + 0.6, d: 0.35, eyes: 0.8, lookX: -0.3, lookY: -0.2},
    // it notices: the tombstone, the bouquet, the crying owner (a beat each), then a 0.5 s pause
    {t: Q.enter + 1.05, d: 0.25, lookX: -0.55, lookY: -0.45},
    {t: Q.enter + 1.45, d: 0.25, lookX: -0.75, lookY: 0.45},
    {t: Q.enter + 1.85, d: 0.25, lookX: -1, lookY: 0, brow: 0.35},
    {t: Q.L04, d: 0.3, eyes: 0.7, brow: 0.5},
    {t: Q.mapIn + 0.2, d: 0.3, lookX: -0.4, lookY: -0.7, brow: 0.2},
    {t: Q.lessonOut - 0.2, d: 0.02, lookX: -1, lookY: 0, eyes: 0.75, brow: 0.3},
    {t: Q.L11, d: 0.3, brow: 0.65, eyes: 0.6},
    {t: Q.L13, d: 0.3, brow: 0.85, eyes: 0.55, lookX: -0.9},
    {t: Q.office + 0.3, d: 0.3, lookX: -0.75, lookY: 0.4},
    // "Oh, and here's some quick SEO news!" — eyes brighten, turns to the audience
    {t: Q.L14 - 0.1, d: 0.25, e: EZ.back, eyes: 1.05, brow: -0.1, glow: 1, lookX: 0, lookY: 0},
    {t: Q.gptIn + 0.6, d: 0.3, lookX: 0.8, lookY: 0},
    {t: Q.L16, d: 0.3, lookX: 0, lookY: 0, eyes: 0.95},
    {t: Q.gptOut + 0.2, d: 0.3, lookX: 0.8},
  ]);
  p.talk = talking('assistant', t, 1.6);
  p.tilt = Math.sin(t * 1.3) * 2;
  if (p.eyes > 0.4) p.eyes *= blink(t, 3.7, 1.9);
  return p;
};

// ---------------------------------------------------------------- camera
const camAt = (t: number): Cam => {
  const k = (a: number, d: number, e = EZ.inOut) => pr(t, a, d, e);
  let x = PANEL.x;
  let y = PANEL.y + 10;
  let s = lerp(1.55, 1.65, k(0, 3, EZ.linear)); // close on the two counts
  const mv = (p: number, nx: number, ny: number, ns: number) => {
    x = lerp(x, nx, p);
    y = lerp(y, ny, p);
    s = lerp(s, ns, p);
  };
  // reveal the owner under the panel: he rises in at the left edge (clear of the centred caption box),
  // then the camera settles on him as the 5 lands
  mv(k(Q.five - 0.75, 0.7), 760, 860, 0.95);
  mv(k(Q.five + 0.0, 0.4, EZ.inOut), 560, 860, 0.99);
  mv(k(Q.L02 - 0.1, 0.7), 540, 900, 1.0);
  mv(k(Q.funeral, 1.0), 570, 1010, 1.0); // the tiny funeral
  mv(k(Q.goodbye, 1.4), 560, 1030, 1.08);
  mv(k(Q.deserved - 0.4, 1.0), 540, 1060, 1.18); // the flowers going down
  mv(k(Q.enter - 0.1, 1.2), 680, 1000, 0.96); // wide: the assistant arrives
  mv(k(Q.L05 - 0.2, 0.8), 640, 1000, 1.0);
  mv(k(Q.L06 - 0.2, 0.7), 520, 960, 1.08);
  mv(k(Q.mapIn, 0.8), 560, 890, 0.92); // map + factor cards
  if (t > Q.lessonOut - 0.4) {
    x = 640;
    y = 990;
    s = 1.0;
    mv(k(Q.L12 - 0.3, 0.8), BQ.x + 10, BQ.y - 40, 1.28); // the same flowers
    mv(k(Q.L13 - 0.2, 0.7), 650, 1000, 1.02);
    mv(k(Q.L14 - 0.2, 0.9), 820, 900, 0.95); // news: the assistant + room for the guest
  }
  return {x, y, s};
};

export const Set6: React.FC<{t: number; fade?: number}> = ({t, fade = 1}) => {
  const o = ownerPose(t);
  const pp = pinPose(t);
  const cam = camAt(t);
  const fs = feetShift(o);
  const ox = ownX(t) + fs.dx;

  // comparison panel → flies into the memorial frame at the funeral
  const panelIn = pr(t, 0, 0.35, EZ.out);
  const n100 = Math.min(100, Math.round(100 * pr(t, Q.L01 + 0.1, Q.hundred - Q.L01 + 0.1, EZ.out)));
  const five = pr(t, Q.five - 0.05, 0.25, EZ.back);
  const shake = Math.sin(t * 60) * 7 * bump(t, Q.five, 0.4);
  const fly = pr(t, Q.dead + 0.05, 1.15, EZ.inOut); // into the memorial's picture frame
  const frame = {x: PLINTH.x + PLINTH.w * 0.55, y: PLINTH.y - 236 + 14 + 75};

  // lighting
  const funeralP = pr(t, Q.funeral, 0.9, EZ.inOut) * (1 - pr(t, Q.mapIn, 0.9, EZ.inOut));
  const memIn = pr(t, Q.funeral + 0.2, 0.6, EZ.back);
  const stone = memIn * (1 - pr(t, Q.mapIn + 0.1, 0.7, EZ.inOut));
  const mapP = pr(t, Q.mapIn, 0.9, EZ.inOut) * (1 - pr(t, Q.lessonOut, 0.6, EZ.inOut));
  const officeP = pr(t, Q.office, 0.6, EZ.back);
  const warm = pr(t, Q.office + 0.1, 0.8, EZ.inOut);

  // bouquet on the memorial (after release) — the vase lifts it upright at the office beat
  const bqWorld = t >= Q.release;
  const toVase = pr(t, Q.office, 0.55, EZ.back);
  const VASE_W = 76;
  const bqX = lerp(BQ.x, BQ.stem.x, toVase);
  const bqY = lerp(BQ.y, PLINTH.y - 88 * K + (-BOUQUET.bottom + 30) * K, toVase);
  const bqTilt = lerp(BQ.tilt, 0, toVase);

  // Maps Assistant: a quiet entrance (no light column)
  const tileIn = pr(t, Q.enter - 0.15, 0.6, EZ.out);
  const riseP = pr(t, Q.enter + 0.05, 0.75, EZ.soft);
  const hover = Math.sin(t * 2.2) * 5 * riseP;

  // factor cards
  const factorAt = [Q.relevance, Q.distance, Q.prominence];
  const factorsOut = pr(t, Q.lessonIn - 0.3, 0.3, EZ.in);

  // news + guest
  const newsP = pr(t, Q.L14, 0.4, EZ.back) * (1 - pr(t, Q.outro - 0.2, 0.3, EZ.in));
  const panelNews = pr(t, Q.november - 0.25, 0.5, EZ.back) * (1 - pr(t, Q.outro - 0.25, 0.3, EZ.in));
  const gIn = pr(t, Q.gptIn, 1.15, EZ.out);
  const gOut = pr(t, Q.gptOut, 1.0, EZ.in);
  const gx = lerp(lerp(GUEST.x0, GUEST.x1, gIn), GUEST.xOut, gOut);
  const walking = (t > Q.gptIn && t < Q.gptIn + 1.15) || (t > Q.gptOut && t < Q.gptOut + 1.0);
  const stride = walking ? 1 - Math.max(pr(t, Q.gptIn + 0.85, 0.3), 0) * (t < Q.gptOut ? 1 : 0) : 0;
  const hop = Math.abs(Math.sin((t - Q.gptIn) * 9)) * 8 * (walking ? 1 : 0) + bump(t, Q.gptIn, 0.35) * 18;
  const waveP = pr(t, Q.openai - 0.25, 0.35, EZ.inOut) * (1 - pr(t, Q.beta - 0.1, 0.4, EZ.inOut));
  const waveT = Math.max(0, t - (Q.openai - 0.1));

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Studio haloX={640} haloY={820} floorY={1300} />
      {/* local-search map wall (reality check) */}
      {mapP > 0.01 && (
        <AbsoluteFill style={{opacity: mapP}}>
          <MapWall t={t} />
        </AbsoluteFill>
      )}
      {/* warm office light after the flower joke */}
      {warm > 0 && <AbsoluteFill style={{background: `radial-gradient(900px 700px at 640px 900px, rgba(243,227,200,${0.55 * warm}), rgba(243,227,200,0) 75%)`}} />}

      <World cam={cam}>
        {/* the comparison panel */}
        {fly < 1 && (
          <Obj cx={lerp(PANEL.x, frame.x, fly)} cy={lerp(PANEL.y, frame.y, fly)} w={COMPARE.w} h={COMPARE.h} pose={{s: lerp(PANEL.s * lerp(0.7, 1, panelIn), 0.12, fly), rx: lerp(10, 2, panelIn), ry: Math.sin(t * 0.8) * 2.5, z: lerp(-200, 0, panelIn)}}>
            <div style={{opacity: 1 - pr(t, Q.funeral + 0.45, 0.3)}}>
              <ReviewCompare n100={n100} five={five} shake={shake} />
            </div>
          </Obj>
        )}

        {/* memorial (plinth + tombstone) */}
        {memIn > 0.01 && (
          <div style={{position: 'absolute', left: PLINTH.x, top: PLINTH.y + (1 - memIn) * 60, opacity: Math.min(1, memIn * 1.5)}}>
            <Memorial w={PLINTH.w} h={PLINTH.h} stone={stone} office={officeP} t={t} />
          </div>
        )}

        {/* Maps Assistant tile (quiet entrance) */}
        {tileIn > 0 && (
          <Obj cx={TILE.x} cy={TILE.y} w={TILE.size} h={TILE.size} pose={{rx: lerp(90, 66, tileIn), s: lerp(0.6, 1, tileIn)}}>
            <Card3D w={TILE.size} h={TILE.size} depth={18} step={4} radius={34} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={26} shadow={0.6}>
              <Neighborhood w={TILE.size} h={TILE.size} pins={0.4} ownPin={0} />
            </Card3D>
          </Obj>
        )}
        {riseP > 0 && (
          <div style={{position: 'absolute', left: PIN.x - PIN.w / 2, top: PIN.y - PIN.w * (388 / 300) - 30 * riseP + hover + (1 - riseP) * 120, transform: `scale(${lerp(0.5, 1, riseP)})`, transformOrigin: '50% 100%', opacity: Math.min(1, riseP * 2)}}>
            <Pin pose={pp} width={PIN.w} t={t} />
          </div>
        )}

        {/* the flowers, resting where his hand let go (then in a vase) */}
        {bqWorld && (
          <>
            {toVase > 0 && (
              <div style={{position: 'absolute', left: BQ.stem.x - VASE_W / 2, top: PLINTH.y - VASE_W * 1.1}}>
                <Vase w={VASE_W} p={toVase} />
              </div>
            )}
            <svg width={400} height={400} viewBox="-200 -200 400 400" style={{position: 'absolute', left: bqX - 200, top: bqY - 200, overflow: 'visible', transform: `scale(${K})`, transformOrigin: '200px 200px'}}>
              <g transform={`rotate(${bqTilt})`}>
                <Bouquet cheer={toVase} />
              </g>
            </svg>
          </>
        )}

        <OwnerAt x={ox} y={OWN.y + fs.dy} w={OWN.w} pose={o} />

        {/* the guest cameo */}
        {t > Q.gptIn - 0.05 && gOut < 1 && (
          <div style={{position: 'absolute', left: gx - GUEST.w / 2, top: GUEST.y - (410 * GUEST.w) / 300 - hop}}>
            <div style={{position: 'absolute', left: GUEST.w * 0.1, top: (410 * GUEST.w) / 300 - 6 + hop, width: GUEST.w * 0.8, height: 22, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(25,43,42,0.28), rgba(25,43,42,0))'}} />
            <GptGuest w={GUEST.w} walk={(t - Q.gptIn) * 9} stride={stride} wave={waveP} waveT={waveT} />
            <div style={{position: 'absolute', left: -40, right: -40, top: (420 * GUEST.w) / 300 + 8 + hop, display: 'flex', justifyContent: 'center', opacity: pr(t, Q.gptIn + 0.9, 0.3) * (1 - pr(t, Q.gptOut, 0.2))}}>
              <div style={{padding: '3px 10px', borderRadius: 999, background: 'rgba(25,43,42,0.72)'}}>
                <Txt size={14} weight={700} color={C.cream} style={{letterSpacing: '0.08em', whiteSpace: 'nowrap'}}>
                  UNOFFICIAL CAMEO
                </Txt>
              </div>
            </div>
          </div>
        )}

        {/* falling petals + subdued funeral light around a soft pool on the memorial */}
        {funeralP > 0.01 && (
          <>
            <div style={{position: 'absolute', left: 120, top: 560}}>
              <Petals t={t} o={funeralP} w={900} h={800} />
            </div>
            {/* (the funeral light is drawn in screen space below) */}
          </>
        )}

        {/* relevance / distance / prominence */}
        {t > Q.relevance - 0.3 && factorsOut < 1 &&
          factorAt.map((at, i) => {
            const p = pr(t, at - 0.15, 0.45, EZ.back);
            if (p <= 0) return null;
            return (
              <Obj key={i} cx={195 + i * 345} cy={480} w={FACTOR_TILE.w} h={FACTOR_TILE.h} pose={{s: lerp(0.6, 1, p), z: lerp(-300, 0, p), rx: lerp(50, 4, p), ry: Math.sin(t * 0.8 + i) * 3, y: factorsOut * -60}}>
                <div style={{opacity: Math.min(1, p * 2) * (1 - factorsOut)}}>
                  <FactorTile i={i} p={pr(t, at + 0.1, 0.6)} />
                </div>
              </Obj>
            );
          })}

        {/* quick SEO news */}
        {panelNews > 0.01 && (
          <Obj cx={820} cy={560} w={NEWS.w} h={NEWS.h} pose={{s: 0.86 * lerp(0.6, 1, panelNews), z: lerp(-300, 0, panelNews), rx: lerp(40, 3, panelNews), ry: Math.sin(t * 0.7) * 2}}>
            <div style={{opacity: Math.min(1, panelNews * 2)}}>
              <NewsPanel date={pr(t, Q.november, 0.4, EZ.back)} title={pr(t, Q.businesses15 - 0.05, 0.4, EZ.back)} beta={pr(t, Q.beta - 0.05, 0.35, EZ.back)} steps={[pr(t, Q.claim, 0.4, EZ.back), pr(t, Q.verification, 0.4, EZ.back), pr(t, Q.update, 0.4, EZ.back)]} notes={pr(t, Q.update + 0.5, 0.5)} />
            </div>
          </Obj>
        )}
      </World>

      {funeralP > 0.01 && (() => {
        const sx = 540 + (PLINTH.x + 60 - cam.x) * cam.s;
        const sy = 960 + (PLINTH.y - 170 - cam.y) * cam.s;
        return <AbsoluteFill style={{background: `radial-gradient(${560 * cam.s}px ${640 * cam.s}px at ${sx}px ${sy}px, rgba(16,34,40,0), rgba(16,34,40,${0.4 * funeralP}) 72%)`, pointerEvents: 'none'}} />;
      })()}
      {/* kickers */}
      <Kicker t={t} at={Q.hundred} out={Q.five - 0.15} lines={[<Hl key="a">100 REVIEWS?!</Hl>]} size={96} top={200} />
      <Kicker t={t} at={Q.five} out={Q.L02 - 0.1} lines={[<span key="a">I HAVE <span style={{color: '#B5792C'}}>FIVE!</span></span>]} size={96} top={200} />
      <Kicker t={t} at={Q.dead - 0.05} out={Q.funeral + 0.6} lines={[<span key="a">MY BUSINESS <Hl>IS DEAD!</Hl></span>]} size={74} top={200} />
      <Kicker t={t} at={Q.funeral + 0.85} out={Q.L03 + 0.9} lines={[<span key="a">RIP <Hl>MY GBP</Hl></span>]} size={92} />
      <Kicker t={t} at={Q.automatically} out={Q.L05e + 0.5} lines={[<span key="a">REVIEWS AREN&apos;T</span>, <Hl key="b">EVERYTHING</Hl>]} size={86} />
      <Kicker t={t} at={Q.keep13} out={Q.L13e + 0.9} lines={[<span key="a">KEEP THE <Hl>FLOWERS.</Hl></span>]} size={92} />
      {newsP > 0.01 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 268, display: 'flex', justifyContent: 'center'}}>
          <NewsPill p={newsP} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Light local-search map behind the set: soft streets, a river, markers dropping in. */
const MapWall: React.FC<{t: number}> = ({t}) => {
  const pins = [
    {x: 180, y: 520, d: 0},
    {x: 420, y: 380, d: 0.15},
    {x: 700, y: 460, d: 0.3},
    {x: 900, y: 330, d: 0.45},
    {x: 300, y: 820, d: 0.6},
    {x: 820, y: 760, d: 0.75},
  ];
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <rect width={1080} height={1920} fill="#F2F0E8" />
      {[160, 340, 560, 760, 980, 1180].map((y) => (
        <path key={y} d={`M-20 ${y} H1100`} stroke="#FFFFFF" strokeWidth={26} />
      ))}
      {[120, 330, 560, 790, 980].map((x) => (
        <path key={x} d={`M${x} -20 V1300`} stroke="#FFFFFF" strokeWidth={22} />
      ))}
      <path d="M-20 1060 C 220 980, 420 1120, 640 1040 S 980 960, 1100 1000" stroke="#B9DCD6" strokeWidth={60} fill="none" />
      <rect x={600} y={180} width={160} height={120} rx={20} fill="#DDEDE3" />
      <rect x={160} y={600} width={140} height={140} rx={20} fill="#DDEDE3" />
      {pins.map((p, i) => {
        const a = Math.max(0, Math.min(1, (t - (Q.mapIn + 0.3 + p.d)) / 0.35));
        return (
          <g key={i} transform={`translate(${p.x} ${p.y - (1 - a) * 60})`} opacity={a * 0.85}>
            <path d="M0 10 C -14 -6, -20 -18, -20 -30 A20 20 0 1 1 20 -30 C 20 -18, 14 -6, 0 10 Z" fill={i % 2 ? C.tealBright : '#9FBDB5'} />
            <circle cy={-30} r={7} fill="#FFFFFF" />
          </g>
        );
      })}
      <rect width={1080} height={1920} fill="url(#mwFade)" />
      <defs>
        <linearGradient id="mwFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#FBFAF6" stopOpacity={0} />
          <stop offset="0.72" stopColor="#FBFAF6" stopOpacity={0.9} />
        </linearGradient>
      </defs>
    </svg>
  );
};
