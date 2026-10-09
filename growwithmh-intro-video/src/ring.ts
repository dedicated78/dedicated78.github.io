import {interpolateColors} from 'remotion';
import {B} from './beats';
import {E, clamp, kf, lerp} from './lib/anim';
import {C} from './theme';
import {ANS5, PIN3, S1_FRAGS, S1_RING_HOME, S2_OBJ, S6_CENTER, S6_OBJ, WM7, ans5Row, card3Action, card3Row, project, site4BlockScreen} from './layout';

// The recurring search ring. One element, one keyframe track, screen space. It searches
// (S1), opens the brand (S2), taps into the map (S2→S3), selects and inspects (S3), scans
// the website layers (S4), organises the answer (S5), researches and gathers (S6), and
// reveals the wordmark before collapsing into its dot (S7).

type Key = {f: number; x: number; y: number; d: number; sw?: number; h?: number; o?: number; c?: 0 | 1; e?: (t: number) => number};

// c: 0 = teal (on cream), 1 = mint (on charcoal). sw = stroke width. h = magnifier handle.
const frag = (i: number) => {
  const L = S1_FRAGS[i];
  const p = project(L.cx, L.cy, L.z);
  return {x: 540 + (p.x - 540) * 1.06, y: 960 + (p.y - 960) * 1.06};
};
const row3 = card3Row(0);
const act3 = card3Action(2);
const blk4 = site4BlockScreen();
export const DOT7 = {x: 911.6, y: WM7.cy + 0.25 * WM7.size, d: WM7.size * 0.2};
export const WM7_LEFT = 156;

