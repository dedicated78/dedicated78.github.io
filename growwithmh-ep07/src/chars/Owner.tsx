import React from 'react';
import {C} from '../theme';

// THE BUSINESS OWNER — original stylized character, drawn as a rigged SVG with volume
// shading (lit from the top left). Every joint is a pose parameter so scenes can act
// him frame by frame. Feet rest at (200, 700) in the 400 x 720 viewBox.

export type OwnerPose = {
  lean: number; // whole-body tilt (deg) about the feet
  bob: number; // vertical body offset (px, negative = up)
  squash: number; // 1 = neutral; <1 squashed, >1 stretched
  head: number; // head tilt (deg)
  aLs: number; // screen-left arm: shoulder (deg, + = outward/up)
  aLe: number; // screen-left arm: elbow (deg, + = bend inward)
  aRs: number;
  aRe: number;
  hL: number; // screen-left hand: 0 relaxed fist … 1 open, palm up, fingers relaxed
  hR: number;
  wL: number; // screen-left wrist (deg, + = fingers tip toward the palm side)
  wR: number;
  fL: number; // screen-left forearm length factor: 1 = side-on, <1 = foreshortened toward camera
  fR: number;
  pR: number; // 0 … 1 screen-right index finger extends from the fist (pointing)
  phoneR: number; // 0 … 1 phone held in the screen-right hand (built into the hand, so it can't drift)
  phoneGlow: number; // 0 … 1 screen light spilling up toward his face
  phoneTurn: number; // 0 … 1 phone turning edge-on in the hand (handoff to the 3D phone prop)
  phoneBuzz: number; // px of vibration jitter
  nod: number; // 0 … 1 head lowers (embarrassment)
  shrug: number; // 0 … 1 shoulders lift (negative = drop/relax)
  legL: number; // deg
  legR: number;
  mouth: number; // 0 closed … 1 wide open
  smile: number; // -1 frown … 1 grin
  brow: number; // -1 low … 1 raised
  angry: number; // 0 … 1 inner brows down
  eyes: number; // 0 closed … 1 open … 1.35 wide
  lookX: number; // -1 … 1
  lookY: number;
  shades: number; // 0 … 1 sunglasses on
  blush: number; // 0 … 1
  sweat: number; // 0 … 1
  sad: number; // 0 … 1 inner brows lift (grief)
  cry: number; // 0 … 1 tears: pooled on the lower lids, streaks and drops down the cheeks
  tearT: number; // seconds: drives the falling drops (pass scene time)
  bq: number; // 0 / 1 bouquet held upright in the screen-right fist (built into the hand: it cannot drift)
  bqTilt: number; // deg: bouquet lean in world space while held
};

export const OWNER_REST: OwnerPose = {
  lean: 0, bob: 0, squash: 1, head: 0,
  aLs: 8, aLe: 10, aRs: 8, aRe: 10,
  hL: 0, hR: 0, wL: 0, wR: 0,
  nod: 0, shrug: 0,
  fL: 1, fR: 1, pR: 0, phoneR: 0, phoneGlow: 0, phoneTurn: 0, phoneBuzz: 0,
  legL: 0, legR: 0,
  mouth: 0, smile: 0.5, brow: 0, angry: 0, eyes: 1, lookX: 0, lookY: 0,
  shades: 0, blush: 0, sweat: 0,
  sad: 0, cry: 0, tearT: 0, bq: 0, bqTilt: 0,
};

export const SHOULDER_Y = 318;
const SKIN = '#E9B48C';
const SKIN_SH = '#C98E66';
const HAIR = '#2E211B';
const SUIT = ['#23827A', '#17615A', '#0E4842'];

