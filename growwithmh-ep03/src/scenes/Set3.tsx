import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, keyed, lerp, pr, speakerAt, voice} from '../timing';
import {OWNER_REST, OwnerPose} from '../chars/Owner';
import {Pin, PIN_REST, PinPose} from '../chars/Pin';
import {armTo, bodyPoint, headPoint, toWorld} from '../chars/rig';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Hl, Kicker} from '../components/Text';
import {Neighborhood} from '../props/Props';
import {AreaList, Cape, Crown, LIST, NYC, NycMap, PANEL, Portal, SavedBadge, ServiceAreaPanel, Spotlight, ThumbIcon} from '../props/Ep03Props';
import {Cam, OwnerAt, Studio, World} from './common';

// SEQUENCES A–D and F share one set: the owner on the left, the Maps Assistant's tile on the right.
// Every pose is keyed to the voiceover's word timings (src/cues.json).

export const OWN = {x: 330, y: 1380, w: 380};
const PIN = {x: 800, y: 1330, w: 240};
const TILE = {x: 800, y: 1350, size: 380};
const FLOOR = 1392;

const bump = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
const blink = (t: number, period: number, phase: number) => {
  const u = (t + phase) % period;
  return u < 0.13 ? 0.12 + 0.88 * Math.abs(u / 0.065 - 1) : 1;
};
const talking = (who: 'owner' | 'assistant', t: number, k = 1.6) => (speakerAt(t) === who ? Math.min(1, voice(t) * k) : 0);
const frozenAt = (t: number) => pr(t, Q.freeze, 0.05); // the fantasy stops dead when the assistant appears

