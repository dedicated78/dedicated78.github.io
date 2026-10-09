import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT_DISPLAY, FONT_TEXT} from '../theme';
import {E, prog, tw} from '../lib/anim';

/** Typographic GrowwithMH wordmark, matching the company profile: "Growwith" + teal "MH" + warm dot. */
export const Wordmark: React.FC<{
  size: number;
  dark?: boolean;
  dotScale?: number;
  dotOpacity?: number;
  style?: React.CSSProperties;
}> = ({size, dark = false, dotScale = 1, dotOpacity = 1, style}) => (
  <div
    style={{
      fontFamily: FONT_DISPLAY,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '-0.035em',
      lineHeight: 1,
      color: dark ? C.cream : C.charcoal,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'baseline',
      ...style,
    }}
  >
    <span>Growwith</span>
    <span style={{color: dark ? C.mint : C.teal}}>MH</span>
    <span
      style={{
        display: 'inline-block',
        width: size * 0.2,
        height: size * 0.2,
        marginLeft: size * 0.05,
        borderRadius: '50%',
        background: C.accent,
        transform: `scale(${dotScale})`,
        opacity: dotOpacity,
      }}
    />
  </div>
);

/**
 * A line of text that rises out of a mask. `at` is the frame the line starts entering;
 * optional `outAt` lifts it away again.
 */
