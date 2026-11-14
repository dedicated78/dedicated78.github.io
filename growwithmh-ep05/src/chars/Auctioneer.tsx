import React from 'react';
import {C} from '../theme';

// THE AUCTIONEER — an original one-off character for Episode 05's fictional "rankings auction".
// Navy suit, teal bow tie and pocket square, silver hair, big theatrical eyebrows. He stands behind
// his podium (legs never shown). The gavel is an AUTOMATED arm mounted on the podium — no hand grip.
// viewBox 400 x 560; the podium base sits on the floor at y 556.

export type AuctioneerPose = {
  mouth: number; // 0 … 1
  smile: number; // -1 … 1
  brow: number; // 0 … 1 raised (theatrical)
  eyes: number; // 0 … 1.3
  lookX: number;
  lookY: number;
  head: number; // deg tilt
  lean: number; // deg, about the podium top
  present: number; // 0 rest … 1 screen-right arm opens up, palm up ("presenting")
  point: number; // 0 rest … 1 screen-left arm extends out toward the bidder
  gavel: number; // 0 raised … 1 struck
};
export const AUCTIONEER_REST: AuctioneerPose = {mouth: 0, smile: 0.6, brow: 0.3, eyes: 1, lookX: 0, lookY: 0, head: 0, lean: 0, present: 0, point: 0, gavel: 0};

const SKIN = '#D9A07A';
const SKIN_SH = '#B98060';
const SUIT = ['#2A3B63', '#1F2D4D', '#141E36'];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Two-segment arm from a shoulder; angles in SVG degrees (0 = straight down). */
const Arm: React.FC<{sx: number; sy: number; a1: number; a2: number; open: number; flip: number}> = ({sx, sy, a1, a2, open, flip}) => (
  <g transform={`translate(${sx} ${sy}) rotate(${a1})`}>
    <rect x={-17} y={-6} width={34} height={86} rx={17} fill={`url(#aSuit)`} />
    <g transform={`translate(0 78) rotate(${a2 - a1})`}>
      <rect x={-15} y={-4} width={30} height={74} rx={15} fill={`url(#aSuit)`} />
      <rect x={-14} y={60} width={28} height={12} rx={5} fill={C.cream} />
      {/* hand: rounded mitten; when open, a thumb and a flat palm read as an open hand */}
      <ellipse cx={0} cy={84} rx={17 - 2 * open} ry={18 + 3 * open} fill={SKIN} />
      {open > 0.05 && <path d={`M${14 * flip},${76} Q${24 * flip},${80} ${22 * flip},${92}`} stroke={SKIN_SH} strokeWidth={9} strokeLinecap="round" fill="none" opacity={open} />}
      {open > 0.05 && <path d={`M${14 * flip},${76} Q${24 * flip},${80} ${22 * flip},${92}`} stroke={SKIN} strokeWidth={6} strokeLinecap="round" fill="none" opacity={open} />}
    </g>
  </g>
);