// Relaxed open hand in forearm space (wrist at y 84, fingers along +y). `k` is the palm
// side (+1 / -1 on local x): with the forearm turned outward the palm faces up.
const FINGERS = [
  {x: -7, len: 22, curl: 7},
  {x: -2.5, len: 27, curl: 8},
  {x: 2, len: 26, curl: 9},
  {x: 6.5, len: 21, curl: 10},
];
const OpenHand: React.FC<{h: number; k: number}> = ({h, k}) => {
  const o = Math.min(1, h * 2.5);
  const tip = (f: (typeof FINGERS)[number]) => {
    const y0 = 108;
    const L = f.len * h;
    const c = f.curl * h;
    return `M${f.x * k},${y0} Q${(f.x + c * 0.25) * k},${y0 + L * 0.65} ${(f.x + c) * k},${y0 + L}`;
  };
  return (
    <g opacity={o}>
      {/* fingers: outlined strokes, slightly curled toward the palm side */}
      {FINGERS.map((f, i) => (
        <path key={`o${i}`} d={tip(f)} stroke={SKIN_SH} strokeWidth={12.5} strokeLinecap="round" fill="none" />
      ))}
      {FINGERS.map((f, i) => (
        <path key={`f${i}`} d={tip(f)} stroke={SKIN} strokeWidth={9} strokeLinecap="round" fill="none" />
      ))}
      {/* thumb on the palm side, angled up and out */}
      <path d={`M${10 * k},${94} Q${(16 + 8 * h) * k},${100 + 4 * h} ${(14 + 12 * h) * k},${108 + 6 * h}`} stroke={SKIN_SH} strokeWidth={12.5} strokeLinecap="round" fill="none" />
      <path d={`M${10 * k},${94} Q${(16 + 8 * h) * k},${100 + 4 * h} ${(14 + 12 * h) * k},${108 + 6 * h}`} stroke={SKIN} strokeWidth={9} strokeLinecap="round" fill="none" />
    </g>
  );
};

/** Phone held toward his face in his anatomical left hand (screen-right), drawn in the hand's own
 * space (palm centre at 0,0; phone long axis along y). The screen faces him, so the audience sees the
 * phone's back and the back of his hand: it comes out of the sleeve at the outer edge, three simple
 * fingers lie across the lower back and curl round the inner edge, and the thumb stays on the screen
 * side (only its tip shows at the outer edge). `k` = +1 for the screen-right hand. */
export const PHONE_GRIP = {angle: -38, cy: -36};
const FINGER_Y = [-35, -26.5, -18]; // index, middle, ring across the back; pinky tucked under the hand
const HeldPhone: React.FC<{k: number; glow: number; turn: number; buzz: number}> = ({k, glow, turn, buzz}) => {
  const sx = Math.max(0.04, Math.cos(Math.PI * 0.5 * Math.min(1, turn * 1)));
  const X = (x: number) => x * k; // mirror for the other hand
  const finger = (y: number, i: number) => `M${X(6)},${y} Q${X(-9)},${y - 1.2} ${X(-20)},${y + 0.4} Q${X(-24.5)},${y + 1.2} ${X(-25.5)},${y + 4 + i * 0.3}`;
  const handPath = `M${X(28)},${-36} C${X(33)},${-28} ${X(33)},${-9} ${X(25)},${-3} C${X(17)},${2} ${X(6)},${0} ${X(2)},${-6} L${X(1)},${-34} C${X(7)},${-41} ${X(22)},${-42} ${X(28)},${-36} Z`;
  return (
    <g transform={`translate(${buzz} 0) rotate(${PHONE_GRIP.angle * k}) scale(${sx} 1)`}>
      {/* thumb on the screen side: only its tip shows past the outer edge */}
      <rect x={k > 0 ? 18 : -29} y={-52} width={11} height={15} rx={5.5} fill={SKIN_SH} />
      <rect x={k > 0 ? 19 : -28} y={-51} width={9} height={13} rx={4.5} fill={SKIN} />
      {/* back of the phone (screen faces his face) */}
      <rect x={-24} y={-80} width={48} height={88} rx={10} fill="url(#phoneBack)" stroke="#0A1A19" strokeWidth={1.5} />
      <rect x={-24 + (k > 0 ? 30 : 4)} y={-72} width={14} height={16} rx={4} fill="#0B1F1D" />
      <circle cx={-17 + (k > 0 ? 30 : 4) + 7} cy={-68} r={2.6} fill="#2E5550" />
      <circle cx={-17 + (k > 0 ? 30 : 4) + 7} cy={-60} r={2.6} fill="#2E5550" />
      {/* light from the screen catching the top edge */}
      <rect x={-21} y={-82} width={42} height={3.5} rx={1.75} fill="#B7D8C5" opacity={0.45 + 0.5 * glow} />
      {/* back of the hand + fingers over the lower back of the phone (one silhouette, then fills) */}
      <path d={handPath} fill="none" stroke={SKIN_SH} strokeWidth={3} strokeLinejoin="round" />
      {FINGER_Y.map((y, i) => (
        <path key={`o${i}`} d={finger(y, i)} stroke={SKIN_SH} strokeWidth={11} strokeLinecap="round" fill="none" />
      ))}
      <path d={handPath} fill={SKIN} />
      {FINGER_Y.map((y, i) => (
        <path key={`f${i}`} d={finger(y, i)} stroke={SKIN} strokeWidth={8.4} strokeLinecap="round" fill="none" />
      ))}
      {/* fine separations between fingers, no extra anatomy */}
      {[-30.8, -22.3].map((y) => (
        <path key={y} d={`M${X(3)},${y} Q${X(-8)},${y - 0.6} ${X(-18)},${y + 0.5}`} stroke={SKIN_SH} strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.8} />
      ))}
    </g>
  );
};

