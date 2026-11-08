import React from 'react';
import {C} from '../theme';

// THE MAPS ASSISTANT — an original fictional character: a calm, glossy map-pin with a
// screen face and flat, half-lidded eyes. Deliberately unbranded (not a Google mascot).
// viewBox 300 x 400; the pin's tip is at (150, 388).

export type PinPose = {
  eyes: number; // 0 closed … 1 open (its "open" is already half-lidded)
  lookX: number;
  lookY: number;
  talk: number; // 0 … 1 voice level, drives the mouth bars
  tilt: number; // deg
  glow: number; // 0 … 1 rim glow
  brow: number; // -1 … 1 (one unimpressed brow)
};

export const PIN_REST: PinPose = {eyes: 1, lookX: 0, lookY: 0, talk: 0, tilt: 0, glow: 0.6, brow: 0};

export const Pin: React.FC<{pose: PinPose; width?: number; t?: number}> = ({pose: p, width = 300, t = 0}) => {
  const eh = 12 * Math.max(0.08, p.eyes);
  const ex = p.lookX * 10;
  const ey = p.lookY * 8;
  const bars = [0.55, 0.85, 1, 0.8, 0.5];
  return (
    <svg width={width} height={(width * 400) / 300} viewBox="0 0 300 400" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="pinBody" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#2F9488" />
          <stop offset="50%" stopColor={C.teal} />
          <stop offset="100%" stopColor="#0B3A35" />
        </linearGradient>
        <radialGradient id="pinFace" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1E3B38" />
          <stop offset="100%" stopColor="#0C1E1C" />
        </radialGradient>
        <filter id="pinShadow" x="-40%" y="-30%" width="180%" height="170%">
          <feDropShadow dx="8" dy="18" stdDeviation="14" floodColor="#0B2B28" floodOpacity="0.35" />
        </filter>
      </defs>
      <g transform={`rotate(${p.tilt} 150 388)`} filter="url(#pinShadow)">
        {p.glow > 0 && <circle cx={150} cy={140} r={150} fill="none" stroke={C.mint} strokeWidth={10} opacity={0.18 * p.glow} />}
        <path d="M150,388 C112,306 36,244 36,142 A114,114 0 1 1 264,142 C264,244 188,306 150,388 Z" fill="url(#pinBody)" />
        <path d="M150,388 C112,306 36,244 36,142" stroke="rgba(255,255,255,0.18)" strokeWidth={6} fill="none" />
        <ellipse cx={96} cy={74} rx={42} ry={22} fill="rgba(255,255,255,0.28)" transform="rotate(-28 96 74)" />
        {/* screen face */}
        <circle cx={150} cy={142} r={84} fill="url(#pinFace)" stroke="rgba(183,216,197,0.35)" strokeWidth={3} />
        {/* eyes: flat, unbothered */}
        {[112, 188].map((x) => (
          <g key={x}>
            <rect x={x - 19 + ex} y={130 - eh / 2 + ey} width={38} height={eh} rx={eh / 2} fill={C.mint} />
            <rect x={x - 22 + ex} y={122 - 2 + ey - (x > 150 ? p.brow * 6 : 0)} width={44} height={6} rx={3} fill="#0C1E1C" />
          </g>
        ))}
        <rect x={168 + ex} y={104 - p.brow * 8} width={34} height={5} rx={2.5} fill={C.mint} opacity={0.75} transform={`rotate(${-p.brow * 8} 185 106)`} />
        {/* mouth: a flat line that becomes a small voice meter while it speaks */}
        {p.talk > 0.04 ? (
          bars.map((b, i) => {
            const h = 4 + b * p.talk * 26 * (0.7 + 0.3 * Math.sin(t * 40 + i * 1.7));
            return <rect key={i} x={126 + i * 10} y={182 - h / 2} width={6} height={h} rx={3} fill={C.mint} />;
          })
        ) : (
          <rect x={130} y={180} width={40} height={5} rx={2.5} fill={C.mint} opacity={0.85} />
        )}
      </g>
    </svg>
  );
};