export const Auctioneer: React.FC<{pose: AuctioneerPose; width?: number; t?: number}> = ({pose: p, width = 360}) => {
  const mo = Math.max(0, Math.min(1, p.mouth));
  const px = p.lookX * 6;
  const py = p.lookY * 5;
  const browY = 112 - p.brow * 16;
  // arm presets (rest → gesture). Rest: both hands on the podium top, elbows out (a lectern lean).
  // The screen-left arm points out toward the bidder (who stands on that side); the screen-right arm
  // opens up in a theatrical "presenting" gesture. Forearms swing through the natural hanging path.
  const lA1 = lerp(40, 72, p.point);
  const lA2 = lerp(-80, 96, p.point);
  const rA1 = lerp(-40, -62, p.present);
  const rA2 = lerp(80, -148, p.present);
  const gav = p.gavel; // 0 up, 1 down
  return (
    <svg width={width} height={(width * 560) / 400} viewBox="0 0 400 560" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="aSuit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={SUIT[0]} />
          <stop offset="60%" stopColor={SUIT[1]} />
          <stop offset="100%" stopColor={SUIT[2]} />
        </linearGradient>
        <linearGradient id="aPodium" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24534E" />
          <stop offset="100%" stopColor="#0F2E2B" />
        </linearGradient>
        <radialGradient id="aSkin" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#E9B795" />
          <stop offset="75%" stopColor={SKIN} />
          <stop offset="100%" stopColor={SKIN_SH} />
        </radialGradient>
        <filter id="aShadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="10" dy="16" stdDeviation="12" floodColor="#192B2A" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#aShadow)">
        <g transform={`rotate(${p.lean} 200 360)`}>
          {/* torso */}
          <path d="M96,300 Q100,256 150,248 L250,248 Q300,256 304,300 L314,420 L86,420 Z" fill="url(#aSuit)" />
          <path d="M168,248 L232,248 L200,330 Z" fill="#FFFFFF" />
          <path d="M150,248 L178,248 L200,330 L170,300 L140,290 Z" fill={SUIT[2]} opacity={0.8} />
          <path d="M250,248 L222,248 L200,330 L230,300 L260,290 Z" fill={SUIT[2]} opacity={0.8} />
          {/* teal bow tie + pocket square */}
          <path d="M200,262 L176,250 L176,276 Z M200,262 L224,250 L224,276 Z" fill={C.teal} />
          <rect x={192} y={254} width={16} height={16} rx={5} fill={C.tealDeep} />
          <path d="M248,300 L270,296 L266,312 L250,314 Z" fill={C.tealBright} />
          {/* neck + head */}
          <rect x={184} y={222} width={32} height={34} rx={10} fill={SKIN_SH} />
          <g transform={`rotate(${p.head} 200 236)`}>
            <ellipse cx={122} cy={160} rx={13} ry={20} fill={SKIN_SH} />
            <ellipse cx={278} cy={160} rx={13} ry={20} fill={SKIN_SH} />
            <ellipse cx={200} cy={150} rx={80} ry={88} fill="url(#aSkin)" />
            {/* silver slicked hair with a side part */}
            <path d="M120,150 Q112,72 196,62 Q272,58 284,124 Q286,140 280,150 Q270,104 220,96 L196,80 Q170,98 140,104 Q124,120 120,150 Z" fill="#C9CED0" />
            <path d="M150,82 Q196,58 262,86" stroke="rgba(255,255,255,0.55)" strokeWidth={5} fill="none" strokeLinecap="round" />
            {/* eyes */}
            {[166, 234].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={150} rx={15} ry={17 * Math.max(0.08, p.eyes)} fill="#FFFFFF" />
                <circle cx={x + px} cy={152 + py} r={8} fill="#2B1D16" />
                <circle cx={x + px - 2.5} cy={149 + py} r={2.6} fill="#FFFFFF" />
              </g>
            ))}
            {/* big theatrical eyebrows */}
            <path d={`M140,${browY + 8} Q166,${browY - 8 - p.brow * 6} 190,${browY + 4}`} stroke="#4A4F55" strokeWidth={12} strokeLinecap="round" fill="none" />
            <path d={`M210,${browY + 4} Q234,${browY - 8 - p.brow * 6} 260,${browY + 8}`} stroke="#4A4F55" strokeWidth={12} strokeLinecap="round" fill="none" />
            {/* nose + mustache */}
            <path d="M196,160 Q210,176 196,184" stroke={SKIN_SH} strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M170,196 Q186,186 200,194 Q214,186 230,196 Q216,202 200,198 Q184,202 170,196 Z" fill="#9EA4A8" />
            {/* mouth */}
            {mo < 0.06 ? (
              <path d={`M178,210 Q200,${210 + p.smile * 14} 222,210`} stroke="#5A2A22" strokeWidth={5} fill="none" strokeLinecap="round" />
            ) : (
              <path d={`M176,206 Q200,${212 + mo * 34} 224,206 Q200,${208 - p.smile * 4} 176,206 Z`} fill="#5A1E1A" />
            )}
          </g>
        </g>
        {/* podium (front of the body) */}
        <rect x={52} y={346} width={296} height={30} rx={10} fill={C.cream} />
        <rect x={52} y={346} width={296} height={8} rx={4} fill="#FFFFFF" opacity={0.7} />
        <path d="M70,376 L330,376 L314,556 L86,556 Z" fill="url(#aPodium)" />
        <path d="M70,376 L330,376 L328,392 L72,392 Z" fill="rgba(0,0,0,0.18)" />
        <rect x={110} y={420} width={180} height={64} rx={14} fill="rgba(251,250,246,0.12)" stroke="rgba(183,216,197,0.5)" strokeWidth={2} />
        <text x={200} y={448} textAnchor="middle" fontFamily="GW Text, Inter, sans-serif" fontWeight={700} fontSize={17} fill={C.mint} letterSpacing="2">FICTIONAL</text>
        <text x={200} y={470} textAnchor="middle" fontFamily="GW Text, Inter, sans-serif" fontWeight={700} fontSize={17} fill={C.mint} letterSpacing="2">AUCTION</text>
        {/* automated gavel: a mounted arm that swings down onto the sound block */}
        <rect x={300} y={336} width={44} height={12} rx={4} fill="#7A4E2A" />
        <g transform={`rotate(${lerp(-62, 0, gav)} 252 334)`}>
          <rect x={250} y={330} width={64} height={7} rx={3.5} fill="#5B3A1F" />
          <rect x={304} y={316} width={24} height={34} rx={6} fill="#8A5A30" />
          <rect x={304} y={316} width={24} height={8} rx={4} fill="#A87444" />
        </g>
        <circle cx={252} cy={334} r={7} fill="#3A3027" />
        {/* arms rest on the podium top, in front of it */}
        <Arm sx={112} sy={276} a1={lA1} a2={lA2} open={p.point * 0.5} flip={-1} />
        <Arm sx={288} sy={276} a1={rA1} a2={rA2} open={p.present} flip={1} />
      </g>
    </svg>
  );
};