/** A small funeral bouquet drawn around its grip point (0, 0) in Owner viewBox units: stems run down
 * to y +46, a cream paper wrap opens upward and the blooms sit at about y -80 … -130. In the hand the fist
 * is drawn over the grip, so the stems pass through the fingers. */
export const BOUQUET = {top: -132, bottom: 46};
export const Bouquet: React.FC<{cheer?: number}> = ({cheer = 0}) => {
  const bloom = (x: number, y: number, r: number, c: string, i: string) => (
    <g key={`${x},${y}`}>
      <circle cx={x} cy={y} r={r} fill={c} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x + Math.cos(((a + 18) * Math.PI) / 180) * r * 0.55} cy={y + Math.sin(((a + 18) * Math.PI) / 180) * r * 0.55} rx={r * 0.42} ry={r * 0.3} fill={i} opacity={0.55} transform={`rotate(${a + 18} ${x + Math.cos(((a + 18) * Math.PI) / 180) * r * 0.55} ${y + Math.sin(((a + 18) * Math.PI) / 180) * r * 0.55})`} />
      ))}
      <circle cx={x} cy={y} r={r * 0.28} fill="#B9772F" />
      <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.22} fill="rgba(255,255,255,0.35)" />
    </g>
  );
  const sat = (a: string, b: string) => (cheer > 0.5 ? b : a);
  return (
    <g>
      {/* stems */}
      {[-7, -2.5, 2.5, 7].map((x, i) => (
        <path key={i} d={`M${x * 0.5},-60 L${x * 1.1},${44}`} stroke="#4F8A63" strokeWidth={4} strokeLinecap="round" />
      ))}
      {/* leaves */}
      <ellipse cx={-36} cy={-74} rx={20} ry={8} fill="#5E9C76" transform="rotate(-35 -36 -74)" />
      <ellipse cx={36} cy={-76} rx={20} ry={8} fill="#4F8A63" transform="rotate(35 36 -76)" />
      <ellipse cx={-4} cy={-128} rx={14} ry={6} fill="#5E9C76" transform="rotate(-70 -4 -128)" />
      {/* blooms */}
      {bloom(-12, -112, 15, sat('#E3A79A', '#F2A9B8'), '#F7D7CF')}
      {bloom(15, -113, 14, sat('#E08A73', '#F0846A'), '#F6C2B2')}
      {bloom(-27, -86, 16, sat('#E08A73', '#F0846A'), '#F6C2B2')}
      {bloom(27, -87, 16, '#F7F1E6', '#FFFFFF')}
      {bloom(0, -95, 18, sat('#D9A04E', '#F2B640'), '#F3D49A')}
      {/* paper wrap: a cream cone, open at the top, gathered at the grip */}
      <path d="M-44,-78 L-9,6 L9,6 L44,-78 Q20,-62 0,-66 Q-20,-62 -44,-78 Z" fill="#F1E9D6" stroke="#D8CBAE" strokeWidth={2} strokeLinejoin="round" />
      <path d="M-30,-70 L-4,4" stroke="#DDD0B4" strokeWidth={2} />
      <path d="M22,-68 L5,4" stroke="#E6DCC4" strokeWidth={2} />
      {/* ribbon tails below the grip */}
      <path d="M-3,10 Q-12,26 -16,36" stroke={C.teal} strokeWidth={5} strokeLinecap="round" fill="none" />
      <path d="M3,10 Q11,24 13,34" stroke={C.teal} strokeWidth={5} strokeLinecap="round" fill="none" />
      <rect x={-11} y={2} width={22} height={9} rx={4} fill={C.teal} />
    </g>
  );
};

