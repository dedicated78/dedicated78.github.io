import {OwnerPose, SHOULDER_Y} from './Owner';

// Forward / inverse kinematics for the owner's arms, in the Owner viewBox (400 x 720,
// feet at 200,700). Angles follow the rig: rotate(s * dir) at the shoulder, then
// rotate(-e * dir) at the elbow, dir = +1 for the screen-left arm and -1 for the right.
export type Pt = {x: number; y: number};
const UPPER = 90;
const FORE = 96; // shoulder → elbow, elbow → palm centre
const SX = {L: 128, R: 272};
const DIR = {L: 1, R: -1};
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
/** Unit vector of the rig's "down" after an SVG rotation of a degrees. */
const down = (a: number): Pt => ({x: -Math.sin(rad(a)), y: Math.cos(rad(a))});

/** Body transform: bob, then lean about the feet (squash ignored, it stays ~1 when acting). */
const body = (p: Pt, pose: OwnerPose): Pt => {
  const q = {x: p.x - 200, y: p.y + pose.bob - 700};
  const c = Math.cos(rad(pose.lean));
  const s = Math.sin(rad(pose.lean));
  return {x: 200 + q.x * c - q.y * s, y: 700 + q.x * s + q.y * c};
};

export const shoulder = (side: 'L' | 'R', pose: Pick<OwnerPose, 'shrug'>): Pt => ({x: SX[side], y: SHOULDER_Y - pose.shrug * 12});

/** Hand (palm centre) position in the viewBox, body transform included. */
export const handAt = (pose: OwnerPose, side: 'L' | 'R'): Pt => {
  const dir = DIR[side];
  const s = side === 'L' ? pose.aLs : pose.aRs;
  const e = side === 'L' ? pose.aLe : pose.aRe;
  const a1 = s * dir;
  const a2 = a1 - e * dir;
  const L = Math.max(0.3, Math.min(1, side === 'L' ? pose.fL : pose.fR));
  const sh = shoulder(side, pose);
  const el = {x: sh.x + UPPER * down(a1).x, y: sh.y + UPPER * down(a1).y};
  const fore = (FORE - 6) * L + 6; // matches the drawing: the hand moves by (L-1)·90 along the forearm
  const h = {x: el.x + fore * down(a2).x, y: el.y + fore * down(a2).y};
  return body(h, pose);
};

/** Centre of the phone held in the screen-right hand (viewBox, body transform included). */
export const phoneAt = (pose: OwnerPose, grip: {angle: number; cy: number}): Pt => {
  const palm = handAt(pose, 'R');
  // hand-space rotation for the right arm: rotate(-s) · rotate(+e) · rotate(-w), then the grip angle
  const a = rad(-pose.aRs + pose.aRe - pose.wR + grip.angle + pose.lean);
  return {x: palm.x - grip.cy * Math.sin(a), y: palm.y + grip.cy * Math.cos(a)};
};

/**
 * Two-bone IK: shoulder and elbow angles that put the palm on `target` (body-local
 * viewBox coordinates, i.e. before lean/bob). The elbow is kept on the low, outer side
 * (hanging under the shoulder, near the torso) — never lifted above the hand.
 */
export const reach = (side: 'L' | 'R', target: Pt, shrug = 0): {s: number; e: number} => {
  const dir = DIR[side];
  const sh = shoulder(side, {shrug});
  const dx = target.x - sh.x;
  const dy = target.y - sh.y;
  const D = Math.max(Math.abs(UPPER - FORE) + 1, Math.min(UPPER + FORE - 0.5, Math.hypot(dx, dy)));
  const phi = deg(Math.atan2(-dx, dy)); // rotation that points "down" at the target
  const alpha = deg(Math.acos((UPPER * UPPER + D * D - FORE * FORE) / (2 * UPPER * D)));
  const beta = deg(Math.acos((FORE * FORE + D * D - UPPER * UPPER) / (2 * FORE * D)));
  // two solutions; pick the one whose elbow sits lower (gravity) and outside the body line
  const cands = [
    {a1: phi + alpha, a2: phi - beta},
    {a1: phi - alpha, a2: phi + beta},
  ].map((c) => {
    const el = {x: sh.x + UPPER * down(c.a1).x, y: sh.y + UPPER * down(c.a1).y};
    const outward = (el.x - 200) * (side === 'L' ? -1 : 1);
    return {...c, score: el.y + 0.6 * outward};
  });
  const best = cands[0].score >= cands[1].score ? cands[0] : cands[1];
  return {s: best.a1 * dir, e: -(best.a2 - best.a1) * dir};
};

/** Arm pose fields for a reach, ready to spread into a keyframe. */
export const armTo = (side: 'L' | 'R', target: Pt, shrug = 0) => {
  const r = reach(side, target, shrug);
  return side === 'L' ? {aLs: r.s, aLe: r.e} : {aRs: r.s, aRe: r.e};
};

/** Owner viewBox point → world point, for an owner placed with OwnerAt(x, y feet, w). */
export const toWorld = (p: Pt, x: number, y: number, w: number): Pt => ({x: x - w / 2 + (p.x * w) / 400, y: y - (700 * w) / 400 + (p.y * w) / 400});
