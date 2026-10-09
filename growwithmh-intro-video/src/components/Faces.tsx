import React from 'react';
import {C, FONT_DISPLAY, FONT_TEXT} from '../theme';
import {E, mix, prog} from '../lib/anim';
import {Icon, IconName} from './Icons';

// Face artwork for the three recurring objects (map, website, answer) and the fast
// kinetic text line used for headlines.

/** Schematic neighbourhood map, drawn in a 1500x1500 space and scaled to fit. */
export const MapFace: React.FC<{w: number; h: number; draw?: number; pin?: number; radius?: number}> = ({w, h, draw = 1, pin = 1, radius = 0}) => {
  const roads = ['M0 360 H1500', 'M0 750 H1500', 'M0 1140 H1500', 'M360 0 V1500', 'M750 0 V1500', 'M1140 0 V1500'];
  const streets = ['M0 555 H1500', 'M0 945 H1500', 'M555 0 V1500', 'M945 0 V1500', 'M0 1350 L1500 160'];
  const blocks: Array<[number, number]> = [];
  for (const bx of [380, 575, 765, 960]) for (const by of [380, 575, 765, 960]) blocks.push([bx, by]);
  return (
    <svg width={w} height={h} viewBox="0 0 1500 1500" preserveAspectRatio="xMidYMid slice" style={{display: 'block'}}>
      <rect width={1500} height={1500} fill="#1E3533" />
      {blocks.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={160} height={160} rx={18} fill={i === 5 || i === 6 ? 'rgba(183,216,197,0.18)' : 'rgba(183,216,197,0.07)'} opacity={draw} />
      ))}
      <path d="M0 1260 C 320 1190, 560 1330, 860 1270 S 1320 1180, 1500 1240" stroke="rgba(23,97,90,0.95)" strokeWidth={60} fill="none" opacity={draw} />
      <g fill="none" stroke="rgba(183,216,197,0.32)" strokeLinecap="round">
        {roads.map((d) => (
          <path key={d} d={d} strokeWidth={20} pathLength={1} strokeDasharray={`${draw} 1`} />
        ))}
      </g>
      <g fill="none" stroke="rgba(183,216,197,0.16)" strokeLinecap="round">
        {streets.map((d) => (
          <path key={d} d={d} strokeWidth={9} pathLength={1} strokeDasharray={`${draw} 1`} />
        ))}
      </g>
      {radius > 0 && (
        <circle cx={750} cy={750} r={80 + radius * 360} fill="rgba(23,97,90,0.3)" stroke={C.mint} strokeWidth={6} strokeDasharray="18 18" />
      )}
      {pin > 0 && (
        <g transform={`translate(750 750) scale(${pin}) translate(-60 -150)`}>
          <ellipse cx={60} cy={150} rx={34} ry={12} fill="rgba(0,0,0,0.35)" />
          <path d="M60 148S12 103 12 66a48 48 0 0 1 96 0c0 37-48 82-48 82Z" fill={C.teal} stroke={C.mint} strokeWidth={6} />
          <circle cx={60} cy={66} r={18} fill={C.cream} />
        </g>
      )}
    </svg>
  );
};

/** Compact website face for the small object versions (S2, S5 source page, S6). */
export const SiteMiniFace: React.FC<{improved?: number; label?: string}> = ({improved = 1, label}) => (
  <div style={{position: 'absolute', inset: 0, background: C.paper, display: 'flex', flexDirection: 'column'}}>
    <div style={{height: '13%', background: C.creamDeep, display: 'flex', alignItems: 'center', gap: '3%', padding: '0 6%'}}>
      {[C.accent, C.mint, 'rgba(97,113,106,0.4)'].map((c) => (
        <div key={c} style={{width: '4%', aspectRatio: '1', borderRadius: '50%', background: c}} />
      ))}
      {label && <div style={{marginLeft: '4%', fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 20, color: C.muted, whiteSpace: 'nowrap'}}>{label}</div>}
    </div>
    <div style={{padding: '8% 8% 0', display: 'flex', flexDirection: 'column', gap: '6%', flex: 1}}>
      <div style={{width: '72%', height: '9%', borderRadius: 8, background: mix(improved, 'rgba(25,43,42,0.25)', C.charcoal)}} />
      <div style={{width: '52%', height: '5%', borderRadius: 6, background: 'rgba(25,43,42,0.12)'}} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{height: '13%', borderRadius: 10, background: i === 0 ? mix(improved, C.creamDeep, 'rgba(183,216,197,0.55)') : C.creamDeep, display: 'flex', alignItems: 'center', padding: '0 5%', gap: '5%'}}>
          <div style={{width: '9%', aspectRatio: '1', borderRadius: 6, background: i === 0 ? mix(improved, 'rgba(25,43,42,0.15)', C.teal) : 'rgba(25,43,42,0.15)'}} />
          <div style={{flex: 1, height: '28%', borderRadius: 4, background: 'rgba(25,43,42,0.14)'}} />
        </div>
      ))}
    </div>
  </div>
);

/** Compact answer face. */
export const AnswerMiniFace: React.FC<{filled?: number}> = ({filled = 1}) => (
  <div style={{position: 'absolute', inset: 0, background: C.cream, padding: '9% 8%', display: 'flex', flexDirection: 'column', gap: '10%'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: '5%'}}>
      <div style={{width: '15%', aspectRatio: '1', borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
        <Icon name="chat" size={26} color={C.cream} />
      </div>
      <div style={{width: '45%', height: 16, borderRadius: 8, background: C.charcoal}} />
    </div>
    {[0.9, 0.7, 0.8].map((wd, i) => (
      <div key={i} style={{width: `${wd * 100 * Math.min(1, filled * 1.4 - i * 0.2)}%`, height: 14, borderRadius: 7, background: i === 0 ? C.teal : C.mint}} />
    ))}
  </div>
);

/**
 * One headline line that cuts in from a mask (fast, on the beat) and cuts out upward.
 * `at` = first frame of the entrance; `out` = first frame of the exit.
 */
export const KLine: React.FC<{f: number; at: number; out?: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  f,
  at,
  out,
  dur = 7,
  children,
  style,
}) => {
  const i = prog(f, at, dur, E.out);
  const o = out === undefined ? 0 : prog(f, out, 6, E.in);
  if (i <= 0 || o >= 1) return null;
  return (
    <div style={{overflow: 'hidden', padding: '0.06em 0 0.16em', margin: '-0.06em 0 -0.16em', ...style}}>
      <div style={{transform: `translateY(${(1 - i) * 110 - o * 115}%) skewY(${(1 - i) * 4}deg)`}}>{children}</div>
    </div>
  );
};

export const H: React.FC<{size: number; color: string; children: React.ReactNode; style?: React.CSSProperties}> = ({size, color, children, style}) => (
  <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: '-0.04em', color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);

/** Small icon + label used on scattered info fragments and chips. */
export const IconLabel: React.FC<{icon: IconName; label: string; color?: string; size?: number; iconBg?: string}> = ({icon, label, color = C.cream, size = 30, iconBg = 'rgba(183,216,197,0.16)'}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.5, height: '100%', padding: `0 ${size * 0.8}px`}}>
    <div style={{width: size * 1.8, height: size * 1.8, borderRadius: size * 0.5, background: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0}}>
      <Icon name={icon} size={size * 1.1} color={C.mint} stroke={2} />
    </div>
    <span style={{fontFamily: FONT_TEXT, fontWeight: 600, fontSize: size, color, whiteSpace: 'nowrap'}}>{label}</span>
  </div>
);
