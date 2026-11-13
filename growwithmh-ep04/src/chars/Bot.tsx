import React from 'react';
import {C} from '../theme';

// THE REVIEW BOT — an original fictional "review-integrity inspector" for this series. Deliberately
// unbranded (no Google marks); it is a comedy character, not a depiction of how Google moderates
// reviews. Built in the Maps Assistant's visual language: glossy deep-teal body, cream face plate,
// dark screen with flat mint eyes, small amber indicator lights. viewBox 300 x 400, base at (150, 392).

export type BotPose = {
  eyes: number; // 0 closed … 1 open
  lookX: number; // -1 … 1
  lookY: number;
  scan: number; // 0 … 1 eyes become a scanning bar
  talk: number; // voice level 0 … 1 (a thin readout line, minimal)
  tilt: number; // deg, whole body
  nod: number; // 0 … 1 head dips (approving nod)
  armL: number; // deg, + = forward/up
  armR: number;
  light: number; // 0 … 1 amber indicator brightness
  hover: number; // px, thruster bob
};

export const BOT_REST: BotPose = {eyes: 1, lookX: 0, lookY: 0, scan: 0, talk: 0, tilt: 0, nod: 0, armL: 0, armR: 0, light: 0.6, hover: 0};

export const Bot: React.FC<{pose: BotPose; width?: number; t?: number}> = ({pose: p, width = 240, t = 0}) => {
  const eh = 20 * Math.max(0.1, p.eyes) * (1 - 0.7 * p.scan);
  const ex = p.lookX * 12;
  const ey = p.lookY * 8;
  const blinkLight = 0.55 + 0.45 * p.light * (0.6 + 0.4 * Math.sin(t * 5));
  return (
    <svg width={width} height={(width * 400) / 300} viewBox="0 0 300 400" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="botBody" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#2F9488" />
          <stop offset="55%" stopColor={C.teal} />
          <stop offset="100%" stopColor="#0B3A35" />
        </linearGradient>
        <radialGradient id="botScreen" cx="45%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#1E3B38" />
          <stop offset="100%" stopColor="#0C1E1C" />
        </radialGradient>
        <radialGradient id="botThruster" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(183,216,197,0.9)" />
          <stop offset="100%" stopColor="rgba(183,216,197,0)" />
        </radialGradient>
        <filter id="botShadow" x="-40%" y="-30%" width="180%" height="170%">
          <feDropShadow dx="8" dy="16" stdDeviation="12" floodColor="#0B2B28" floodOpacity="0.32" />
        </filter>
      </defs>
      {/* hover glow under the base */}
      <ellipse cx={150} cy={386} rx={58} ry={12} fill="url(#botThruster)" opacity={0.75} />
      <g transform={`translate(0 ${-p.hover}) rotate(${p.tilt} 150 370)`} filter="url(#botShadow)">
        {/* arms (behind the body) */}
        {([['L', 58, -1], ['R', 242, 1]] as const).map(([k, x, d]) => (
          <g key={k} transform={`rotate(${(k === 'L' ? p.armL : -p.armR) * 1} ${x} 238)`}>
            <rect x={x - 13} y={232} width={26} height={74} rx={13} fill="#0E4842" />
            <circle cx={x} cy={312} r={15} fill={C.cream} stroke="#0E4842" strokeWidth={5} />
            <rect x={x - 5 + d * 0} y={304} width={10} height={6} rx={3} fill="#0E4842" opacity={0.6} />
          </g>
        ))}
        {/* body */}
        <rect x={70} y={200} width={160} height={170} rx={64} fill="url(#botBody)" />
        <path d="M84 250 Q 86 214 120 206" stroke="rgba(255,255,255,0.22)" strokeWidth={7} fill="none" strokeLinecap="round" />
        {/* chest: three small amber indicator lights */}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={128 + i * 22} cy={300} r={6} fill={C.amber} opacity={i === 1 ? blinkLight : 0.55 + 0.3 * p.light} />
        ))}
        <rect x={112} y={322} width={76} height={8} rx={4} fill="rgba(183,216,197,0.45)" />
        {/* neck */}
        <rect x={130} y={186} width={40} height={24} rx={8} fill="#0E4842" />
        {/* head */}
        <g transform={`translate(0 ${p.nod * 12}) rotate(${p.nod * 6} 150 190)`}>
          <rect x={52} y={40} width={196} height={152} rx={58} fill="url(#botBody)" />
          <ellipse cx={100} cy={64} rx={34} ry={14} fill="rgba(255,255,255,0.26)" transform="rotate(-18 100 64)" />
          {/* antenna + amber light */}
          <rect x={146} y={14} width={8} height={30} rx={4} fill="#0E4842" />
          <circle cx={150} cy={12} r={10} fill={C.amber} opacity={blinkLight} />
          {/* cream face plate + screen */}
          <rect x={70} y={62} width={160} height={112} rx={44} fill={C.cream} />
          <rect x={80} y={70} width={140} height={96} rx={38} fill="url(#botScreen)" stroke="rgba(183,216,197,0.35)" strokeWidth={2} />
          {/* eyes: flat mint, pixel-rounded; a scan turns them into one bar */}
          {p.scan > 0.5 ? (
            <rect x={104 + ex} y={110 - 4 + ey} width={92} height={8} rx={4} fill={C.mint} opacity={0.9} />
          ) : (
            [124, 176].map((x) => <rect key={x} x={x - 13 + ex} y={110 - eh / 2 + ey} width={26} height={eh} rx={Math.min(8, eh / 2)} fill={C.mint} />)
          )}
          {/* readout line (minimal "mouth") */}
          <rect x={136} y={146 - p.talk * 2} width={28} height={3 + p.talk * 4} rx={2} fill={C.mint} opacity={0.75} />
        </g>
      </g>
    </svg>
  );
};