const KEYS: Key[] = [
  // S1 — search icon inside the search card, then searches the scattered details
  {f: B(2), x: 200, y: 960, d: 62, sw: 7, h: 1, o: 0, c: 0},
  {f: B(2, 1, 2), x: 200, y: 960, d: 62, sw: 7, h: 1, o: 1, c: 0},
  {f: B(2, 3, 1), x: S1_RING_HOME.x, y: S1_RING_HOME.y, d: 62, sw: 7, h: 1, o: 1, c: 0},
  {f: B(2, 3, 3), x: S1_RING_HOME.x + 30, y: S1_RING_HOME.y - 40, d: 100, sw: 7, h: 1, o: 1, c: 1, e: E.out},
  {f: B(2, 4), ...frag(1), d: 110, sw: 7, h: 1, o: 1, c: 1},
  {f: B(2, 4, 1), ...frag(2), d: 110, sw: 7, h: 1, o: 1, c: 1},
  {f: B(2, 4, 2), x: 540, y: 960, d: 130, sw: 8, h: 0, o: 1, c: 1},
  // rush the camera: the inside opens into the brand scene
  {f: B(3), x: 540, y: 960, d: 2600, sw: 26, h: 0, o: 1, c: 1, e: E.in},
  {f: B(3, 1, 2), x: 540, y: 960, d: 3600, sw: 30, h: 0, o: 0, c: 0},
  // S2 — returns and taps the map object on the bar-4 beat-3 kick
  {f: B(4, 2, 2), x: 1160, y: 980, d: 110, sw: 7, h: 0, o: 0, c: 0},
  {f: B(4, 2, 3), x: 1060, y: 1000, d: 110, sw: 7, h: 0, o: 1, c: 0},
  {f: B(4, 3), x: S2_OBJ.map.cx, y: S2_OBJ.map.cy, d: 120, sw: 7, h: 0, o: 1, c: 0, e: E.out},
  {f: B(4, 3, 2), x: S2_OBJ.map.cx + 40, y: S2_OBJ.map.cy - 30, d: 160, sw: 7, h: 0, o: 1, c: 1},
  {f: B(4, 4, 2), x: 540, y: 960, d: 420, sw: 9, h: 0, o: 0, c: 1},
  // S3 — selects Services (snare), hovers the business location, clicks Website (snare)
  {f: B(6) - 4, x: -80, y: row3.y - 40, d: 100, sw: 7, h: 0, o: 0, c: 1},
  {f: B(6), x: 40, y: row3.y - 20, d: 100, sw: 7, h: 0, o: 1, c: 1},
  {f: B(6, 2), x: row3.x + 8, y: row3.y, d: 96, sw: 7, h: 0, o: 1, c: 1, e: E.out},
  {f: B(7, 1), x: row3.x + 8, y: row3.y, d: 96, sw: 7, h: 0, o: 1, c: 1},
  {f: B(7, 2), x: PIN3.x, y: PIN3.y - 70, d: 150, sw: 7, h: 1, o: 1, c: 1},
  {f: B(8, 1), x: PIN3.x, y: PIN3.y - 70, d: 150, sw: 7, h: 1, o: 1, c: 1},
  {f: B(8, 3, 2), x: act3.x, y: act3.y, d: 96, sw: 7, h: 0, o: 1, c: 1},
  {f: B(8, 4), x: act3.x, y: act3.y, d: 96, sw: 7, h: 0, o: 1, c: 1},
  {f: B(8, 4, 2), x: act3.x + 60, y: act3.y + 40, d: 96, sw: 7, h: 0, o: 0, c: 1},
  // S4 — scans the exploded layers, then marks the content block that lifts out
  {f: B(10) - 4, x: 960, y: 640, d: 150, sw: 8, h: 1, o: 0, c: 0},
  {f: B(10), x: 760, y: 700, d: 150, sw: 8, h: 1, o: 1, c: 0},
  {f: B(10, 1, 2), x: 620, y: 760, d: 150, sw: 8, h: 1, o: 1, c: 0},
  {f: B(10, 2, 2), x: 560, y: 980, d: 150, sw: 8, h: 1, o: 1, c: 0},
  {f: B(10, 3, 2), x: 500, y: 1210, d: 150, sw: 8, h: 1, o: 1, c: 0},
  {f: B(10, 4, 2), x: 860, y: 1350, d: 120, sw: 8, h: 1, o: 0, c: 0},
  {f: B(11, 2), x: 100, y: blk4.cy + 60, d: 110, sw: 7, h: 0, o: 0, c: 0},
  {f: B(11, 3), x: blk4.cx - 250, y: blk4.cy, d: 110, sw: 7, h: 0, o: 1, c: 0, e: E.out},
  {f: B(12, 2), x: blk4.cx - 250, y: blk4.cy, d: 110, sw: 7, h: 0, o: 1, c: 0},
  {f: B(12, 2, 3), x: blk4.cx - 250, y: blk4.cy - 80, d: 110, sw: 7, h: 0, o: 0, c: 0},
  // S5 — runs down the answer rows and puts them in order
  {f: B(14, 1, 2), x: 80, y: ans5Row(0).y - 60, d: 104, sw: 7, h: 0, o: 0, c: 1},
  {f: B(14, 2), x: ans5Row(0).x, y: ans5Row(0).y, d: 104, sw: 7, h: 0, o: 1, c: 1, e: E.out},
  {f: B(14, 2, 2), x: ans5Row(1).x, y: ans5Row(1).y, d: 104, sw: 7, h: 0, o: 1, c: 1},
  {f: B(14, 3), x: ans5Row(2).x, y: ans5Row(2).y, d: 104, sw: 7, h: 0, o: 1, c: 1},
  {f: B(14, 4), x: ANS5.cx + ANS5.w / 2 - 80, y: ans5Row(2).y + 40, d: 104, sw: 7, h: 0, o: 0, c: 1},
  // S6 — research sweep across the three objects
  {f: B(16, 3) - 4, x: 60, y: S6_OBJ.map.cy - 60, d: 150, sw: 8, h: 1, o: 0, c: 0},
  {f: B(16, 3), x: S6_OBJ.map.cx, y: S6_OBJ.map.cy, d: 150, sw: 8, h: 1, o: 1, c: 0, e: E.out},
  {f: B(16, 3, 3), x: S6_OBJ.site.cx, y: S6_OBJ.site.cy, d: 150, sw: 8, h: 1, o: 1, c: 0},
  {f: B(16, 4, 2), x: S6_OBJ.answer.cx, y: S6_OBJ.answer.cy, d: 150, sw: 8, h: 1, o: 1, c: 0},
  {f: B(17) - 2, x: S6_OBJ.answer.cx + 80, y: S6_OBJ.answer.cy - 120, d: 120, sw: 8, h: 0, o: 0, c: 0},
  // S6 → S7 — appears at centre, swallows the three objects on the phrase hit
  {f: B(18, 3, 2), x: S6_CENTER.x, y: S6_CENTER.y, d: 40, sw: 8, h: 0, o: 0, c: 0},
  {f: B(18, 4), x: S6_CENTER.x, y: S6_CENTER.y, d: 240, sw: 12, h: 0, o: 1, c: 0, e: E.out},
  {f: B(19), x: S6_CENTER.x, y: S6_CENTER.y, d: 210, sw: 12, h: 0, o: 1, c: 1},
  // S7 — moves to the wordmark, sweeps it, collapses into the dot on the reveal accent
  {f: B(19, 1, 2), x: WM7_LEFT + 40, y: WM7.cy, d: 210, sw: 10, h: 1, o: 1, c: 1, e: E.out},
  {f: B(19, 2, 3), x: DOT7.x, y: DOT7.y - 20, d: 210, sw: 10, h: 1, o: 1, c: 1, e: E.inOut},
  {f: B(19, 3), x: DOT7.x, y: DOT7.y, d: DOT7.d, sw: DOT7.d / 2, h: 0, o: 1, c: 1, e: E.in},
  {f: B(19, 3) + 1, x: DOT7.x, y: DOT7.y, d: DOT7.d, sw: DOT7.d / 2, h: 0, o: 0, c: 1},
];

/** Click moments (ring presses down briefly). */
const CLICKS = [B(4, 3), B(6, 2), B(8, 4), B(19)];

export type RingState = {x: number; y: number; d: number; sw: number; h: number; o: number; color: string; press: number; collapse: number};

export const ringAt = (f: number): RingState => {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].f <= f) i++;
  const a = KEYS[i];
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  const span = Math.max(1, b.f - a.f);
  const t = f <= a.f ? 0 : f >= b.f ? 1 : (b.e ?? E.inOut)(clamp((f - a.f) / span));
  const L = (k: keyof Key, def: number) => lerp((a[k] as number) ?? def, (b[k] as number) ?? def, t);
  const press = CLICKS.reduce((acc, c) => acc + kf(f, [c - 2, c, c + 5], [0, 1, 0], E.soft), 0);
  // Collapse into the brand dot turns the ring warm.
  const collapse = kf(f, [B(19, 2, 3), B(19, 3)], [0, 1], E.in);
  const base = interpolateColors(L('c', 0), [0, 1], [C.teal, C.mint]);
  return {
    x: L('x', 540),
    y: L('y', 960),
    d: L('d', 100) * (1 - press * 0.14),
    sw: L('sw', 7),
    h: L('h', 0),
    o: f < KEYS[0].f ? 0 : L('o', 1),
    color: interpolateColors(collapse, [0, 1], [base, C.accent]),
    press,
    collapse,
  };
};

export const RING_CLICKS = CLICKS;