// ---------------------------------------------------------------- owner performance
const FIST_UP = {x: 304, y: 298}; // small celebratory fist, elbow down by the torso
const ownerPose = (t: number): OwnerPose => {
  const base: OwnerPose = {...OWNER_REST, smile: 0.75, brow: 0.6, eyes: 1.15, lookX: 0.35, lookY: -0.1, head: 3, ...armTo('R', FIST_UP)};
  const p = keyed(t, base, [
    // A · "I did it!" — two small fist pumps
    {t: Q.L01 + 0.02, d: 0.14, e: EZ.out, bob: -9, ...armTo('R', {x: 306, y: 282})},
    {t: Q.L01 + 0.2, d: 0.2, e: EZ.inOut, bob: 0, ...armTo('R', FIST_UP)},
    {t: Q.didIt - 0.05, d: 0.14, e: EZ.out, bob: -10, ...armTo('R', {x: 306, y: 280})},
    {t: Q.didIt + 0.15, d: 0.25, e: EZ.inOut, bob: 0, ...armTo('R', FIST_UP)},
    // turns to the panel as it fills
    {t: Q.added - 0.15, d: 0.45, e: EZ.inOut, aRs: 10, aRe: 14, lookX: 0.85, lookY: -0.25, head: 5, brow: 0.8},
    {t: Q.twenty1 + 0.1, d: 0.3, eyes: 1.3, smile: 0.9},
    {t: Q.profile1 - 0.05, d: 0.2, e: EZ.back, shrug: 0.3, bob: -6},
    {t: Q.profile1 + 0.25, d: 0.3, e: EZ.inOut, shrug: 0, bob: 0},
    // B · reads the boroughs off the map, then the power pose: hands on hips, chin up
    {t: Q.brooklyn - 0.2, d: 0.4, e: EZ.inOut, lookX: 0.55, lookY: -0.75, head: 2},
    {t: Q.queens - 0.05, d: 0.25, e: EZ.inOut, head: -3},
    {t: Q.manhattan - 0.05, d: 0.25, e: EZ.inOut, head: 3},
    {t: Q.takingOver - 0.2, d: 0.5, e: EZ.inOut, ...armTo('L', {x: 110, y: 446}), ...armTo('R', {x: 290, y: 446}), lean: -2, head: -5, lookX: 0.1, lookY: -0.2, smile: 0.95, brow: 0.45, shrug: 0.15, eyes: 1.05},
    {t: Q.newYork, d: 0.35, e: EZ.inOut, head: -7, lookY: -0.3, eyes: 0.95},
    // C · the fantasy freezes; his eyes slide to the assistant as it rises
    {t: Q.rise + 0.35, d: 0.4, e: EZ.inOut, lookX: 0.9, lookY: 0, eyes: 1.25, smile: 0.35, brow: 0.9, head: 0},
    {t: Q.congrats + 0.2, d: 0.5, e: EZ.inOut, aLs: 9, aLe: 12, aRs: 10, aRe: 14, lean: 0, shrug: 0, smile: 0.2},
    {t: Q.list, d: 0.4, smile: -0.05, brow: 0.45, eyes: 1.1},
    // "Wait, so I'll rank number one in all 20?" — one open palm, elbow by the torso, peak on "all 20?"
    {t: Q.L04, d: 0.25, e: EZ.out, lean: 1.5, brow: 0.9, eyes: 1.2},
    {t: Q.rank4 - 0.75, d: 0.3, e: EZ.inOut, aRs: 6, aRe: 26, head: 1},
    {t: Q.rank4 - 0.45, d: 0.42, e: EZ.inOut, aRs: 15, aRe: -64, wR: 4, head: 5, brow: 0.8},
    {t: Q.rank4 - 0.33, d: 0.42, e: EZ.inOut, hR: 0.85},
    {t: Q.all20 - 0.05, d: 0.34, e: EZ.back, aRs: 18, aRe: -82, wR: 12, hR: 1, head: 8, lean: 1.5, brow: 1, eyes: 1.15, smile: 0.25},
    {t: Q.L04e + 0.1, d: 0.4, e: EZ.inOut, aRs: 10, aRe: 14, wR: 0, head: 3, lean: 0},
    {t: Q.L04e + 0.16, d: 0.4, e: EZ.inOut, hR: 0},
    // the portal: eyes light up, he steps toward it, then it collapses
    {t: Q.teleport, d: 0.35, lookX: 0.6, lookY: 0.15, eyes: 1.3, smile: 0.6, brow: 1},
    {t: Q.portalTry, d: 0.4, e: EZ.inOut, lean: 5, legR: -9, ...armTo('R', {x: 300, y: 405}), ...armTo('L', {x: 150, y: 430})},
    {t: Q.portalPop, d: 0.3, e: EZ.out, lean: -1, legR: 0, eyes: 1.35, smile: -0.25, brow: 0.7, aLs: 9, aLe: 12, aRs: 10, aRe: 14},
    // D · "But I clicked save!" — brief lean in, points at the SAVED confirmation
    {t: Q.L06 - 0.24, d: 0.42, e: EZ.inOut, lean: 3, angry: 0.45, brow: 0.3, smile: -0.35, lookX: 0.8, lookY: -0.5, eyes: 1.15, ...armTo('R', {x: 368, y: 284}), pR: 1},
    {t: Q.save - 0.05, d: 0.2, e: EZ.back, lean: 4.5, ...armTo('R', {x: 376, y: 276})},
    {t: Q.save + 0.3, d: 0.3, e: EZ.inOut, lean: 2.5, ...armTo('R', {x: 368, y: 284})},
    {t: Q.thumb, d: 0.3, angry: 0.1, lookX: 0.9, lookY: -0.2, eyes: 1.25, brow: 0.8},
    {t: Q.perfectly + 0.45, d: 0.6, e: EZ.inOut, aRs: 10, aRe: 14, pR: 0, lean: 0, smile: -0.2},
    // "Then what did I actually accomplish?" — hands open at his sides, shoulders settle
    {t: Q.L08 - 0.05, d: 0.45, e: EZ.inOut, aLs: 17, aLe: 6, aRs: 17, aRe: 6, hL: 0.7, hR: 0.7, shrug: -0.15, head: 6, brow: 0.85, smile: -0.3, lookX: 0.85, lookY: 0},
    {t: Q.accomplish - 0.05, d: 0.25, e: EZ.back, aLs: 20, aRs: 20, shrug: 0.12},
    {t: Q.L08e + 0.1, d: 0.45, e: EZ.inOut, aLs: 9, aLe: 12, aRs: 10, aRe: 14, shrug: 0, head: 3},
    {t: Q.L08e + 0.18, d: 0.45, e: EZ.inOut, hL: 0, hR: 0},
    // F · disappointment: shoulders lower, softer face, minimal movement
    {t: Q.L14 - 0.6, d: 0.02, angry: 0, smile: -0.25, brow: 0.45, eyes: 0.95, lookX: 0.85, lookY: 0, head: 2, aLs: 9, aLe: 12, aRs: 10, aRe: 14, lean: 0, legR: 0, pR: 0},
    {t: Q.L14 - 0.1, d: 0.6, e: EZ.inOut, shrug: -0.45, nod: 0.18, smile: -0.4, head: 5},
    {t: Q.zero - 0.2, d: 0.5, e: EZ.inOut, lookX: 0.75, lookY: -0.45, nod: 0.05},
    {t: Q.superpowers + 0.3, d: 0.5, e: EZ.inOut, lookX: 0.3, lookY: 0.7, nod: 0.3, eyes: 0.9},
  ]);
  const alive = !(t > Q.freeze && t < Q.rise + 0.3) && t < Q.L15e + 0.2;
  if (alive) p.bob += Math.sin(t * 2.1) * 1.6;
  p.mouth = talking('owner', t, 1.7);
  if (alive && p.eyes > 0.5) p.eyes *= blink(t, 3.1, 0.7);
  return p;
};

