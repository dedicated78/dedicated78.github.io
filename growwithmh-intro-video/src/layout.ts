// Shared positions. The recurring search ring (src/ring.ts) is drawn in screen space and
// visits these objects, so scenes and the ring track read the same numbers.

export const PERSPECTIVE = 1700;
export const ORIGIN_Y = 960;

/** Screen position of a point at depth z inside a Stage with the default perspective. */
export const project = (x: number, y: number, z: number) => {
  const k = PERSPECTIVE / (PERSPECTIVE - z);
  return {x: 540 + (x - 540) * k, y: ORIGIN_Y + (y - ORIGIN_Y) * k, k};
};

// S1 · problem
export const S1_SEARCH = {cx: 540, cy: 960, w: 840, h: 150};
export const S1_PUSH = 1.06;
export const S1_RING_HOME = {x: 540 - (S1_SEARCH.w / 2 - 80) * S1_PUSH, y: 960};
export const S1_FRAGS = [
  {cx: 260, cy: 690, z: -200, rx: 18, ry: 28, rz: -8},
  {cx: 820, cy: 640, z: -300, rx: -12, ry: -26, rz: 9},
  {cx: 840, cy: 1250, z: -140, rx: 20, ry: -30, rz: 6},
  {cx: 250, cy: 1300, z: -260, rx: -16, ry: 26, rz: -10},
  {cx: 560, cy: 1470, z: -380, rx: 24, ry: 8, rz: 4},
  {cx: 560, cy: 610, z: -520, rx: -20, ry: -8, rz: -12},
];

// S2 · brand
export const WM2 = {cy: 690, size: 128};
export const S2_OBJ = {
  map: {cx: 270, cy: 1130, w: 300, h: 300},
  site: {cx: 810, cy: 1110, w: 290, h: 360},
  answer: {cx: 540, cy: 1420, w: 440, h: 180},
};

// S3 · local
export const MAP3 = {cx: 540, cy: 1390, size: 1500, z: -150, rx: 62};
export const PIN3 = project(MAP3.cx, MAP3.cy, MAP3.z); // where the map centre (and pin tip) lands
export const CARD3 = {cx: 540, cy: 790, w: 760, h: 560};
export const card3Row = (i: number) => ({x: CARD3.cx - CARD3.w / 2 + 62, y: CARD3.cy - CARD3.h / 2 + 200 + i * 64});
export const card3Action = (i: number) => {
  const bw = (CARD3.w - 76 - 2 * 14) / 3;
  return {x: CARD3.cx - CARD3.w / 2 + 38 + bw / 2 + i * (bw + 14), y: CARD3.cy + CARD3.h / 2 - 62, w: bw};
};

// S4 · website
export const SITE4 = {cx: 540, cy: 990, w: 760, h: 900};
/** "What we do" section on the service-content layer (local coords). */
export const SITE4_BLOCK = {x: 40, y: 440, w: 680, h: 120};
export const site4BlockScreen = () => ({
  cx: SITE4.cx - SITE4.w / 2 + SITE4_BLOCK.x + SITE4_BLOCK.w / 2,
  cy: SITE4.cy - SITE4.h / 2 + SITE4_BLOCK.y + SITE4_BLOCK.h / 2,
  w: SITE4_BLOCK.w,
  h: SITE4_BLOCK.h,
});

// S5 · answers
export const Q5 = {cx: 560, cy: 590, w: 800, h: 124};
export const ANS5 = {cx: 540, cy: 930, w: 820, h: 440};
export const ans5Row = (i: number) => ({x: ANS5.cx - ANS5.w / 2 + 70, y: ANS5.cy - ANS5.h / 2 + 170 + i * 92});
export const SRC5 = {cx: 300, cy: 1340, w: 360, h: 280};

// S6 · personal
export const S6_OBJ = {
  map: {cx: 250, cy: 870, w: 350, h: 350},
  site: {cx: 540, cy: 790, w: 370, h: 470},
  answer: {cx: 810, cy: 890, w: 370, h: 250},
};
export const S6_CENTER = {x: 540, y: 860};

// S7 · reveal
export const WM7 = {cy: 720, size: 128};