export const RevealLine: React.FC<{
  frame: number;
  at: number;
  outAt?: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  pad?: number;
}> = ({frame, at, outAt, dur = 16, children, style, pad = 0.18}) => {
  const pIn = prog(frame, at, dur, E.out);
  const pOut = outAt === undefined ? 0 : prog(frame, outAt, 10, E.in);
  const y = (1 - pIn) * 105 - pOut * 14;
  return (
    <div style={{overflow: 'hidden', paddingBottom: `${pad}em`, marginBottom: `-${pad}em`, ...style}}>
      <div
        style={{
          transform: `translateY(${y}%)`,
          opacity: Math.min(pIn * 1.6, 1) * (1 - pOut),
          filter: pOut > 0.01 ? `blur(${pOut * 6}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const headline = (size: number, color: string): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 1.04,
  letterSpacing: '-0.035em',
  color,
});

export const body = (size: number, color: string, weight = 500): React.CSSProperties => ({
  fontFamily: FONT_TEXT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.25,
  letterSpacing: '-0.01em',
  color,
});

/** Charcoal environment: base tone, vignette, teal glow and a faint dot grid. */
export const DarkEnv: React.FC<{
  glowX?: number;
  glowY?: number;
  glow?: number;
  gridShiftY?: number;
  gridOpacity?: number;
}> = ({glowX = 540, glowY = 700, glow = 1, gridShiftY = 0, gridOpacity = 1}) => (
  <AbsoluteFill style={{background: C.charcoal}}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(900px 760px at ${glowX}px ${glowY}px, rgba(23,97,90,${0.55 * glow}) 0%, rgba(23,97,90,${0.18 * glow}) 45%, rgba(23,97,90,0) 75%)`,
      }}
    />
    <AbsoluteFill
      style={{
        opacity: 0.9 * gridOpacity,
        backgroundImage: `radial-gradient(rgba(183,216,197,0.10) 1.6px, transparent 1.8px)`,
        backgroundSize: '48px 48px',
        backgroundPosition: `0px ${gridShiftY}px`,
        maskImage: 'radial-gradient(800px 1100px at 50% 45%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(800px 1100px at 50% 45%, black 20%, transparent 80%)',
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(1300px 1500px at 50% 45%, rgba(15,29,28,0) 55%, rgba(15,29,28,0.85) 100%)',
      }}
    />
  </AbsoluteFill>
);

/** Cream environment: warm base, mint halo, fine guide lines. */
export const CreamEnv: React.FC<{haloX?: number; haloY?: number; halo?: number; lines?: number}> = ({
  haloX = 540,
  haloY = 760,
  halo = 1,
  lines = 1,
}) => (
  <AbsoluteFill style={{background: C.cream}}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(820px 700px at ${haloX}px ${haloY}px, rgba(183,216,197,${0.55 * halo}) 0%, rgba(183,216,197,${0.18 * halo}) 45%, rgba(183,216,197,0) 75%)`,
      }}
    />
    <AbsoluteFill
      style={{
        opacity: lines,
        backgroundImage:
          'linear-gradient(rgba(25,43,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(25,43,42,0.045) 1px, transparent 1px)',
        backgroundSize: '120px 120px',
        backgroundPosition: '0 0',
        maskImage: 'radial-gradient(760px 1000px at 50% 50%, black 10%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(760px 1000px at 50% 50%, black 10%, transparent 75%)',
      }}
    />
  </AbsoluteFill>
);

/** Soft diagonal light band crossing the frame; t in [0,1]. */
export const LightSweep: React.FC<{t: number; color?: string; opacity?: number; angle?: number; width?: number}> = ({
  t,
  color = 'rgba(183,216,197,0.35)',
  opacity = 1,
  angle = 20,
  width = 520,
}) => {
  if (t <= 0 || t >= 1) return null;
  const x = -900 + t * 2880;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden', opacity}}>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: -600,
          width,
          height: 3200,
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${color} 50%, rgba(0,0,0,0) 100%)`,
          filter: 'blur(40px)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Mouse pointer drawn in brand colours. `press` 0..1 scales it down for a click. */
export const Cursor: React.FC<{x: number; y: number; opacity: number; press?: number; dark?: boolean}> = ({
  x,
  y,
  opacity,
  press = 0,
  dark = false,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - press * 0.14})`,
      transformOrigin: '6px 4px',
      filter: 'drop-shadow(4px 8px 10px rgba(0,0,0,0.35))',
    }}
  >
    <svg width="54" height="62" viewBox="0 0 27 31">
      <path
        d="M2 2 L2 24 L8 18.5 L12.2 28 L16 26.3 L11.8 17 L20 17 Z"
        fill={dark ? C.charcoal : C.cream}
        stroke={dark ? C.cream : C.charcoal}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
    {press > 0 && (
      <div
        style={{
          position: 'absolute',
          left: 4 - 30 * press,
          top: 4 - 30 * press,
          width: 60 * press,
          height: 60 * press,
          borderRadius: '50%',
          border: `2px solid ${C.mint}`,
          opacity: 1 - press,
        }}
      />
    )}
  </div>
);

/** Corner brackets used by the inspection effect. */
export const Brackets: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  color?: string;
  len?: number;
}> = ({x, y, w, h, opacity, color = C.teal, len = 26}) => {
  const s: React.CSSProperties = {position: 'absolute', width: len, height: len, borderColor: color, borderStyle: 'solid'};
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity, pointerEvents: 'none'}}>
      <div style={{...s, left: -8, top: -8, borderWidth: '3px 0 0 3px', borderTopLeftRadius: 8}} />
      <div style={{...s, right: -8, top: -8, borderWidth: '3px 3px 0 0', borderTopRightRadius: 8}} />
      <div style={{...s, left: -8, bottom: -8, borderWidth: '0 0 3px 3px', borderBottomLeftRadius: 8}} />
      <div style={{...s, right: -8, bottom: -8, borderWidth: '0 3px 3px 0', borderBottomRightRadius: 8}} />
    </div>
  );
};

/** Skeleton text bar. */
export const Bar: React.FC<{w: number | string; h?: number; color?: string; style?: React.CSSProperties}> = ({
  w,
  h = 12,
  color = 'rgba(25,43,42,0.12)',
  style,
}) => <div style={{width: w, height: h, borderRadius: h / 2, background: color, ...style}} />;

/** Pill label. */
export const Pill: React.FC<{
  children: React.ReactNode;
  dark?: boolean;
  size?: number;
  style?: React.CSSProperties;
}> = ({children, dark = false, size = 44, style}) => (
  <div
    style={{
      ...body(size, dark ? C.mintText : C.teal, 600),
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.35,
      padding: `${size * 0.36}px ${size * 0.62}px`,
      borderRadius: 999,
      border: `2px solid ${dark ? 'rgba(183,216,197,0.45)' : 'rgba(23,97,90,0.35)'}`,
      background: dark ? 'rgba(183,216,197,0.08)' : 'rgba(183,216,197,0.25)',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

export const fadeIn = (frame: number, at: number, dur = 12) => tw(frame, at, dur, 0, 1, E.soft);