/** Tears in head space: pooled on the lower lids, a wet streak down each cheek, drops sliding down. */
const Tears: React.FC<{cry: number; t: number; eyeRy: number}> = ({cry, t, eyeRy}) => {
  if (cry <= 0.01) return null;
  const c = Math.min(1, cry);
  return (
    <g>
      {([[165, -1], [235, 1]] as const).map(([x, side]) => {
        const y0 = 200 + eyeRy - 3;
        const sx = x + side * 9;
        const streak = Math.min(1, c * 1.4);
        return (
          <g key={x}>
            {/* welling tear on the lower lid */}
            <ellipse cx={x} cy={y0 + 1} rx={15 * c} ry={4.5 * c} fill="rgba(143,207,232,0.85)" />
            <ellipse cx={x - 5} cy={y0} rx={4 * c} ry={1.6 * c} fill="rgba(255,255,255,0.8)" />
            {/* wet streak */}
            <path d={`M${sx},${y0 + 2} Q${sx + side * 4},${y0 + 26} ${sx + side * 2},${y0 + 2 + 52 * streak}`} stroke="rgba(143,207,232,0.55)" strokeWidth={6} strokeLinecap="round" fill="none" />
            {/* drops sliding down the streak (two per eye, offset) */}
            {[0, 0.55].map((off, i) => {
              const u = (((t + off + (side > 0 ? 0.3 : 0)) % 1.1) + 1.1) % 1.1 / 1.1;
              const y = y0 + 4 + u * 60;
              const op = c * Math.min(1, u * 6) * (1 - u) * 1.4;
              return (
                <g key={i} opacity={Math.min(1, op)} transform={`translate(${sx + side * (2 + 3 * u)} ${y})`}>
                  <path d="M0,-9 Q6,0 5,4 Q3,9 0,9 Q-3,9 -5,4 Q-6,0 0,-9 Z" fill="#8FCFE8" stroke="#6FB3D0" strokeWidth={1} />
                  <ellipse cx={-1.5} cy={2} rx={1.4} ry={2.4} fill="rgba(255,255,255,0.85)" />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

const Arm: React.FC<{side: 'L' | 'R'; s: number; e: number; h?: number; w?: number; sy?: number; fore?: number; point?: number; phone?: {on: number; glow: number; turn: number; buzz: number}; bouquet?: number}> = ({side, s, e, h = 0, w = 0, sy = 318, fore = 1, point = 0, phone, bouquet}) => {
  const dir = side === 'L' ? 1 : -1;
  const sx = side === 'L' ? 128 : 272;
  const k = -dir; // palm side on local x
  const open = Math.max(0, Math.min(1, h));
  const L = Math.max(0.3, Math.min(1, fore));
  // foreshortened forearm: shorter sleeve, darker cuff opening showing it points toward camera
  return (
    <g transform={`translate(${sx} ${sy}) rotate(${s * dir})`}>
      <rect x={-20} y={-6} width={40} height={100} rx={20} fill={`url(#suitArm${side})`} />
      <g transform={`translate(0 90) rotate(${-e * dir})`}>
        {/* when the forearm comes toward camera it crosses the jacket: a soft contact shadow and a
            thin edge keep the sleeve readable from elbow to hand */}
        {L < 0.98 && <rect x={-16} y={2} width={40} height={4 + 82 * L} rx={18} fill="rgba(6,30,28,0.28)" transform="translate(5 6)" />}
        <rect x={-18} y={-4} width={36} height={4 + 82 * L} rx={18} fill={`url(#suitArm${side})`} stroke={L < 0.98 ? 'rgba(6,30,28,0.55)' : undefined} strokeWidth={L < 0.98 ? 2.5 : undefined} />
        {L < 0.98 && <path d={`M-10,8 Q-13,${40 * L} -8,${76 * L}`} stroke="rgba(255,255,255,0.22)" strokeWidth={5} fill="none" strokeLinecap="round" />}
        {!(phone && phone.on > 0.5) && <rect x={-17} y={70 * L + 12 * (1 - L)} width={34} height={14} rx={6} fill={C.cream} />}
        <g transform={`translate(0 ${(L - 1) * 90}) rotate(${-w * k} 0 82)`}>
          {open > 0.001 && <OpenHand h={open} k={k} />}
          {/* bouquet: counter-rotated so it stays upright in world space; drawn before the fist so the
              fingers close over the stems */}
          {bouquet !== undefined && (
            <g transform={`translate(0 96) rotate(${bouquet})`}>
              <Bouquet />
            </g>
          )}
          {/* palm: the relaxed fist flattens into an open palm as the hand opens (the phone hand is drawn with the phone) */}
          {!(phone && phone.on > 0.5) && (
            <>
              <ellipse cx={0} cy={96 + 4 * open} rx={22 - 5 * open} ry={22 + 1 * open} fill="url(#skin)" />
              {open > 0.001 && <ellipse cx={6 * k} cy={100} rx={9 * open} ry={14 * open} fill="#F6CDA9" opacity={0.55 * open} />}
              <ellipse cx={-6 * dir} cy={90} rx={8} ry={5} fill="rgba(255,255,255,0.25)" />
            </>
          )}
          {/* pointing: the index finger extends from the fist along the forearm, thumb tucked */}
          {point > 0.01 && (
            <g>
              <rect x={-6.5} y={104} width={13} height={8 + 26 * point} rx={6.5} fill={SKIN_SH} />
              <rect x={-5} y={105} width={10} height={6.5 + 25 * point} rx={5} fill={SKIN} />
              <ellipse cx={0} cy={96} rx={21} ry={20} fill="url(#skin)" />
              <path d={`M${-12 * k},${88} Q${-4 * k},${84} ${4 * k},${90}`} stroke={SKIN_SH} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            </g>
          )}
          {phone && phone.on > 0.5 && (
            <g transform="translate(0 96)">
              <HeldPhone k={k} glow={phone.glow} turn={phone.turn} buzz={phone.buzz} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

export const Owner: React.FC<{pose: OwnerPose; width?: number; style?: React.CSSProperties}> = ({pose: p, width = 400, style}) => {
  const eyeRy = 22 * Math.max(0.06, p.eyes);
  const px = p.lookX * 7;
  const py = p.lookY * 6;
  const browY = 158 - p.brow * 12 - p.sad * 4;
  const mo = Math.max(0, Math.min(1, p.mouth));
  const topCtrl = 250 - p.smile * 7;
  const botCtrl = 252 + 8 + mo * 46 + p.smile * 6;
  return (
    <svg width={width} height={width * 1.8} viewBox="0 0 400 720" style={{overflow: 'visible', ...style}}>
      <defs>
        <radialGradient id="skin" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#F6CDA9" />
          <stop offset="70%" stopColor={SKIN} />
          <stop offset="100%" stopColor={SKIN_SH} />
        </radialGradient>
        <linearGradient id="suit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={SUIT[0]} />
          <stop offset="55%" stopColor={SUIT[1]} />
          <stop offset="100%" stopColor={SUIT[2]} />
        </linearGradient>
        <linearGradient id="suitArmL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SUIT[0]} />
          <stop offset="100%" stopColor={SUIT[1]} />
        </linearGradient>
        <linearGradient id="suitArmR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SUIT[1]} />
          <stop offset="100%" stopColor={SUIT[2]} />
        </linearGradient>
        <linearGradient id="pants" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2C3E3D" />
          <stop offset="100%" stopColor="#192B2A" />
        </linearGradient>
        <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4A372C" />
          <stop offset="100%" stopColor={HAIR} />
        </linearGradient>
        <linearGradient id="phoneBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A5F59" />
          <stop offset="100%" stopColor="#0F2E2B" />
        </linearGradient>
        <filter id="ownerShadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="10" dy="16" stdDeviation="12" floodColor="#192B2A" floodOpacity="0.22" />
        </filter>
        <clipPath id="eyeL">
          <ellipse cx={165} cy={200} rx={19} ry={eyeRy} />
        </clipPath>
        <clipPath id="eyeR">
          <ellipse cx={235} cy={200} rx={19} ry={eyeRy} />
        </clipPath>
      </defs>

      <g filter="url(#ownerShadow)" transform={`rotate(${p.lean} 200 700) translate(0 ${p.bob}) translate(200 700) scale(${1 / Math.sqrt(p.squash)} ${p.squash}) translate(-200 -700)`}>
        {/* legs */}
        {([['L', 172, p.legL], ['R', 228, p.legR]] as const).map(([k, x, a]) => (
          <g key={k} transform={`rotate(${a} ${x} 470)`}>
            <rect x={x - 24} y={462} width={48} height={200} rx={20} fill="url(#pants)" />
            <ellipse cx={x + (k === 'L' ? -6 : 6)} cy={674} rx={36} ry={17} fill="#1A1412" />
            <ellipse cx={x + (k === 'L' ? -14 : -2)} cy={668} rx={14} ry={5} fill="rgba(255,255,255,0.18)" />
          </g>
        ))}

        {/* torso */}
        <path d="M116,332 Q118,296 160,290 L240,290 Q282,296 284,332 L294,488 Q200,512 106,488 Z" fill="url(#suit)" />
        <path d="M172,290 L228,290 L200,378 Z" fill={C.cream} />
        <path d="M160,290 L186,290 L200,378 L176,346 L152,336 Z" fill={SUIT[2]} opacity={0.75} />
        <path d="M240,290 L214,290 L200,378 L224,346 L248,336 Z" fill={SUIT[2]} opacity={0.75} />
        <path d="M193,298 L207,298 L212,312 L205,380 L200,388 L195,380 L188,312 Z" fill={C.amber} />
        <rect x={191} y={292} width={18} height={14} rx={4} fill="#B98238" />
        <circle cx={200} cy={420} r={6} fill={SUIT[2]} />
        <circle cx={200} cy={452} r={6} fill={SUIT[2]} />
        <path d="M126,330 Q132,304 160,296" stroke="rgba(255,255,255,0.22)" strokeWidth={6} fill="none" strokeLinecap="round" />

        {/* neck */}
        <rect x={182} y={262} width={36} height={36} rx={12} fill={SKIN_SH} />

        {/* head */}
        <g transform={`translate(0 ${p.nod * 14 - p.shrug * 3}) rotate(${p.head} 200 285) translate(200 285) scale(1 ${1 - p.nod * 0.04}) translate(-200 -285)`}>
          <ellipse cx={108} cy={206} rx={16} ry={24} fill={SKIN_SH} />
          <ellipse cx={292} cy={206} rx={16} ry={24} fill={SKIN_SH} />
          <ellipse cx={200} cy={192} rx={92} ry={100} fill="url(#skin)" />
          {/* hair: confident pompadour */}
          <path d="M108,196 Q98,96 192,80 Q268,70 292,128 Q300,160 292,196 Q282,142 242,130 Q200,120 160,134 Q124,148 108,196 Z" fill="url(#hair)" />
          <path d="M140,108 Q196,26 286,86 Q246,74 214,96 Q180,82 140,108 Z" fill="url(#hair)" />
          <path d="M168,84 Q214,52 262,74" stroke="rgba(255,255,255,0.28)" strokeWidth={6} fill="none" strokeLinecap="round" />
          {/* cheeks */}
          <ellipse cx={142} cy={236} rx={20} ry={11} fill="#E8897A" opacity={0.18 + 0.5 * p.blush} />
          <ellipse cx={258} cy={236} rx={20} ry={11} fill="#E8897A" opacity={0.18 + 0.5 * p.blush} />
          {/* eyes */}
          {([['L', 165], ['R', 235]] as const).map(([k, x]) => (
            <g key={k}>
              <ellipse cx={x} cy={200} rx={19} ry={eyeRy} fill="#FFFFFF" />
              <g clipPath={`url(#eye${k})`}>
                <circle cx={x + px} cy={202 + py} r={10.5} fill="#2B1D16" />
                <circle cx={x + px - 3} cy={198 + py} r={3.5} fill="#FFFFFF" />
              </g>
              <path d={`M${x - 20},${200 - eyeRy + 1} Q${x},${200 - eyeRy - 6} ${x + 20},${200 - eyeRy + 1}`} stroke={SKIN_SH} strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          ))}
          {/* brows */}
          <rect x={143} y={browY} width={46} height={11} rx={5.5} fill={HAIR} transform={`rotate(${p.angry * 16 - p.brow * 4 - p.sad * 17} 166 ${browY + 5})`} />
          <rect x={211} y={browY} width={46} height={11} rx={5.5} fill={HAIR} transform={`rotate(${-p.angry * 16 + p.brow * 4 + p.sad * 17} 234 ${browY + 5})`} />
          <Tears cry={p.cry} t={p.tearT} eyeRy={eyeRy} />
          {/* nose */}
          <path d="M196,214 Q206,228 196,236" stroke={SKIN_SH} strokeWidth={5} fill="none" strokeLinecap="round" />
          {/* mouth */}
          {mo < 0.06 ? (
            <path d={`M170,252 Q200,${252 + p.smile * 20} 230,252`} stroke="#5A2A22" strokeWidth={6} fill="none" strokeLinecap="round" />
          ) : (
            <g>
              <path d={`M170,250 Q200,${topCtrl} 230,250 Q200,${botCtrl} 170,250 Z`} fill="#5A1E1A" />
              {mo > 0.22 && <path d={`M176,252 Q200,${topCtrl + 4} 224,252 L222,258 Q200,${topCtrl + 10} 178,258 Z`} fill="#FFFFFF" opacity={0.95} />}
              <ellipse cx={200} cy={250 + (botCtrl - 250) * 0.42} rx={14 + mo * 4} ry={4 + mo * 8} fill="#D9706A" />
            </g>
          )}
          {/* sunglasses */}
          {p.shades > 0.01 && (
            <g transform={`translate(0 ${(1 - p.shades) * -150})`} opacity={Math.min(1, p.shades * 3)}>
              <rect x={136} y={182} width={58} height={36} rx={14} fill="#10201F" />
              <rect x={206} y={182} width={58} height={36} rx={14} fill="#10201F" />
              <rect x={190} y={192} width={20} height={7} rx={3} fill="#10201F" />
              <path d="M146,190 L170,190" stroke={C.mint} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
              <path d="M216,190 L240,190" stroke={C.mint} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
            </g>
          )}
          {/* sweat */}
          {p.sweat > 0.01 && (
            <path d="M290,150 Q302,172 296,184 Q288,192 282,182 Q278,172 290,150 Z" fill="#9FD3E6" opacity={p.sweat} transform={`translate(0 ${p.sweat * 12})`} />
          )}
        </g>

        {/* arms in front */}
        <Arm side="L" s={p.aLs} e={p.aLe} h={p.hL} w={p.wL} sy={SHOULDER_Y - p.shrug * 12} fore={p.fL} />
        <Arm side="R" s={p.aRs} e={p.aRe} h={p.hR} w={p.wR} sy={SHOULDER_Y - p.shrug * 12} fore={p.fR} point={p.pR} phone={{on: p.phoneR, glow: p.phoneGlow, turn: p.phoneTurn, buzz: p.phoneBuzz}} bouquet={p.bq > 0.5 ? -(p.lean - p.aRs + p.aRe - p.wR) + p.bqTilt : undefined} />
      </g>
    </svg>
  );
};

/** Contact shadow under a character; shrinks and fades as he jumps. */
export const GroundShadow: React.FC<{x: number; y: number; w: number; lift?: number}> = ({x, y, w, lift = 0}) => {
  const k = Math.max(0.45, 1 - lift / 260);
  return <div style={{position: 'absolute', left: x - (w * k) / 2, top: y - 14 * k, width: w * k, height: 28 * k, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(25,43,42,0.32), rgba(25,43,42,0))', opacity: k}} />;
};