// ---------------------------------------------------------------- assistant performance
const pinPose = (t: number): PinPose => {
  const p = keyed(t, {...PIN_REST, eyes: 0.05, lookX: -0.8}, [
    {t: Q.rise + 0.35, d: 0.25, eyes: 0.85},
    {t: Q.congrats, d: 0.3, eyes: 0.7},
    {t: Q.list, d: 0.3, brow: 0.45},
    {t: Q.L04 + 0.3, d: 0.3, brow: 0.2, eyes: 0.8},
    {t: Q.teleport - 0.2, d: 0.3, lookX: -0.45, lookY: 0.45},
    {t: Q.portalPop + 0.1, d: 0.3, lookX: -0.85, lookY: 0, brow: 0.6, eyes: 0.6},
    {t: Q.L06 + 0.2, d: 0.3, lookX: -0.3, lookY: -0.7, brow: 0.3},
    {t: Q.thumb - 0.2, d: 0.3, lookX: -0.8, lookY: 0, brow: 0.7, eyes: 0.65},
    {t: Q.L08 + 0.3, d: 0.3, brow: 0.2, eyes: 0.8},
    {t: Q.told, d: 0.3, lookX: -0.6, lookY: -0.5},
    {t: Q.L14 - 0.6, d: 0.02, lookX: -0.85, lookY: 0, eyes: 0.8, brow: 0.2},
    {t: Q.L15, d: 0.3, eyes: 0.65, brow: 0.5},
  ]);
  p.talk = talking('assistant', t, 1.6);
  p.tilt = Math.sin(t * 1.3) * 2;
  if (p.eyes > 0.4) p.eyes *= blink(t, 3.7, 1.9);
  return p;
};

// ---------------------------------------------------------------- camera
const camAt = (t: number): Cam => {
  const k = (a: number, d: number, e = EZ.inOut) => pr(t, a, d, e);
  let x = 600;
  let y = 900;
  let s = lerp(1.12, 1.18, k(0, 4, EZ.linear));
  const mv = (p: number, nx: number, ny: number, ns: number) => {
    x = lerp(x, nx, p);
    y = lerp(y, ny, p);
    s = lerp(s, ns, p);
  };
  mv(k(Q.brooklyn - 0.5, 0.8), 600, 860, 0.96); // room for the fantasy map
  mv(k(Q.takingOver - 0.3, 1.2), 560, 880, 1.02); // slow push for the pose
  mv(k(Q.rise - 0.1, 0.8), 580, 940, 1.04); // two-shot as the assistant rises
  mv(k(Q.L04 - 0.2, 0.7), 500, 960, 1.1);
  mv(k(Q.L05 - 0.2, 0.7), 640, 940, 1.08);
  mv(k(Q.teleport - 0.3, 0.6), 560, 980, 1.02); // room for the portal
  mv(k(Q.L06 - 0.3, 0.6), 580, 900, 1.04);
  mv(k(Q.L08 - 0.2, 0.6), 500, 960, 1.1);
  mv(k(Q.L09 - 0.2, 0.6), 600, 920, 1.04);
  mv(k(Q.L09e + 0.05, 0.6, EZ.in), LIST_POS.x, LIST_POS.y, 2.9); // push into the list card → lesson
  if (t > Q.L14 - 1) {
    x = 540;
    y = 960;
    s = lerp(1.22, 1.08, k(Q.L14 - 0.7, 0.9, EZ.out));
    mv(k(Q.L15 - 0.1, 0.8), 500, 960, 1.14);
  }
  return {x, y, s};
};
const PANEL_POS = {x: 760, y: 720, s: 0.82};
const NYC_POS = {x: 680, y: 510, s: 0.8};
const LIST_POS = {x: 740, y: 640, s: 0.7};
const LATE_POS = {x: 720, y: 700, s: 0.6};

export const Set3: React.FC<{t: number; fade?: number}> = ({t, fade = 1}) => {
  const o = ownerPose(t);
  const pp = pinPose(t);
  const cam = camAt(t);
  const frozen = frozenAt(t);
  const late = t > Q.L14 - 1;

  // A · service-area panel
  const steps = [1, 5, 10, 15, 20];
  const count = t < Q.added ? 1 : steps[Math.max(0, Math.min(4, Math.floor((t - Q.added) / 0.18)))];
  const panelIn = pr(t, Q.L01 - 0.2, 0.5, EZ.back);
  const toNyc = pr(t, Q.brooklyn - 0.45, 0.6, EZ.inOut); // the panel turns away, the fantasy map turns in
  const toList = pr(t, Q.list - 0.15, 0.6, EZ.inOut); // the fantasy map turns into a plain list
  // B · borough pins, crown, spotlight
  const boroughs = [Q.brooklyn, Q.queens, Q.manhattan].map((c) => pr(t, c - 0.05, 0.35, EZ.back));
  const spread = pr(t, Q.takingOver, 1.0, EZ.linear);
  const live = 1 - frozen;
  // crown sits on his head (FK), tilts at the freeze, falls when the assistant appears
  const head = toWorld(headPoint(o, {x: 200, y: 84}), OWN.x, OWN.y, OWN.w);
  const crownIn = pr(t, Q.takingOver, 0.45, EZ.back);
  const tip = pr(t, Q.freeze + 0.1, 0.25, EZ.out);
  const fall = pr(t, Q.rise + 0.3, 0.32, EZ.in);
  const crownGone = pr(t, Q.L04e + 0.3, 0.3, EZ.in);
  const crownW = 104;
  const crownX = lerp(head.x, head.x + 70, fall);
  const crownY = lerp(head.y - 4 - (1 - crownIn) * 140, FLOOR - 18, fall) - bump(t, Q.rise + 0.62, 0.22) * 22;
  const spot = pr(t, Q.newYork - 0.05, 0.25) * (1 - pr(t, Q.rise + 0.2, 0.08));
  // C · assistant entrance (Episode 01: tile unfolds, light column, rises)
  const tileIn = pr(t, Q.rise - 0.2, 0.45, EZ.out);
  const rise = pr(t, Q.rise, 0.55, EZ.back);
  const hover = Math.sin(t * 2.2) * 6 * rise * (t < Q.L15e + 0.2 ? 1 : 0);
  // portal → map pin
  const portalOpen = pr(t, Q.teleport - 0.1, 0.4, EZ.back) * (1 - pr(t, Q.portalPop, 0.22, EZ.in));
  const pinPop = pr(t, Q.portalPop + 0.15, 0.3, EZ.back) * (1 - pr(t, Q.L06 + 0.8, 0.3, EZ.in));
  const step = 40 * pr(t, Q.portalTry, 0.45, EZ.inOut) * (1 - pr(t, Q.L06 - 0.4, 0.5, EZ.inOut));
  // D · saved + thumbs up
  const saved = pr(t, Q.L06 - 0.3, 0.4, EZ.back) * (1 - pr(t, Q.L08 - 0.1, 0.35, EZ.in));
  const thumb = pr(t, Q.thumb - 0.02, 0.35, EZ.back) * (1 - pr(t, Q.L08 - 0.1, 0.35, EZ.in));
  // F · cape
  const capeIn = pr(t, Q.zero - 0.05, 0.3, EZ.back);
  const capeFall = pr(t, Q.superpowers + 0.35, 0.5, EZ.in);
  const neck = toWorld(bodyPoint(o, {x: 200, y: 296}), OWN.x + step, OWN.y, OWN.w);

  const ownerX = OWN.x + step;
  const showPanel = late || toNyc < 0.5;
  const showNyc = !late && toNyc >= 0.5 && toList < 0.5;
  const showList = !late && toList >= 0.5;
  // each card turns edge-on (90°) as the next one turns in from the other side
  const turnPanel = late ? 0 : -Math.min(1, toNyc * 2) * 90;
  const turnNyc = toList > 0 ? -Math.min(1, toList * 2) * 90 : (1 - Math.max(0, (toNyc - 0.5) * 2)) * 90;
  const turnList = (1 - Math.max(0, (toList - 0.5) * 2)) * 90;
  const settle = pr(t, Q.rise, 0.8, EZ.inOut);
  const pos = late ? LATE_POS : settle > 0 ? {x: lerp(NYC_POS.x, LIST_POS.x, settle), y: lerp(NYC_POS.y, LIST_POS.y, settle), s: lerp(NYC_POS.s, LIST_POS.s, settle)} : {x: lerp(PANEL_POS.x, NYC_POS.x, toNyc), y: lerp(PANEL_POS.y, NYC_POS.y, toNyc), s: lerp(PANEL_POS.s, NYC_POS.s, toNyc)};

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Studio haloX={640} haloY={820} floorY={1300} />
      <World cam={cam}>
        {/* spotlight (fantasy) */}
        {spot > 0 && (
          <div style={{position: 'absolute', left: OWN.x - 280 + Math.sin(t * 1.6 * live) * 14 * live, top: -200}}>
            <Spotlight w={560} h={1620} o={spot * 0.85} />
          </div>
        )}
        {spot > 0 && <div style={{position: 'absolute', left: OWN.x - 230, top: FLOOR - 40, width: 460, height: 80, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(255,236,190,${0.6 * spot}), rgba(255,236,190,0))`}} />}

        {/* the assistant's map tile + light column */}
        {tileIn > 0 && (
          <Obj cx={TILE.x} cy={TILE.y} w={TILE.size} h={TILE.size} pose={{rx: lerp(90, 66, tileIn), s: lerp(0.4, 1, tileIn)}}>
            <Card3D w={TILE.size} h={TILE.size} depth={22} step={4} radius={44} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={30} shadow={0.6} glow={`0 0 ${50 + 30 * rise}px rgba(183,216,197,${0.3 * rise})`}>
              <Neighborhood w={TILE.size} h={TILE.size} pins={0.4} ownPin={0} />
            </Card3D>
          </Obj>
        )}
        {rise > 0 && rise < 1 && <div style={{position: 'absolute', left: PIN.x - 120, top: PIN.y - 430, width: 240, height: 430, background: 'linear-gradient(0deg, rgba(183,216,197,0.55), rgba(183,216,197,0))', opacity: 1 - rise, filter: 'blur(8px)'}} />}

        {/* portal (visual gag) and the map pin it collapses into */}
        {portalOpen > 0.01 && (
          <div style={{position: 'absolute', left: 575 - 95, top: FLOOR - 295}}>
            <Portal w={190} t={t} open={portalOpen} />
          </div>
        )}
        {pinPop > 0.01 && (
          <div style={{position: 'absolute', left: 575 - 22, top: FLOOR - 58 - (1 - pinPop) * 30, transform: `scale(${pinPop})`, transformOrigin: '50% 100%'}}>
            <svg width={44} height={58} viewBox="-22 -52 44 58">
              <path d="M0 4 C -12 -10, -18 -20, -18 -30 A18 18 0 1 1 18 -30 C 18 -20, 12 -10, 0 4 Z" fill={C.teal} stroke={C.cream} strokeWidth={3} />
              <circle cx={0} cy={-30} r={7} fill={C.cream} />
            </svg>
          </div>
        )}

        {/* cape behind the shoulders (punchline) */}
        {capeIn > 0.01 && capeFall < 1 && (
          <div style={{position: 'absolute', left: neck.x - 120 - capeFall * 30, top: neck.y - 10 + capeFall * 300, transform: `scale(${capeIn}) rotate(${capeFall * -40}deg)`, transformOrigin: '50% 0%', opacity: 1 - pr(t, Q.superpowers + 0.7, 0.15)}}>
            <Cape w={240} flutter={Math.sin(t * 7) * (1 - capeFall)} />
          </div>
        )}

        <OwnerAt x={ownerX} y={OWN.y} w={OWN.w} pose={o} />

        {/* crown */}
        {crownIn > 0 && crownGone < 1 && (
          <div style={{position: 'absolute', left: crownX - crownW / 2, top: crownY - crownW * 0.72, transform: `rotate(${lerp(o.head * 0.8, 0, fall) + tip * 16 + fall * 72}deg) scale(${(1 - crownGone) * lerp(0.6, 1, crownIn)})`, transformOrigin: '50% 100%', opacity: Math.min(1, crownIn * 2)}}>
            <Crown w={crownW} />
          </div>
        )}

        {/* the assistant */}
        {rise > 0 && (
          <div style={{position: 'absolute', left: PIN.x - PIN.w / 2, top: PIN.y - PIN.w * (388 / 300) - 40 * rise + hover + (1 - rise) * 160, transform: `scale(${rise})`, transformOrigin: '50% 100%'}}>
            <Pin pose={pp} width={PIN.w} t={t} />
          </div>
        )}

        {/* panel → fantasy map → list (one object turning in place) */}
        {(panelIn > 0 || late) && showPanel && (
          <Obj cx={pos.x} cy={pos.y} w={PANEL.w} h={PANEL.h} pose={{s: pos.s * (late ? 1 : lerp(0.6, 1, panelIn)), z: late ? 0 : lerp(-400, 0, panelIn), rx: late ? 2 : lerp(40, 3, panelIn), ry: Math.sin(t * 0.7) * 3 + turnPanel, y: late ? 0 : (1 - panelIn) * 120}}>
            <ServiceAreaPanel count={late ? 20 : count} pins={late ? 1 : pr(t, Q.twenty1 + 0.3, 0.9, EZ.linear)} areas={late ? 1 : pr(t, Q.twenty1 + 0.6, 1.2, EZ.linear)} />
          </Obj>
        )}
        {showNyc && (
          <Obj cx={pos.x} cy={pos.y} w={NYC.w} h={NYC.h} pose={{s: pos.s, rx: 6, ry: turnNyc + Math.sin(t * 0.6 * live) * 2 * live}}>
            <NycMap t={t} boroughs={boroughs} spread={spread} frozen={frozen} />
          </Obj>
        )}
        {showList && (
          <Obj cx={pos.x} cy={pos.y} w={LIST.w} h={LIST.h} pose={{s: pos.s, rx: 3, ry: turnList + Math.sin(t * 0.7) * 3}}>
            <AreaList p={pr(t, Q.list + 0.1, 0.6, EZ.out)} serve={pr(t, Q.told - 0.1, 0.4, EZ.back)} />
          </Obj>
        )}

        {/* D · SAVED + thumbs up */}
        {saved > 0.01 && (
          <div style={{position: 'absolute', left: 560, top: 360}}>
            <SavedBadge p={saved} />
          </div>
        )}
        {thumb > 0.01 && (
          <div style={{position: 'absolute', left: 860, top: 352, transform: `scale(${thumb}) rotate(${(1 - thumb) * -30}deg)`, transformOrigin: '50% 100%'}}>
            <ThumbIcon size={86} />
          </div>
        )}
      </World>

      <Kicker t={t} at={Q.added} out={Q.profile1 + 0.4} lines={[<span key="a">I ADDED</span>, <Hl key="b">TWENTY CITIES!</Hl>]} size={84} />
      <Kicker t={t} at={Q.congrats} out={Q.madeList - 0.2} lines={[<Hl key="a">CONGRATULATIONS.</Hl>]} size={80} />
      <Kicker t={t} at={Q.madeList} out={Q.L03e + 0.3} lines={[<span key="a">YOU MADE <Hl>A LIST.</Hl></span>]} size={84} />
      <Kicker t={t} at={Q.notA} out={Q.L05e + 0.35} lines={[<span key="a">NOT A</span>, <Hl key="b">TELEPORTATION DEVICE.</Hl>]} size={68} />
      <Kicker t={t} at={Q.L15} out={Q.L15e + 0.45} lines={[<span key="a">TWENTY CITIES.</span>, <Hl key="b">ZERO SUPERPOWERS.</Hl>]} size={80} />
      {/* fantasy freeze: a brief desaturating flash */}
      <AbsoluteFill style={{background: 'rgba(25,43,42,1)', opacity: 0.12 * bump(t, Q.freeze, 0.3), pointerEvents: 'none'}} />
      {/* bright push-through into the lesson */}
      <AbsoluteFill style={{background: C.paper, opacity: t < Q.L10 + 0.5 ? pr(t, Q.L09e + 0.45, 0.2) : 0}} />
    </AbsoluteFill>
  );
};
